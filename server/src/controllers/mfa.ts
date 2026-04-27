import { Request, Response } from 'express'
// otplib v13 functional API — no `type` field, generateSecret takes no size arg
import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { encrypt, decrypt } from '../lib/encrypt'
import { AuthRequest } from '../middleware/auth'

const APP_NAME = 'wdym'
const BACKUP_CODE_COUNT = 8
const MFA_SETUP_TTL = 600    // 10 min to complete setup
const MFA_ATTEMPT_TTL = 900  // 15 min lockout window
const MAX_MFA_ATTEMPTS = 5

async function rateLimitIncr(key: string, ttl: number): Promise<number> {
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, ttl)
  return count
}

async function getUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: { select: { id: true, name: true, slug: true, ownerId: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return memberships.map(m => m.workspace)
}

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' })
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' })
  return { accessToken, refreshToken }
}

function verifyTotp(token: string, secret: string): boolean {
  // window: 2 → accepts codes from ±2 time steps (±60 s). window: 1 (±30 s)
  // was too tight for production containers whose clocks can drift slightly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = verifySync({ token, secret, window: 2 } as any)
  return typeof result === 'boolean' ? result : Boolean(result?.valid)
}

// ─── GET /mfa/status ──────────────────────────────────────────────────────────

export async function getMfaStatus(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { mfaEnabled: true, mfaBackupCodes: { where: { used: false }, select: { id: true } } },
  })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }

  res.json({ enabled: user.mfaEnabled, backupCodesRemaining: user.mfaBackupCodes.length })
}

// ─── POST /mfa/setup ──────────────────────────────────────────────────────────

export async function setupMfa(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { email: true, mfaEnabled: true },
  })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  if (user.mfaEnabled) { res.status(400).json({ error: 'MFA is already enabled' }); return }

  const secret = generateSecret()
  await redis.set(`mfa:setup:${req.userId}`, secret, { EX: MFA_SETUP_TTL })

  const otpauthUrl = generateURI({ label: user.email, issuer: APP_NAME, secret } as Parameters<typeof generateURI>[0])
  const qrCode = await QRCode.toDataURL(otpauthUrl, { width: 220, margin: 2 })

  res.json({ qrCode, secret, otpauthUrl })
}

// ─── POST /mfa/verify-setup ───────────────────────────────────────────────────

export async function verifyMfaSetup(req: AuthRequest, res: Response) {
  const result = z.object({ code: z.string().length(6).regex(/^\d+$/) }).safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: 'A 6-digit code is required' }); return }

  const secret = await redis.get(`mfa:setup:${req.userId}`)
  if (!secret) { res.status(400).json({ error: 'Setup session expired. Please restart.' }); return }

  if (!verifyTotp(result.data.code, secret)) {
    res.status(400).json({ error: 'Invalid code. Make sure your device clock is accurate.' })
    return
  }

  // Generate backup codes — plain text returned once, stored as bcrypt hashes
  const plainCodes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
    randomBytes(4).toString('hex').toUpperCase()
  )
  const hashedCodes = await Promise.all(plainCodes.map(c => bcrypt.hash(c, 10)))

  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.userId! },
      data: { mfaEnabled: true, mfaSecret: encrypt(secret) },
    }),
    prisma.mfaBackupCode.deleteMany({ where: { userId: req.userId! } }),
    ...hashedCodes.map(codeHash =>
      prisma.mfaBackupCode.create({ data: { userId: req.userId!, codeHash } })
    ),
  ])

  await redis.del(`mfa:setup:${req.userId}`)

  res.json({ backupCodes: plainCodes.map(c => `${c.slice(0, 4)}-${c.slice(4)}`) })
}

// ─── POST /mfa/disable ────────────────────────────────────────────────────────

export async function disableMfa(req: AuthRequest, res: Response) {
  const result = z.object({ code: z.string().min(1) }).safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: 'Code is required' }); return }

  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { mfaEnabled: true, mfaSecret: true },
  })
  if (!user?.mfaEnabled || !user.mfaSecret) { res.status(400).json({ error: 'MFA is not enabled' }); return }

  const secret = decrypt(user.mfaSecret)
  if (!verifyTotp(result.data.code.replace(/[-\s]/g, ''), secret)) {
    res.status(400).json({ error: 'Invalid authenticator code' })
    return
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: req.userId! }, data: { mfaEnabled: false, mfaSecret: null } }),
    prisma.mfaBackupCode.deleteMany({ where: { userId: req.userId! } }),
  ])

  res.json({ ok: true })
}

// ─── POST /mfa/verify — public, second step of login ─────────────────────────

export async function verifyMfaLogin(req: Request, res: Response) {
  const result = z.object({
    tempToken: z.string().min(1),
    code: z.string().min(1),
  }).safeParse(req.body)
  if (!result.success) { res.status(400).json({ error: 'tempToken and code are required' }); return }

  const { tempToken, code } = result.data

  // Temp token is a random hex string stored in Redis — NOT a JWT
  const userId = await redis.get(`mfa:temp:${tempToken}`)
  if (!userId) {
    res.status(401).json({ error: 'Session expired. Please log in again.' })
    return
  }

  // Rate limit — prevent brute-force
  const attempts = await rateLimitIncr(`mfa:attempts:${userId}`, MFA_ATTEMPT_TTL)
  if (attempts > MAX_MFA_ATTEMPTS) {
    const ttl = await redis.ttl(`mfa:attempts:${userId}`)
    const mins = Math.ceil(ttl / 60)
    res.status(429).json({ error: `Too many attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
  })
  if (!user?.mfaEnabled || !user.mfaSecret) {
    res.status(400).json({ error: 'MFA not configured' })
    return
  }

  const secret = decrypt(user.mfaSecret)
  const cleanCode = code.replace(/[-\s]/g, '')
  const totpValid = verifyTotp(cleanCode, secret)

  if (!totpValid) {
    // Try backup codes
    const unusedCodes = await prisma.mfaBackupCode.findMany({ where: { userId, used: false } })
    const matchResults = await Promise.all(unusedCodes.map(bc => bcrypt.compare(cleanCode, bc.codeHash)))
    const matchIndex = matchResults.findIndex(Boolean)

    if (matchIndex === -1) {
      const remaining = MAX_MFA_ATTEMPTS - attempts
      res.status(400).json({
        error: remaining > 0
          ? `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Too many attempts. Please log in again.',
      })
      return
    }

    // Mark backup code as used
    await prisma.mfaBackupCode.update({ where: { id: unusedCodes[matchIndex].id }, data: { used: true } })
  }

  // Success — clean up
  await Promise.all([
    redis.del(`mfa:temp:${tempToken}`),
    redis.del(`mfa:attempts:${userId}`),
  ])

  const workspaces = await getUserWorkspaces(userId)
  const tokens = generateTokens(userId)
  res.json({ ...tokens, user: { id: user.id, email: user.email }, workspaces })
}
