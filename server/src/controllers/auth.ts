import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { sendOtpEmail } from '../lib/mail'

// Redis key TTLs (seconds)
const OTP_TTL = 300          // 5 min — OTP validity
const ATTEMPT_TTL = 900      // 15 min — wrong-attempt window
const RESEND_TTL = 3600      // 1 hour — resend window

// Hard limits
const MAX_ATTEMPTS = 5       // wrong guesses before lockout
const MAX_RESENDS = 3        // resend requests per hour

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const verifySchema = z.object({
  userId: z.string().uuid(),
  otp: z.string().length(6).regex(/^\d+$/),
})

const resendSchema = z.object({
  userId: z.string().uuid(),
})

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' })
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' })
  return { accessToken, refreshToken }
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function getUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: { select: { id: true, name: true, slug: true, ownerId: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return memberships.map(m => m.workspace)
}

// Increment a Redis counter and set TTL only on first increment.
// Returns the new count.
async function rateLimitIncr(key: string, ttl: number): Promise<number> {
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, ttl)
  return count
}

export async function register(req: Request, res: Response) {
  const result = registerSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' })
    return
  }

  const { email, password } = result.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, password: hashed, emailVerified: false },
  })

  const otp = generateOtp()
  await redis.set(`otp:${user.id}`, otp, { EX: OTP_TTL })
  await sendOtpEmail(email, otp)

  res.status(201).json({ requiresVerification: true, userId: user.id })
}

export async function verifyOtp(req: Request, res: Response) {
  const result = verifySchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' })
    return
  }

  const { userId, otp } = result.data

  // Check attempt rate limit before touching the OTP
  const attempts = await rateLimitIncr(`otp:attempts:${userId}`, ATTEMPT_TTL)
  if (attempts > MAX_ATTEMPTS) {
    const ttl = await redis.ttl(`otp:attempts:${userId}`)
    const mins = Math.ceil(ttl / 60)
    res.status(429).json({ error: `Too many attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` })
    return
  }

  const stored = await redis.get(`otp:${userId}`)
  if (!stored) {
    res.status(400).json({ error: 'Code expired. Request a new one.' })
    return
  }
  if (stored !== otp) {
    const remaining = MAX_ATTEMPTS - attempts
    res.status(400).json({
      error: remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} left.`
        : 'Too many attempts. Request a new code.',
    })
    return
  }

  // OTP matched — clean up and mark verified
  await Promise.all([
    redis.del(`otp:${userId}`),
    redis.del(`otp:attempts:${userId}`),
    redis.del(`otp:resend:${userId}`),
    prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
  ])

  const [user, workspaces] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } }),
    getUserWorkspaces(userId),
  ])
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const tokens = generateTokens(user.id)
  res.json({ ...tokens, user: { id: user.id, email: user.email }, workspaces })
}

export async function resendOtp(req: Request, res: Response) {
  const result = resendSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' })
    return
  }

  const { userId } = result.data

  const resends = await rateLimitIncr(`otp:resend:${userId}`, RESEND_TTL)
  if (resends > MAX_RESENDS) {
    const ttl = await redis.ttl(`otp:resend:${userId}`)
    const mins = Math.ceil(ttl / 60)
    res.status(429).json({ error: `Too many requests. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  if (user.emailVerified) {
    res.status(400).json({ error: 'Email already verified' })
    return
  }

  // Reset attempt counter when a fresh OTP is issued
  const otp = generateOtp()
  await Promise.all([
    redis.set(`otp:${userId}`, otp, { EX: OTP_TTL }),
    redis.del(`otp:attempts:${userId}`),
  ])
  await sendOtpEmail(user.email, otp)

  res.json({ ok: true })
}

export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' })
    return
  }

  const { email, password } = result.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  if (!user.emailVerified) {
    // Issue a fresh OTP so the user can verify without needing the original email
    const existingOtp = await redis.get(`otp:${user.id}`)
    if (!existingOtp) {
      const resends = await rateLimitIncr(`otp:resend:${user.id}`, RESEND_TTL)
      if (resends <= MAX_RESENDS) {
        const otp = generateOtp()
        await redis.set(`otp:${user.id}`, otp, { EX: OTP_TTL })
        await sendOtpEmail(user.email, otp)
      }
    }
    res.status(403).json({ requiresVerification: true, userId: user.id })
    return
  }

  // MFA check — issue a short-lived Redis temp token instead of full auth tokens
  if (user.mfaEnabled) {
    const { randomBytes } = await import('crypto')
    const tempToken = randomBytes(32).toString('hex')
    await redis.set(`mfa:temp:${tempToken}`, user.id, { EX: 300 })
    res.json({ requiresMfa: true, tempToken })
    return
  }

  const workspaces = await getUserWorkspaces(user.id)
  const tokens = generateTokens(user.id)
  res.json({ ...tokens, user: { id: user.id, email: user.email }, workspaces })
}

export async function changePassword(req: AuthRequest, res: Response) {
  const schema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
  })
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.errors[0]?.message ?? 'Invalid request' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }

  const valid = await bcrypt.compare(result.data.currentPassword, user.password)
  if (!valid) { res.status(400).json({ error: 'Current password is incorrect' }); return }

  const hashed = await bcrypt.hash(result.data.newPassword, 12)
  await prisma.user.update({ where: { id: req.userId! }, data: { password: hashed } })
  res.json({ ok: true })
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' })
    return
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string }
    const accessToken = jwt.sign({ userId: payload.userId }, process.env.JWT_SECRET!, { expiresIn: '15m' })
    res.json({ accessToken })
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
}
