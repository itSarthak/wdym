import { Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

// ── Shared prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a survey flow builder. Convert natural language survey descriptions into structured JSON flows.

BLOCK TYPES AND THEIR CONFIG SCHEMAS:
- "question": { label, field (unique snake_case), questionType ("text" | "multiple_choice"), required, options (string[], only for multiple_choice) }
- "rating": { label, field, style ("nps" for 0–10 scale | "stars" for 1–5 stars), required }
- "statement": { text, buttonLabel (default "Continue") }
- "matrix": { label, field, rows (string[]), columns (string[]), required }
- "hidden_field": { field, paramName (URL query param name), defaultValue }
- "recall": { label (use {{fieldName}} to interpolate a prior answer), field, recallField, questionType ("text" | "multiple_choice"), options, required }
- "if_else": { field (which answer field to evaluate), operator ("equals" | "not_equals" | "contains" | "greater_than" | "less_than"), value (string to compare against) }
- "switch": { field, cases ([{ value, label }]) }
- "end": { message }

EDGE SOURCE HANDLES:
- All regular blocks (question, rating, statement, matrix, hidden_field, recall): sourceHandle = "out"
- if_else: sourceHandle = "true" (condition met) or "false" (not met) — both must be connected
- switch: sourceHandle = the exact case value string — every case must be connected

HARD REQUIREMENTS:
- Every "field" value must be unique snake_case across the entire survey
- Every path through the survey MUST reach an "end" block — no dangling branches
- if_else MUST have exactly one "true" edge and one "false" edge going out
- switch MUST have one edge per case value
- Nodes must not form cycles
- Use descriptive, realistic labels appropriate for the survey topic
- Do not invent block types outside the list above

Return ONLY this JSON — no markdown fences, no commentary:
{
  "title": "<survey title>",
  "nodes": [
    { "id": "<short id like n1>", "blockType": "<type>", "config": { <fields> } }
  ],
  "edges": [
    { "source": "<node id>", "target": "<node id>", "sourceHandle": "<handle>" }
  ]
}`

// ── Shared response schema ────────────────────────────────────────────────────

const SurveyFlowSchema = z.object({
  title: z.string(),
  nodes: z.array(z.object({
    id: z.string(),
    blockType: z.string(),
    config: z.record(z.unknown()),
  })),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().default('out'),
  })),
})

type SurveyFlow = z.infer<typeof SurveyFlowSchema>

// ── Layout ────────────────────────────────────────────────────────────────────

function computeLayout(
  nodes: { id: string }[],
  edges: { source: string; target: string }[],
): Record<string, { x: number; y: number }> {
  const outgoing: Record<string, string[]> = {}
  const inDegree: Record<string, number> = {}
  nodes.forEach((n) => { outgoing[n.id] = []; inDegree[n.id] = 0 })
  edges.forEach((e) => {
    outgoing[e.source] = [...(outgoing[e.source] || []), e.target]
    inDegree[e.target] = (inDegree[e.target] || 0) + 1
  })

  const level: Record<string, number> = {}
  const queue: string[] = []
  nodes.forEach((n) => {
    if (inDegree[n.id] === 0) { level[n.id] = 0; queue.push(n.id) }
  })
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const target of (outgoing[id] || [])) {
      const next = (level[id] || 0) + 1
      if (level[target] === undefined || next > level[target]) {
        level[target] = next
        queue.push(target)
      }
    }
  }

  const byLevel: string[][] = []
  for (const [id, lvl] of Object.entries(level)) {
    if (!byLevel[lvl]) byLevel[lvl] = []
    byLevel[lvl].push(id)
  }

  const positions: Record<string, { x: number; y: number }> = {}
  byLevel.forEach((ids, lvl) => {
    ids.forEach((id, i) => {
      positions[id] = {
        x: (i - (ids.length - 1) / 2) * 380,
        y: lvl * 220,
      }
    })
  })
  return positions
}

// ── Provider calls ────────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.25 },
      }),
    },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`)
  }
  const body = await res.json() as {
    candidates?: { content: { parts: { text: string }[] } }[]
  }
  return body?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      temperature: 0.25,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 200)}`)
  }
  const body = await res.json() as {
    content?: { type: string; text: string }[]
  }
  const text = body?.content?.find((c) => c.type === 'text')?.text ?? ''
  // Claude may wrap in ```json ... ``` even when asked not to — strip fences
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

// ── Shared parse + build ──────────────────────────────────────────────────────

function parseAndBuild(raw: string): { title: string; nodes: object[]; edges: object[] } {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new Error('AI returned malformed JSON. Try rephrasing your prompt.')
  }

  const result = SurveyFlowSchema.safeParse(json)
  if (!result.success) {
    throw new Error('AI returned an unexpected structure. Try rephrasing your prompt.')
  }

  const flow: SurveyFlow = result.data
  const idMap: Record<string, string> = {}
  flow.nodes.forEach((n) => { idMap[n.id] = uuidv4() })

  const positions = computeLayout(
    flow.nodes.map((n) => ({ id: n.id })),
    flow.edges,
  )

  const nodes = flow.nodes.map((n) => ({
    id: idMap[n.id],
    type: 'block',
    position: positions[n.id] ?? { x: 0, y: 0 },
    data: { blockType: n.blockType, config: n.config },
  }))

  const edges = flow.edges.map((e, i) => ({
    id: `e_${i}_${uuidv4().slice(0, 8)}`,
    source: idMap[e.source] ?? e.source,
    target: idMap[e.target] ?? e.target,
    type: 'logic',
    sourceHandle: e.sourceHandle ?? 'out',
    label: e.sourceHandle !== 'out' ? e.sourceHandle : undefined,
  }))

  return { title: flow.title, nodes, edges }
}

// ── Controller ────────────────────────────────────────────────────────────────

export async function generateSurvey(req: AuthRequest, res: Response) {
  const id = req.params.id as string

  const survey = await prisma.survey.findFirst({ where: { id, userId: req.userId! } })
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' })
    return
  }

  const schema = z.object({
    prompt: z.string().min(1).max(2000),
    model: z.enum(['gemini', 'anthropic']).default('gemini'),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  let raw: string
  try {
    raw = parsed.data.model === 'anthropic'
      ? await callAnthropic(parsed.data.prompt)
      : await callGemini(parsed.data.prompt)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI generation failed.'
    console.error('Generate error:', msg)
    const isConfig = msg.includes('not configured')
    res.status(isConfig ? 500 : 502).json({ error: isConfig ? msg : 'AI generation failed. Please try again.' })
    return
  }

  try {
    const result = parseAndBuild(raw)
    res.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to parse AI response.'
    console.error('Parse error:', msg, '\nRaw:', raw)
    res.status(502).json({ error: msg })
  }
}
