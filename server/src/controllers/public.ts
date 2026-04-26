import { Request, Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

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

  res.json(survey)
}

// Creates a partial response when the respondent answers the first question.
// Returns a session ID that the client stores in sessionStorage to track progress.
export async function createResponse(req: Request, res: Response) {
  const slug = req.params.slug as string
  const survey = await prisma.survey.findFirst({ where: { slug, published: true } })
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' })
    return
  }

  const schema = z.object({
    answers: z.record(z.string(), z.unknown()).default({}),
    lastBlockId: z.string().optional(),
  })
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const response = await prisma.response.create({
    data: {
      surveyId: survey.id,
      answers: result.data.answers as Prisma.InputJsonValue,
      lastBlockId: result.data.lastBlockId,
      completed: false,
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

  await prisma.response.update({
    where: { id },
    data: {
      answers: result.data.answers as Prisma.InputJsonValue,
      lastBlockId: result.data.lastBlockId !== undefined ? result.data.lastBlockId : existing.lastBlockId,
      completed: result.data.completed ?? existing.completed,
    },
  })
  res.json({ ok: true })
}
