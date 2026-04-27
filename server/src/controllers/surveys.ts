import { Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

function isFkViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003'
}

const surveySchema = z.object({
  title: z.string().min(1).optional(),
  blocks: z.unknown().optional(),
  edges: z.unknown().optional(),
  settings: z.unknown().optional(),
})

export async function getSurveys(req: AuthRequest, res: Response) {
  const workspaceId = req.headers['x-workspace-id'] as string | undefined
  if (!workspaceId) {
    res.status(400).json({ error: 'X-Workspace-Id header required' })
    return
  }

  const surveys = await prisma.survey.findMany({
    where: { userId: req.userId!, workspaceId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      publishedAt: true,
      views: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { responses: true } },
    },
  })
  res.json(surveys)
}

export async function createSurvey(req: AuthRequest, res: Response) {
  const workspaceId = req.headers['x-workspace-id'] as string | undefined
  if (!workspaceId) {
    res.status(400).json({ error: 'X-Workspace-Id header required' })
    return
  }

  const result = surveySchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  try {
    const survey = await prisma.survey.create({
      data: {
        slug: uuidv4(),
        title: result.data.title || 'Untitled Survey',
        blocks: (result.data.blocks ?? []) as Prisma.InputJsonValue,
        edges: (result.data.edges ?? []) as Prisma.InputJsonValue,
        settings: (result.data.settings ?? {}) as Prisma.InputJsonValue,
        userId: req.userId!,
        workspaceId,
      },
    })
    res.status(201).json(survey)
  } catch (err) {
    if (isFkViolation(err)) {
      res.status(401).json({ error: 'Session expired. Please log in again.' })
      return
    }
    throw err
  }
}

export async function getSurvey(req: AuthRequest, res: Response) {
  const id = req.params.id as string
  const survey = await prisma.survey.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' })
    return
  }
  res.json(survey)
}

export async function updateSurvey(req: AuthRequest, res: Response) {
  const id = req.params.id as string
  const result = surveySchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const survey = await prisma.survey.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' })
    return
  }

  const data: Prisma.SurveyUpdateInput = {}
  if (result.data.title !== undefined) data.title = result.data.title
  if (result.data.blocks !== undefined) data.blocks = result.data.blocks as Prisma.InputJsonValue
  if (result.data.edges !== undefined) data.edges = result.data.edges as Prisma.InputJsonValue
  if (result.data.settings !== undefined) data.settings = result.data.settings as Prisma.InputJsonValue

  const updated = await prisma.survey.update({ where: { id }, data })
  res.json(updated)
}

export async function deleteSurvey(req: AuthRequest, res: Response) {
  const id = req.params.id as string
  const survey = await prisma.survey.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' })
    return
  }
  await prisma.survey.delete({ where: { id } })
  res.status(204).send()
}

export async function getSurveyAnalytics(req: AuthRequest, res: Response) {
  const id = req.params.id as string
  const survey = await prisma.survey.findFirst({
    where: { id, userId: req.userId! },
    select: { id: true, title: true, blocks: true, edges: true, views: true, publishedAt: true, published: true },
  })
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' })
    return
  }

  const [completedResponses, totalStarted, dropOffRaw] = await Promise.all([
    prisma.response.findMany({
      where: { surveyId: id, completed: true },
      select: { id: true, answers: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.response.count({ where: { surveyId: id } }),
    prisma.response.groupBy({
      by: ['lastBlockId'],
      where: { surveyId: id, completed: false, lastBlockId: { not: null } },
      _count: { _all: true },
    }),
  ])

  const dropOff = dropOffRaw
    .filter((r) => r.lastBlockId != null)
    .map((r) => ({ blockId: r.lastBlockId as string, count: r._count._all }))
    .sort((a, b) => b.count - a.count)

  res.json({
    title: survey.title,
    views: survey.views,
    blocks: survey.blocks,
    edges: survey.edges,
    publishedAt: survey.publishedAt,
    published: survey.published,
    stats: {
      views: survey.views,
      completed: completedResponses.length,
      started: totalStarted,
      forfeited: Math.max(0, totalStarted - completedResponses.length),
      completionRate: totalStarted > 0 ? Math.round((completedResponses.length / totalStarted) * 100) : 0,
      viewToStart: survey.views > 0 ? Math.round((totalStarted / survey.views) * 100) : 0,
    },
    dropOff,
    responses: completedResponses,
  })
}

export async function publishSurvey(req: AuthRequest, res: Response) {
  const id = req.params.id as string
  const survey = await prisma.survey.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' })
    return
  }

  const updated = await prisma.survey.update({
    where: { id },
    data: { published: true, publishedAt: new Date() },
  })
  res.json({ ...updated, url: `/s/${updated.slug}` })
}

export async function unpublishSurvey(req: AuthRequest, res: Response) {
  const id = req.params.id as string
  const survey = await prisma.survey.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!survey) {
    res.status(404).json({ error: 'Survey not found' })
    return
  }

  const updated = await prisma.survey.update({
    where: { id },
    data: { published: false, publishedAt: null },
  })
  res.json(updated)
}
