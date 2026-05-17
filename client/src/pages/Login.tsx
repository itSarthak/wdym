import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useGoogleLogin } from '@react-oauth/google'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { AuthLayout } from '../components/auth/AuthLayout'
import { OtpBoxes } from '../components/auth/OtpBoxes'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function GoogleButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-[#e4e4e7] dark:border-[#222] text-sm font-medium text-[#09090b] dark:text-white hover:bg-[#f4f4f5] dark:hover:bg-[#111] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <GoogleIcon />
      {loading ? 'Connecting…' : 'Continue with Google'}
    </button>
  )
}

function Divider() {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[#e4e4e7] dark:border-[#222]" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white dark:bg-black px-2 text-xs text-[#a1a1aa] dark:text-[#555]">or continue with email</span>
      </div>
    </div>
  )
}

const RESEND_COOLDOWN = 60

type LoginStep = 'form' | 'otp' | 'mfa' | 'forgot-email' | 'forgot-otp' | 'forgot-reset'
type RegStep = 'form' | 'otp'

// dir > 0: new content slides in from the right; dir < 0: from the left
const slideVariants = {
  enter: (dir: number) => ({ x: dir * 28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: -dir * 28, opacity: 0 }),
}
const slideTrans = { duration: 0.22, ease: 'easeInOut' as const }

