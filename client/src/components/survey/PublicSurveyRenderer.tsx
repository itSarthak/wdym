import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QuestionBlock } from './QuestionBlock'
import { RatingBlock } from './RatingBlock'
import { StatementBlock } from './StatementBlock'
import { MatrixBlock } from './MatrixBlock'
import { RecallBlock } from './RecallBlock'
import {
  QuestionConfig, IfElseConfig, SwitchConfig, EndConfig,
  RatingConfig, StatementConfig, MatrixConfig, HiddenFieldConfig, RecallConfig,
} from '../../store/builder'

type InteractiveBlockType = 'question' | 'rating' | 'statement' | 'matrix' | 'recall' | 'end'
type AllBlockType = InteractiveBlockType | 'if_else' | 'switch' | 'hidden_field'
type AnyConfig = QuestionConfig | IfElseConfig | SwitchConfig | EndConfig | RatingConfig | StatementConfig | MatrixConfig | HiddenFieldConfig | RecallConfig

interface Block {
  id: string
  type: string
  data: { blockType: AllBlockType; config: AnyConfig }
}
interface Edge { id: string; source: string; target: string; sourceHandle?: string | null }
interface Survey { id: string; title: string; blocks: Block[]; edges: Edge[] }

const INTERACTIVE: AllBlockType[] = ['question', 'rating', 'statement', 'matrix', 'recall', 'end']

function findStartBlock(blocks: Block[], edges: Edge[]): Block | undefined {
  const targetIds = new Set(edges.map((e) => e.target))
  return blocks.find((b) => !targetIds.has(b.id))
}

function evaluateCondition(config: IfElseConfig, answers: Record<string, unknown>): boolean {
  const answer = String(answers[config.field] ?? '')
  switch (config.operator) {
    case 'equals':       return answer === config.value
    case 'not_equals':   return answer !== config.value
    case 'contains':     return answer.includes(config.value)
    case 'greater_than': return Number(answer) > Number(config.value)
    case 'less_than':    return Number(answer) < Number(config.value)
    default:             return false
  }
}

function getNextBlock(current: Block, blocks: Block[], edges: Edge[], answers: Record<string, unknown>): Block | null {
  const outgoing = edges.filter((e) => e.source === current.id)
  if (outgoing.length === 0) return null
  const { blockType, config } = current.data

  if (blockType === 'if_else') {
    const met = evaluateCondition(config as IfElseConfig, answers)
    const edge = outgoing.find((e) => e.sourceHandle === (met ? 'true' : 'false')) ?? outgoing[0]
    return blocks.find((b) => b.id === edge.target) ?? null
  }

  if (blockType === 'switch') {
    const answer = String(answers[(config as SwitchConfig).field] ?? '')
    const edge = outgoing.find((e) => e.sourceHandle === answer)
      ?? outgoing.find((e) => e.sourceHandle === 'default')
      ?? outgoing[0]
    return blocks.find((b) => b.id === edge.target) ?? null
  }

  return blocks.find((b) => b.id === outgoing[0].target) ?? null
}

// Resolves through logic/hidden_field blocks to the next interactive block.
// Mutates answersRef for hidden_field captures.
function resolveToInteractive(
  block: Block,
  blocks: Block[],
  edges: Edge[],
  answers: Record<string, unknown>,
  onHiddenCapture: (field: string, value: unknown) => void,
): Block | null {
  let current: Block | null = block
  const visited = new Set<string>()
  while (current) {
    if (visited.has(current.id)) return null
    visited.add(current.id)

    if (INTERACTIVE.includes(current.data.blockType)) return current

    if (current.data.blockType === 'hidden_field') {
      const cfg = current.data.config as HiddenFieldConfig
      const params = new URLSearchParams(window.location.search)
      const captured = params.get(cfg.paramName) ?? cfg.defaultValue ?? ''
      onHiddenCapture(cfg.field, captured)
      answers = { ...answers, [cfg.field]: captured }
    }

    current = getNextBlock(current, blocks, edges, answers)
  }
  return null
}

