import { useEffect, useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { OtpBoxes } from '../components/auth/OtpBoxes'

const RESEND_COOLDOWN = 60

type Step = 'form' | 'otp' | 'mfa'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth, addWorkspace } = useAuthStore()

  const [step, setStep] = useState<Step>('form')
  const [userId, setUserId] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')

  // form step
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // email-otp step
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // mfa step
  const [tempToken, setTempToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)

  useEffect(() => {
    if (step === 'otp') setCooldown(RESEND_COOLDOWN)
  }, [step])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })

      if (data.requiresMfa) {
        setTempToken(data.tempToken)
        setStep('mfa')
        return
      }

      await finishAuth(data)
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { error?: string; requiresVerification?: boolean; userId?: string } } })?.response
      if (resp?.data?.requiresVerification && resp.data.userId) {
        setUserId(resp.data.userId)
        setMaskedEmail(email)
        setStep('otp')
        return
      }
      setFormError(resp?.data?.error || 'Login failed')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) return
    setOtpError('')
    setOtpLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { userId, otp })
      await finishAuth(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setOtpError(msg || 'Verification failed')
      setOtp('')
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleVerifyMfa(e: React.FormEvent) {
    e.preventDefault()
    const code = mfaCode.trim()
    if (!code) return
    setMfaError('')
    setMfaLoading(true)
    try {
      const { data } = await api.post('/mfa/verify', { tempToken, code })
      await finishAuth(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setMfaError(msg || 'Invalid code')
      setMfaCode('')
    } finally {
      setMfaLoading(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setOtpError('')
    try {
      await api.post('/auth/resend-otp', { userId })
      setCooldown(RESEND_COOLDOWN)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setOtpError(msg || 'Could not resend code')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8">
                <h1 className="text-xl font-semibold tracking-tight text-[#09090b] dark:text-white">wdym</h1>
                <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">Sign in to your account</p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <Input id="email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
                <Input id="password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
                {formError && <p className="text-xs text-red-500">{formError}</p>}
                <Button type="submit" disabled={formLoading} className="mt-2">
                  {formLoading ? 'Signing in…' : 'Sign in →'}
                </Button>
              </form>

              <p className="text-xs text-[#a1a1aa] dark:text-[#555] mt-6 text-center">
                No account?{' '}
                <Link to="/register" className="text-[#09090b] dark:text-white hover:underline">Register</Link>
              </p>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8">
                <h1 className="text-xl font-semibold tracking-tight text-[#09090b] dark:text-white">Verify your email</h1>
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

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  className="text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'mfa' && (
            <motion.div
              key="mfa"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8">
                <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] dark:bg-[#fafafa] flex items-center justify-center mb-4">
                  <ShieldCheck size={18} className="text-white dark:text-black" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight text-[#09090b] dark:text-white">Two-factor auth</h1>
                <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">
                  Enter the 6-digit code from your authenticator app, or a backup code.
                </p>
              </div>

              <form onSubmit={handleVerifyMfa} className="flex flex-col gap-4">
                <Input
                  label="Authentication code"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  placeholder="000000 or XXXX-XXXX"
                  autoComplete="one-time-code"
                  autoFocus
                  inputMode="numeric"
                />
                {mfaError && <p className="text-xs text-red-500">{mfaError}</p>}
                <Button type="submit" disabled={mfaLoading || !mfaCode.trim()} className="mt-2">
                  {mfaLoading ? 'Verifying…' : 'Continue →'}
                </Button>
              </form>

              <button
                onClick={() => { setStep('form'); setTempToken(''); setMfaCode(''); setMfaError('') }}
                className="text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors mt-6 block mx-auto"
              >
                ← Back to login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