export default function Login({ initialTab = 'login' }: { initialTab?: 'login' | 'register' }) {
  const navigate = useNavigate()
  const { setAuth, addWorkspace } = useAuthStore()

  // Tab & animation direction
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab)
  const [animDir, setAnimDir] = useState(1)

  // Login states
  const [loginStep, setLoginStep] = useState<LoginStep>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [tempToken, setTempToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotUserId, setForgotUserId] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [forgotResetToken, setForgotResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotCooldown, setForgotCooldown] = useState(0)

  // Register states
  const [regStep, setRegStep] = useState<RegStep>('form')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regUserId, setRegUserId] = useState('')
  const [regOtp, setRegOtp] = useState('')
  const [regOtpError, setRegOtpError] = useState('')
  const [regOtpLoading, setRegOtpLoading] = useState(false)
  const [regCooldown, setRegCooldown] = useState(0)

  // Google
  const [googleLoading, setGoogleLoading] = useState(false)

  // Cooldown timers
  useEffect(() => { if (loginStep === 'otp') setCooldown(RESEND_COOLDOWN) }, [loginStep])
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  useEffect(() => { if (loginStep === 'forgot-otp') setForgotCooldown(RESEND_COOLDOWN) }, [loginStep])
  useEffect(() => {
    if (forgotCooldown <= 0) return
    const t = setInterval(() => setForgotCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [forgotCooldown])

  useEffect(() => { if (regStep === 'otp') setRegCooldown(RESEND_COOLDOWN) }, [regStep])
  useEffect(() => {
    if (regCooldown <= 0) return
    const t = setInterval(() => setRegCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [regCooldown])

  function switchTab(tab: 'login' | 'register') {
    if (tab === activeTab) return
    setAnimDir(tab === 'register' ? 1 : -1)
    setActiveTab(tab)
    setLoginStep('form')
    setRegStep('form')
  }

  function go(step: LoginStep, dir = 1) { setAnimDir(dir); setLoginStep(step) }
  function goReg(step: RegStep, dir = 1) { setAnimDir(dir); setRegStep(step) }

  // Unique key drives AnimatePresence transitions
  const screenKey = activeTab === 'login' ? `l-${loginStep}` : `r-${regStep}`

  async function finishAuth(data: { user: { id: string; email: string }; accessToken: string; refreshToken: string; workspaces?: { id: string; name: string; slug: string; ownerId: string }[] }) {
    setAuth(data.user, data.accessToken, data.refreshToken, data.workspaces ?? [])
    const pendingInvite = sessionStorage.getItem('pendingInvite')
    if (pendingInvite) {
      try {
        const { data: inv } = await api.post(`/invite/${pendingInvite}/accept`)
        addWorkspace(inv.workspace)
        sessionStorage.removeItem('pendingInvite')
        navigate({ to: '/dashboard' })
        return
      } catch { sessionStorage.removeItem('pendingInvite') }
    }
    navigate({ to: (data.workspaces ?? []).length > 0 ? '/dashboard' : '/create-workspace' })
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async ({ access_token }) => {
      setGoogleLoading(true)
      try {
        const { data } = await api.post('/auth/google', { accessToken: access_token })
        await finishAuth(data)
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        toast.error(msg || 'Google sign-in failed')
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => toast.error('Google sign-in was cancelled'),
  })

  // ── Login handlers ──────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      if (data.requiresMfa) { setTempToken(data.tempToken); go('mfa'); return }
      await finishAuth(data)
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: string; requiresVerification?: boolean; userId?: string } } })?.response
      if (resp?.data?.requiresVerification && resp.data.userId) {
        setUserId(resp.data.userId); setMaskedEmail(email); go('otp'); return
      }
      setPassword(''); toast.error(resp?.data?.error || 'Invalid email or password')
    } finally { setFormLoading(false) }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) return
    setOtpError(''); setOtpLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { userId, otp })
      await finishAuth(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setOtpError(msg || 'Verification failed'); setOtp('')
    } finally { setOtpLoading(false) }
  }

  async function handleVerifyMfa(e: React.FormEvent) {
    e.preventDefault()
    const code = mfaCode.trim()
    if (!code) return
    setMfaError(''); setMfaLoading(true)
    try {
      const { data } = await api.post('/mfa/verify', { tempToken, code })
      await finishAuth(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setMfaError(msg || 'Invalid code'); setMfaCode('')
    } finally { setMfaLoading(false) }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setOtpError('')
    try {
      await api.post('/auth/resend-otp', { userId }); setCooldown(RESEND_COOLDOWN)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setOtpError(msg || 'Could not resend code')
    }
  }

  async function handleForgotRequest(e: React.FormEvent) {
    e.preventDefault()
    setForgotError(''); setForgotLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail })
      if (!data.userId) { setForgotError('If that email is registered, a code was sent. Check your inbox.'); return }
      setForgotUserId(data.userId); go('forgot-otp')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setForgotError(msg || 'Could not send reset code')
    } finally { setForgotLoading(false) }
  }

  async function handleForgotResend() {
    if (forgotCooldown > 0) return
    setForgotError('')
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail })
      if (data.userId) setForgotUserId(data.userId)
      setForgotCooldown(RESEND_COOLDOWN)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setForgotError(msg || 'Could not resend code')
    }
  }

  async function handleForgotVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (forgotOtp.length !== 6) return
    setForgotError(''); setForgotLoading(true)
    try {
      const { data } = await api.post('/auth/verify-forgot-otp', { userId: forgotUserId, otp: forgotOtp })
      setForgotResetToken(data.resetToken); go('forgot-reset')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setForgotError(msg || 'Verification failed'); setForgotOtp('')
    } finally { setForgotLoading(false) }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setForgotError('Passwords do not match'); return }
    setForgotError(''); setForgotLoading(true)
    try {
      await api.post('/auth/reset-password', { resetToken: forgotResetToken, newPassword })
      go('form', -1)
      setForgotEmail(''); setForgotUserId(''); setForgotOtp('')
      setForgotResetToken(''); setNewPassword(''); setConfirmPassword('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setForgotError(msg || 'Could not reset password')
    } finally { setForgotLoading(false) }
  }

  // ── Register handlers ────────────────────────────────────────────────────────

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError(''); setRegLoading(true)
    try {
      const { data } = await api.post('/auth/register', { email: regEmail, password: regPassword })
      setRegUserId(data.userId); goReg('otp')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setRegError(msg || 'Registration failed')
    } finally { setRegLoading(false) }
  }

  async function handleRegVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (regOtp.length !== 6) return
    setRegOtpError(''); setRegOtpLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { userId: regUserId, otp: regOtp })
      await finishAuth(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setRegOtpError(msg || 'Verification failed'); setRegOtp('')
    } finally { setRegOtpLoading(false) }
  }

  async function handleRegResend() {
    if (regCooldown > 0) return
    setRegOtpError('')
    try {
      await api.post('/auth/resend-otp', { userId: regUserId }); setRegCooldown(RESEND_COOLDOWN)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setRegOtpError(msg || 'Could not resend code')
    }
  }

  return (
    <AuthLayout>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

        {/* Static heading — never moves */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-[#09090b] dark:text-white">wdym</h1>
          <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">
            {activeTab === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Pill toggle — never moves */}
        <div className="flex bg-[#f4f4f5] dark:bg-[#111] rounded-full p-1 mb-6">
          <button
            type="button"
            onClick={() => switchTab('login')}
            className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              activeTab === 'login'
                ? 'bg-white dark:bg-[#1c1c1c] text-[#09090b] dark:text-white shadow-sm'
                : 'text-[#71717a] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchTab('register')}
            className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              activeTab === 'register'
                ? 'bg-white dark:bg-[#1c1c1c] text-[#09090b] dark:text-white shadow-sm'
                : 'text-[#71717a] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Animated form area */}
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={animDir}>
            <motion.div
              key={screenKey}
              custom={animDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTrans}
            >

              {/* ── Login: main form ─────────────────────────────────────── */}
              {activeTab === 'login' && loginStep === 'form' && (
                <>
                  <GoogleButton onClick={() => googleLogin()} loading={googleLoading} />
                  <Divider />
                  <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <Input id="email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
                    <div className="flex flex-col gap-1">
                      <Input id="password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
                      <button
                        type="button"
                        onClick={() => { setForgotEmail(email); setForgotError(''); go('forgot-email') }}
                        className="self-end text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Button type="submit" disabled={formLoading} className="mt-2">
                      {formLoading ? 'Signing in…' : 'Sign in →'}
                    </Button>
                  </form>
                </>
              )}

              {/* ── Login: email OTP ─────────────────────────────────────── */}
              {activeTab === 'login' && loginStep === 'otp' && (
                <>
                  <div className="mb-6">
                    <h2 className="text-base font-semibold text-[#09090b] dark:text-white">Verify your email</h2>
                    <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">
                      We sent a 6-digit code to <span className="text-[#09090b] dark:text-white">{maskedEmail}</span>
                    </p>
                  </div>
                  <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-[#71717a] dark:text-[#888] tracking-wide">Verification code</span>
                      <OtpBoxes onChange={setOtp} autoFocus />
                    </div>
                    {otpError && <p className="text-xs text-red-500">{otpError}</p>}
                    <Button type="submit" disabled={otpLoading || otp.length !== 6} className="mt-2">
                      {otpLoading ? 'Verifying…' : 'Verify email →'}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <button type="button" onClick={handleResend} disabled={cooldown > 0} className="text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </>
              )}

              {/* ── Login: MFA ───────────────────────────────────────────── */}
              {activeTab === 'login' && loginStep === 'mfa' && (
                <>
                  <div className="mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] dark:bg-[#fafafa] flex items-center justify-center mb-4">
                      <ShieldCheck size={18} className="text-white dark:text-black" />
                    </div>
                    <h2 className="text-base font-semibold text-[#09090b] dark:text-white">Two-factor auth</h2>
                    <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">Enter the 6-digit code from your authenticator app, or a backup code.</p>
                  </div>
                  <form onSubmit={handleVerifyMfa} className="flex flex-col gap-4">
                    <Input label="Authentication code" value={mfaCode} onChange={e => setMfaCode(e.target.value)} placeholder="000000 or XXXX-XXXX" autoComplete="one-time-code" autoFocus inputMode="numeric" />
                    {mfaError && <p className="text-xs text-red-500">{mfaError}</p>}
                    <Button type="submit" disabled={mfaLoading || !mfaCode.trim()} className="mt-2">
                      {mfaLoading ? 'Verifying…' : 'Continue →'}
                    </Button>
                  </form>
                  <button onClick={() => { go('form', -1); setTempToken(''); setMfaCode(''); setMfaError('') }} className="text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors mt-4 block mx-auto">
                    ← Back to login
                  </button>
                </>
              )}

              {/* ── Forgot: email entry ──────────────────────────────────── */}
              {activeTab === 'login' && loginStep === 'forgot-email' && (
                <>
                  <div className="mb-6">
                    <h2 className="text-base font-semibold text-[#09090b] dark:text-white">Reset password</h2>
                    <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">Enter your email and we'll send you a reset code.</p>
                  </div>
                  <form onSubmit={handleForgotRequest} className="flex flex-col gap-4">
                    <Input id="forgot-email" label="Email" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus required />
                    {forgotError && <p className="text-xs text-red-500">{forgotError}</p>}
                    <Button type="submit" disabled={forgotLoading} className="mt-2">
                      {forgotLoading ? 'Sending…' : 'Send reset code →'}
                    </Button>
                  </form>
                  <button onClick={() => { go('form', -1); setForgotError('') }} className="text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors mt-4 block mx-auto">
                    ← Back to login
                  </button>
                </>
              )}

              {/* ── Forgot: OTP ──────────────────────────────────────────── */}
              {activeTab === 'login' && loginStep === 'forgot-otp' && (
                <>
                  <div className="mb-6">
                    <h2 className="text-base font-semibold text-[#09090b] dark:text-white">Check your email</h2>
                    <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">
                      We sent a 6-digit code to <span className="text-[#09090b] dark:text-white">{forgotEmail}</span>
                    </p>
                  </div>
                  <form onSubmit={handleForgotVerifyOtp} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-[#71717a] dark:text-[#888] tracking-wide">Reset code</span>
                      <OtpBoxes onChange={setForgotOtp} autoFocus />
                    </div>
                    {forgotError && <p className="text-xs text-red-500">{forgotError}</p>}
                    <Button type="submit" disabled={forgotLoading || forgotOtp.length !== 6} className="mt-2">
                      {forgotLoading ? 'Verifying…' : 'Verify code →'}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <button type="button" onClick={handleForgotResend} disabled={forgotCooldown > 0} className="text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                      {forgotCooldown > 0 ? `Resend code in ${forgotCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                  <button onClick={() => { go('forgot-email', -1); setForgotError(''); setForgotOtp('') }} className="text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors mt-3 block mx-auto">
                    ← Back
                  </button>
                </>
              )}

              {/* ── Forgot: new password ─────────────────────────────────── */}
              {activeTab === 'login' && loginStep === 'forgot-reset' && (
                <>
                  <div className="mb-6">
                    <h2 className="text-base font-semibold text-[#09090b] dark:text-white">New password</h2>
                    <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">Choose a new password for your account.</p>
                  </div>
                  <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                    <Input id="new-password" label="New password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="8+ characters" autoComplete="new-password" minLength={8} autoFocus required />
                    <Input id="confirm-password" label="Confirm password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
                    {forgotError && <p className="text-xs text-red-500">{forgotError}</p>}
                    <Button type="submit" disabled={forgotLoading || !newPassword || !confirmPassword} className="mt-2">
                      {forgotLoading ? 'Saving…' : 'Set new password →'}
                    </Button>
                  </form>
                </>
              )}

              {/* ── Register: main form ──────────────────────────────────── */}
              {activeTab === 'register' && regStep === 'form' && (
                <>
                  <GoogleButton onClick={() => googleLogin()} loading={googleLoading} />
                  <Divider />
                  <form onSubmit={handleRegister} className="flex flex-col gap-4">
                    <Input id="reg-email" label="Email" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
                    <Input id="reg-password" label="Password" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="8+ characters" autoComplete="new-password" minLength={8} required />
                    {regError && <p className="text-xs text-red-500">{regError}</p>}
                    <Button type="submit" disabled={regLoading} className="mt-2">
                      {regLoading ? 'Creating account…' : 'Create account →'}
                    </Button>
                  </form>
                </>
              )}

              {/* ── Register: OTP ────────────────────────────────────────── */}
              {activeTab === 'register' && regStep === 'otp' && (
                <>
                  <div className="mb-6">
                    <h2 className="text-base font-semibold text-[#09090b] dark:text-white">Check your email</h2>
                    <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">
                      We sent a 6-digit code to <span className="text-[#09090b] dark:text-white">{regEmail}</span>
                    </p>
                  </div>
                  <form onSubmit={handleRegVerifyOtp} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-[#71717a] dark:text-[#888] tracking-wide">Verification code</span>
                      <OtpBoxes onChange={setRegOtp} autoFocus />
                    </div>
                    {regOtpError && <p className="text-xs text-red-500">{regOtpError}</p>}
                    <Button type="submit" disabled={regOtpLoading || regOtp.length !== 6} className="mt-2">
                      {regOtpLoading ? 'Verifying…' : 'Verify email →'}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <button type="button" onClick={handleRegResend} disabled={regCooldown > 0} className="text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                      {regCooldown > 0 ? `Resend code in ${regCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                  <button onClick={() => goReg('form', -1)} className="text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors mt-3 block mx-auto">
                    ← Back
                  </button>
                </>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </motion.div>
    </AuthLayout>
  )
}
