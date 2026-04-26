import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export async function getInvite(req: Request, res: Response) {
  const { token } = req.params as { token: string }

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, name: true } } },
  })

  if (!invite) { res.status(404).json({ error: 'Invite not found or expired' }); return }
  if (invite.accepted) { res.status(410).json({ error: 'Invite already used' }); return }
  if (invite.expiresAt < new Date()) { res.status(410).json({ error: 'Invite has expired' }); return }

  res.json({ workspaceId: invite.workspaceId, workspaceName: invite.workspace.name, email: invite.email })
}

export async function acceptInvite(req: AuthRequest, res: Response) {
  const { token } = req.params as { token: string }

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, name: true, slug: true, ownerId: true } } },
  })

  if (!invite) { res.status(404).json({ error: 'Invite not found' }); return }
  if (invite.accepted) { res.status(410).json({ error: 'Invite already used' }); return }
  if (invite.expiresAt < new Date()) { res.status(410).json({ error: 'Invite has expired' }); return }

  // Add as member (upsert — idempotent if already a member somehow)
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: req.userId! } },
    update: {},
    create: { workspaceId: invite.workspaceId, userId: req.userId! },
  })

  await prisma.workspaceInvite.update({ where: { token }, data: { accepted: true } })

  res.json({
    workspace: {
      id: invite.workspace.id,
      name: invite.workspace.name,
      slug: invite.workspace.slug,
      ownerId: invite.workspace.ownerId,
    },
  })
}
