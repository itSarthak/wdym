import { useEffect, useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { OtpBoxes } from '../components/auth/OtpBoxes'

const RESEND_COOLDOWN = 60

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [userId, setUserId] = useState('')

  // form step
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // otp step
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (step === 'otp') setCooldown(RESEND_COOLDOWN)
  }, [step])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)
    try {
      const { data } = await api.post('/auth/register', { email, password })
      setUserId(data.userId)
      setStep('otp')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setFormError(msg || 'Registration failed')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) return
    setOtpError('')
    setOtpLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { userId, otp })
      setAuth(data.user, data.accessToken, data.refreshToken)
      navigate({ to: '/dashboard' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setOtpError(msg || 'Verification failed')
      setOtp('')
    } finally {
      setOtpLoading(false)
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
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8">
                <h1 className="text-xl font-semibold tracking-tight text-[#09090b] dark:text-white">wdym</h1>
                <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">Create your account</p>
              </div>

              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                <Input
                  id="password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                {formError && <p className="text-xs text-red-500">{formError}</p>}
                <Button type="submit" disabled={formLoading} className="mt-2">
                  {formLoading ? 'Creating account…' : 'Create account →'}
                </Button>
              </form>

              <p className="text-xs text-[#a1a1aa] dark:text-[#555] mt-6 text-center">
                Already have an account?{' '}
                <Link to="/login" className="text-[#09090b] dark:text-white hover:underline">
                  Sign in
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8">
                <h1 className="text-xl font-semibold tracking-tight text-[#09090b] dark:text-white">Check your email</h1>
                <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">
                  We sent a 6-digit code to <span className="text-[#09090b] dark:text-white">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerify} className="flex flex-col gap-4">
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
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
