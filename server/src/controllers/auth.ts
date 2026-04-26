import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' })
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' })
  return { accessToken, refreshToken }
}

export async function register(req: Request, res: Response) {
  const result = registerSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const { email, password } = result.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({ data: { email, password: hashed } })
  const tokens = generateTokens(user.id)
  res.status(201).json({ ...tokens, user: { id: user.id, email: user.email } })
}

export async function login(req: Request, res: Response) {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const { email, password } = result.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const tokens = generateTokens(user.id)
  res.json({ ...tokens, user: { id: user.id, email: user.email } })
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
