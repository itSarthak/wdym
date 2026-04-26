import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

const createSchema = z.object({ name: z.string().min(1).max(64) })
const inviteSchema = z.object({ email: z.string().email() })

function makeSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}

async function assertMember(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })
  return !!member
}

export async function listWorkspaces(req: AuthRequest, res: Response) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: req.userId! },
    include: { workspace: { select: { id: true, name: true, slug: true, ownerId: true } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json(memberships.map(m => m.workspace))
}

export async function createWorkspace(req: AuthRequest, res: Response) {
  const result = createSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' })
    return
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: result.data.name,
      slug: makeSlug(result.data.name),
      ownerId: req.userId!,
      members: { create: { userId: req.userId! } },
    },
    select: { id: true, name: true, slug: true, ownerId: true },
  })

  res.status(201).json(workspace)
}

export async function getWorkspace(req: AuthRequest, res: Response) {
  const { id } = req.params as { id: string }

  const isMember = await assertMember(id, req.userId!)
  if (!isMember) { res.status(403).json({ error: 'Forbidden' }); return }

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    select: {
      id: true, name: true, slug: true, ownerId: true,
      members: {
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      invites: {
        where: { accepted: false, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!workspace) { res.status(404).json({ error: 'Workspace not found' }); return }

  res.json({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    ownerId: workspace.ownerId,
    members: workspace.members.map(m => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      isOwner: m.userId === workspace.ownerId,
    })),
    invites: workspace.invites,
  })
}

export async function deleteWorkspace(req: AuthRequest, res: Response) {
  const { id } = req.params as { id: string }

  const workspace = await prisma.workspace.findUnique({ where: { id } })
  if (!workspace) { res.status(404).json({ error: 'Workspace not found' }); return }
  if (workspace.ownerId !== req.userId!) { res.status(403).json({ error: 'Only the owner can delete this workspace' }); return }

  const totalMemberships = await prisma.workspaceMember.count({ where: { userId: req.userId! } })
  if (totalMemberships <= 1) {
    res.status(400).json({ error: 'You cannot delete your only workspace' })
    return
  }

  await prisma.workspace.delete({ where: { id } })
  res.status(204).send()
}

export async function inviteToWorkspace(req: AuthRequest, res: Response) {
  const { id } = req.params as { id: string }

  const isMember = await assertMember(id, req.userId!)
  if (!isMember) { res.status(403).json({ error: 'Forbidden' }); return }

  const result = inviteSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid email' })
    return
  }

  const { email } = result.data

  const workspace = await prisma.workspace.findUnique({ where: { id }, select: { name: true } })
  if (!workspace) { res.status(404).json({ error: 'Workspace not found' }); return }

  // Check if this email is already a member
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existingUser) {
    const alreadyMember = await assertMember(id, existingUser.id)
    if (alreadyMember) {
      res.status(409).json({ error: 'This person is already a member' })
      return
    }

    // Existing user — add them directly
    await prisma.workspaceMember.create({ data: { workspaceId: id, userId: existingUser.id } })

    // Send notification email
    const { sendInviteEmail } = await import('../lib/mail')
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    await sendInviteEmail(email, workspace.name, `${frontendUrl}/dashboard`)
    res.json({ ok: true, joined: true })
    return
  }

  // New user — create/refresh invite
  const { randomBytes } = await import('crypto')
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.workspaceInvite.upsert({
    where: { workspaceId_email: { workspaceId: id, email } },
    update: { token, expiresAt, accepted: false },
    create: { workspaceId: id, email, token, expiresAt },
  })

  const { sendInviteEmail } = await import('../lib/mail')
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  await sendInviteEmail(email, workspace.name, `${frontendUrl}/invite/${token}`)

  res.json({ ok: true, joined: false })
}

export async function removeMember(req: AuthRequest, res: Response) {
  const { id, userId } = req.params as { id: string; userId: string }

  const workspace = await prisma.workspace.findUnique({ where: { id }, select: { ownerId: true } })
  if (!workspace) { res.status(404).json({ error: 'Workspace not found' }); return }

  const isMember = await assertMember(id, req.userId!)
  if (!isMember) { res.status(403).json({ error: 'Forbidden' }); return }

  // Owner can remove anyone except themselves; members can only remove themselves
  if (userId === workspace.ownerId) {
    res.status(400).json({ error: 'The workspace owner cannot be removed' })
    return
  }
  if (req.userId !== workspace.ownerId && req.userId !== userId) {
    res.status(403).json({ error: 'You can only remove yourself' })
    return
  }

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId: id, userId } },
  })
  res.status(204).send()
}