export function PublicSurveyRenderer({
  survey, onSubmit, onProgress, preview,
}: {
  survey: Survey
  onSubmit: (answers: Record<string, unknown>) => void
  onProgress?: (answers: Record<string, unknown>, lastBlockId: string) => void
  preview?: boolean
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [history, setHistory] = useState<Block[]>([])
  const [done, setDone] = useState(false)

  const [currentBlock, setCurrentBlock] = useState<Block | null>(() => {
    const start = findStartBlock(survey.blocks, survey.edges)
    if (!start) return null
    const captured: Record<string, unknown> = {}
    return resolveToInteractive(start, survey.blocks, survey.edges, {}, (f, v) => { captured[f] = v })
  })

  const advance = useCallback((newAnswers: Record<string, unknown>, current: Block) => {
    setHistory((h) => [...h, current])
    const next = getNextBlock(current, survey.blocks, survey.edges, newAnswers)
    if (!next) { setDone(true); onSubmit(newAnswers); return }

    const extraCaptures: Record<string, unknown> = {}
    const resolved = resolveToInteractive(next, survey.blocks, survey.edges, newAnswers, (f, v) => {
      extraCaptures[f] = v
    })

    if (Object.keys(extraCaptures).length > 0) {
      setAnswers((a) => ({ ...a, ...extraCaptures }))
    }

    if (!resolved || resolved.data.blockType === 'end') {
      setDone(true)
      onSubmit({ ...newAnswers, ...extraCaptures })
    } else {
      setCurrentBlock(resolved)
    }
  }, [survey, onSubmit])

  const handleAnswer = useCallback((value: unknown) => {
    if (!currentBlock) return
    const { blockType, config } = currentBlock.data
    let newAnswers = answers

    if (blockType === 'statement') {
      onProgress?.(newAnswers, currentBlock.id)
      advance(newAnswers, currentBlock)
      return
    }

    const field = (config as { field?: string }).field
    if (field) {
      newAnswers = { ...answers, [field]: value }
      setAnswers(newAnswers)
    }
    onProgress?.(newAnswers, currentBlock.id)
    advance(newAnswers, currentBlock)
  }, [currentBlock, answers, advance, onProgress])

  if (!currentBlock && !done) {
    return <p className="text-[#a1a1aa] dark:text-[#555] text-sm">This survey has no questions yet.</p>
  }

  if (done || currentBlock?.data.blockType === 'end') {
    const msg = currentBlock?.data.blockType === 'end'
      ? (currentBlock.data.config as EndConfig).message
      : 'Thank you for completing this survey!'
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
        <p className="text-[#09090b] dark:text-white font-medium">{msg}</p>
        <p className="text-[#71717a] dark:text-[#555] text-sm">
          {preview ? 'Preview complete — no response was saved.' : 'Your response has been submitted.'}
        </p>
      </motion.div>
    )
  }

  const interactiveBlocks = survey.blocks.filter((b) => INTERACTIVE.includes(b.data.blockType) && b.data.blockType !== 'end')
  const answeredCount = history.filter((b) => INTERACTIVE.includes(b.data.blockType) && b.data.blockType !== 'end').length
  const totalCount = interactiveBlocks.length

  const block = currentBlock!
  const { blockType, config } = block.data

  return (
    <div className="flex flex-col gap-8">
      {totalCount > 0 && (
        <div className="w-full h-px bg-[#f4f4f5] dark:bg-[#111]">
          <div
            className="h-px bg-[#09090b] dark:bg-[#333] transition-all duration-500"
            style={{ width: `${(answeredCount / totalCount) * 100}%` }}
          />
        </div>
      )}
      <AnimatePresence mode="wait">
        {blockType === 'question' && (
          <QuestionBlock key={block.id} config={config as QuestionConfig} onAnswer={handleAnswer} />
        )}
        {blockType === 'rating' && (
          <RatingBlock key={block.id} config={config as RatingConfig} onAnswer={(v) => handleAnswer(v)} />
        )}
        {blockType === 'statement' && (
          <StatementBlock key={block.id} config={config as StatementConfig} onContinue={() => handleAnswer(null)} />
        )}
        {blockType === 'matrix' && (
          <MatrixBlock key={block.id} config={config as MatrixConfig} onAnswer={(v) => handleAnswer(v)} />
        )}
        {blockType === 'recall' && (
          <RecallBlock key={block.id} config={config as RecallConfig} answers={answers} onAnswer={handleAnswer} />
        )}
      </AnimatePresence>
    </div>
  )
}
