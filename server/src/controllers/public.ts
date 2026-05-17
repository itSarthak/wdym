import { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { cookieName, verifyAuthCookie } from './surveyAuth'

function stripSecret(settings: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!settings) return settings
  const { googleClientSecret: _omit, ...rest } = settings
  return rest
}

function checkAuth(
  req: Request,
  slug: string,
  settings: Record<string, unknown> | null,
): { ok: true; email: string } | { ok: false; response: object } {
  if (!settings?.authRequired) return { ok: true, email: '' }

  const provider = (settings.authProvider as string | undefined) ?? 'wdym'
  const title = undefined // caller fills this in

  const token = req.cookies?.[cookieName(slug)] as string | undefined
  if (!token) {
    return { ok: false, response: { authRequired: true, provider, title } }
  }

  let payload: { email: string; slug: string }
  try {
    payload = verifyAuthCookie(token)
  } catch {
    return { ok: false, response: { authRequired: true, provider, title } }
  }

  const allowlist = (settings.allowlist as string[] | undefined) ?? []
  if (allowlist.length > 0 && !allowlist.includes(payload.email)) {
    const msg = (settings.allowlistMessage as string | undefined) || 'You are not allowed to access this survey.'
    return { ok: false, response: { blocked: true, message: msg } }
  }

  return { ok: true, email: payload.email }
}

export async function getPublicSurvey(req: Request, res: Response) {
  const slug = req.params.slug as string
  const survey = await prisma.survey.findFirst({
    where: { slug, published: true },
    select: { id: true, title: true, slug: true, blocks: true, edges: true, settings: true },
  })
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' })
    return
  }

  prisma.survey.update({
    where: { slug },
    data: { views: { increment: 1 } },
  }).catch(() => {/* non-critical */})

  const settings = survey.settings as Record<string, unknown> | null

  // Auth wall check
  const auth = checkAuth(req, slug, settings)
  if (!auth.ok) {
    const provider = (settings?.authProvider as string | undefined) ?? 'wdym'
    res.json({ ...auth.response, title: survey.title, provider })
    return
  }

  const responseLimit = settings?.responseLimit as number | null | undefined
  let closed = false
  if (responseLimit != null && responseLimit > 0) {
    const completedCount = await prisma.response.count({
      where: { surveyId: survey.id, completed: true },
    })
    closed = completedCount >= responseLimit
  }

  res.json({
    ...survey,
    settings: stripSecret(settings),
    closed,
    closedMessage: (settings?.closedMessage as string | undefined) || null,
  })
}

// Creates a partial response when the respondent answers the first question.
// Returns a session ID that the client stores in sessionStorage to track progress.
export async function createResponse(req: Request, res: Response) {
  const slug = req.params.slug as string
  const survey = await prisma.survey.findFirst({
    where: { slug, published: true },
    select: { id: true, settings: true },
  })
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' })
    return
  }

  const settings = survey.settings as Record<string, unknown> | null

  // Auth check — reject unauthenticated responses when auth is required
  let authEmail = ''
  if (settings?.authRequired) {
    const auth = checkAuth(req, slug, settings)
    if (!auth.ok) {
      res.status(401).json({ error: 'auth_required' })
      return
    }
    authEmail = auth.email

    // Duplicate submission detection
    const duplicate = await prisma.response.findFirst({
      where: {
        surveyId: survey.id,
        answers: { path: ['_auth_email'], equals: authEmail },
      },
    })
    if (duplicate) {
      res.status(409).json({ error: 'already_submitted' })
      return
    }
  }

  // Enforce response limit
  const responseLimit = settings?.responseLimit as number | null | undefined
  if (responseLimit != null && responseLimit > 0) {
    const completedCount = await prisma.response.count({
      where: { surveyId: survey.id, completed: true },
    })
    if (completedCount >= responseLimit) {
      res.status(409).json({ error: 'survey_closed' })
      return
    }
  }

  const schema = z.object({
    answers: z.record(z.string(), z.unknown()).default({}),
    lastBlockId: z.string().optional(),
    completed: z.boolean().optional(),
  })
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  // Inject auth email into answers for duplicate detection on future attempts
  const answers = authEmail
    ? { ...result.data.answers, _auth_email: authEmail }
    : result.data.answers

  const response = await prisma.response.create({
    data: {
      surveyId: survey.id,
      answers: answers as Prisma.InputJsonValue,
      lastBlockId: result.data.lastBlockId,
      completed: result.data.completed ?? false,
    },
  })
  res.status(201).json({ id: response.id })
}

// Updates an in-progress response. Sets completed=true on final submission.
export async function updateResponse(req: Request, res: Response) {
  const slug = req.params.slug as string
  const id = req.params.id as string

  const schema = z.object({
    answers: z.record(z.string(), z.unknown()).default({}),
    lastBlockId: z.string().nullable().optional(),
    completed: z.boolean().optional(),
  })
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const existing = await prisma.response.findFirst({
    where: { id, survey: { slug } },
  })
  if (!existing) {
    res.status(404).json({ error: 'Response not found' })
    return
  }

  // Preserve _auth_email from original answers so duplicate detection keeps working
  const existingAnswers = (existing.answers as Record<string, unknown>) ?? {}
  const answers = existingAnswers._auth_email
    ? { ...result.data.answers, _auth_email: existingAnswers._auth_email }
    : result.data.answers

  await prisma.response.update({
    where: { id },
    data: {
      answers: answers as Prisma.InputJsonValue,
      lastBlockId: result.data.lastBlockId !== undefined ? result.data.lastBlockId : existing.lastBlockId,
      completed: result.data.completed ?? existing.completed,
    },
  })
  res.json({ ok: true })
}
