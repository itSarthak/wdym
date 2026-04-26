import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Layers, Loader } from 'lucide-react'
import { api, publicApi } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Button } from '../components/ui/Button'

interface InviteInfo {
  workspaceId: string
  workspaceName: string
  email: string
}

export default function InviteAccept() {
  const { token } = useParams({ from: '/invite/$token' })
  const navigate = useNavigate()
  const { accessToken, addWorkspace } = useAuthStore()

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    publicApi.get(`/invite/${token}`)
      .then(r => setInfo(r.data))
      .catch(err => {
        const msg = err?.response?.data?.error
        setError(msg || 'This invite is invalid or has expired.')
      })
  }, [token])

  async function handleAccept() {
    setAccepting(true)
    try {
      const { data } = await api.post(`/invite/${token}/accept`)
      addWorkspace(data.workspace)
      navigate({ to: '/dashboard' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  function handleRedirectToAuth(path: '/login' | '/register') {
    sessionStorage.setItem('pendingInvite', token)
    navigate({ to: path })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4">
      <motion.div
        className="w-full max-w-sm text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {!info && !error && (
          <Loader size={20} className="animate-spin text-[#a1a1aa] mx-auto" />
        )}

        {error && (
          <>
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <Link to="/login" className="text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors">
              Go to login
            </Link>
          </>
        )}

        {info && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-[#0a0a0a] dark:bg-[#fafafa] flex items-center justify-center mx-auto mb-6">
              <Layers size={20} className="text-white dark:text-black" />
            </div>
            <h1 className="text-xl font-semibold text-[#09090b] dark:text-white mb-2">
              Join {info.workspaceName}
            </h1>
            <p className="text-sm text-[#71717a] dark:text-[#555] mb-8">
              You've been invited to collaborate on <span className="text-[#09090b] dark:text-white">{info.workspaceName}</span>.
            </p>

            {accessToken ? (
              <Button onClick={handleAccept} disabled={accepting} className="w-full">
                {accepting ? 'Joining…' : 'Accept invitation →'}
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <Button onClick={() => handleRedirectToAuth('/register')} className="w-full">
                  Create account to join →
                </Button>
                <button
                  onClick={() => handleRedirectToAuth('/login')}
                  className="text-sm text-[#71717a] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
                >
                  Already have an account? Sign in
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
