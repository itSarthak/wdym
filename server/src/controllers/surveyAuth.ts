import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { decrypt } from '../lib/encrypt'

// ── Helpers ───────────────────────────────────────────────────────────────────

function authSecret() {
  const s = process.env.SURVEY_AUTH_SECRET
  if (!s) throw new Error('SURVEY_AUTH_SECRET not configured')
  return s
}

/** URL of this API server — used as the OAuth redirect_uri base */
function apiUrl() { return process.env.APP_URL || 'http://localhost:4000' }

/** URL of the React client — where we redirect after auth */
function clientUrl() { return process.env.CLIENT_URL || 'http://localhost:5173' }

function redirectUri() { return `${apiUrl()}/s/oauth/callback` }

export function cookieName(slug: string) { return `survey_auth_${slug}` }

export function signAuthCookie(email: string, slug: string): string {
  return jwt.sign({ email, slug }, authSecret(), { expiresIn: '24h' })
}

export function verifyAuthCookie(token: string): { email: string; slug: string } {
  return jwt.verify(token, authSecret()) as { email: string; slug: string }
}

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86_400_000, // 24 h
    path: '/',
  }
}

// ── GET /s/:slug/auth/google ──────────────────────────────────────────────────

export async function initiateGoogleAuth(req: Request, res: Response) {
  const slug = req.params.slug as string
  const survey = await prisma.survey.findFirst({
    where: { slug, published: true },
    select: { settings: true },
  })
  if (!survey) { res.status(404).json({ error: 'Survey not found' }); return }

  const settings = survey.settings as Record<string, unknown> | null
  if (!settings?.authRequired || settings.authProvider !== 'google') {
    res.status(400).json({ error: 'Google auth not configured for this survey' })
    return
  }

  const clientId = settings.googleClientId as string | undefined
  const encryptedSecret = settings.googleClientSecret as string | undefined
  if (!clientId || !encryptedSecret) {
    res.status(400).json({ error: 'Google credentials not configured' })
    return
  }

  // State JWT — slug only; credentials are re-read from DB in the callback
  const state = jwt.sign({ slug }, authSecret(), { expiresIn: '15m' })
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

// ── GET /s/oauth/callback ─────────────────────────────────────────────────────

export async function handleOAuthCallback(req: Request, res: Response) {
  const { code, state, error } = req.query as Record<string, string>
  const clientBase = clientUrl()

  if (error || !code || !state) {
    res.redirect(`${clientBase}/?oauth_error=1`)
    return
  }

  // Recover slug from signed state
  let slug: string
  try {
    const payload = jwt.verify(state, authSecret()) as { slug: string }
    slug = payload.slug
  } catch {
    res.redirect(`${clientBase}/?oauth_error=1`)
    return
  }

  // Re-fetch survey credentials from DB
  const survey = await prisma.survey.findFirst({
    where: { slug, published: true },
    select: { settings: true },
  })
  if (!survey) { res.redirect(`${clientBase}/?oauth_error=1`); return }

  const settings = survey.settings as Record<string, unknown> | null
  const clientId = settings?.googleClientId as string | undefined
  const encryptedSecret = settings?.googleClientSecret as string | undefined

  if (!clientId || !encryptedSecret) {
    res.redirect(`${clientBase}/s/${slug}?blocked=1`)
    return
  }

  let clientSecret: string
  try {
    clientSecret = decrypt(encryptedSecret)
  } catch {
    res.redirect(`${clientBase}/s/${slug}?blocked=1`)
    return
  }

  // Exchange code → access token → email
  let email: string
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri(), grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) throw new Error('token exchange failed')
    const tokens = await tokenRes.json() as { access_token?: string }
    if (!tokens.access_token) throw new Error('no access_token')

    const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!userRes.ok) throw new Error('userinfo failed')
    const user = await userRes.json() as { email?: string }
    if (!user.email) throw new Error('no email')
    email = user.email.toLowerCase()
  } catch {
    res.redirect(`${clientBase}/s/${slug}?blocked=1`)
    return
  }

  // Allowlist check
  const allowlist = (settings?.allowlist as string[] | undefined) ?? []
  if (allowlist.length > 0 && !allowlist.includes(email)) {
    res.redirect(`${clientBase}/s/${slug}?blocked=1`)
    return
  }

  res.cookie(cookieName(slug), signAuthCookie(email, slug), cookieOpts())
  res.redirect(`${clientBase}/s/${slug}`)
}

// ── GET /s/:slug/auth/wdym ────────────────────────────────────────────────────

export async function initiateWdymAuth(req: Request, res: Response) {
  const slug = req.params.slug as string

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' })
    return
  }

  let userId: string
  try {
    const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as { userId: string }
    userId = payload.userId
  } catch {
    res.status(401).json({ error: 'Invalid token' })
    return
  }

  const [user, survey] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    prisma.survey.findFirst({ where: { slug, published: true }, select: { settings: true } }),
  ])

  if (!user || !survey) { res.status(404).json({ error: 'Not found' }); return }

  const settings = survey.settings as Record<string, unknown> | null
  const email = user.email.toLowerCase()
  const allowlist = (settings?.allowlist as string[] | undefined) ?? []
  const allowlistMessage = (settings?.allowlistMessage as string | undefined) || 'You are not allowed to access this survey.'

  if (allowlist.length > 0 && !allowlist.includes(email)) {
    res.json({ blocked: true, message: allowlistMessage })
    return
  }

  res.cookie(cookieName(slug), signAuthCookie(email, slug), cookieOpts())
  res.json({ ok: true, email })
}
