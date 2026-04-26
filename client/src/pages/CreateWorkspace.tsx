import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Layers } from 'lucide-react'

export default function CreateWorkspace() {
  const navigate = useNavigate()
  const { addWorkspace } = useAuthStore()

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/workspaces', { name: name.trim() })
      addWorkspace(data)
      navigate({ to: '/dashboard' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Failed to create workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] dark:bg-[#fafafa] flex items-center justify-center mb-4">
            <Layers size={18} className="text-white dark:text-black" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[#09090b] dark:text-white">
            Create your workspace
          </h1>
          <p className="text-sm text-[#71717a] dark:text-[#555] mt-1">
            A workspace keeps your surveys organised.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="name"
            label="Workspace name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc."
            autoComplete="organization"
            autoFocus
            required
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" disabled={loading || !name.trim()} className="mt-2">
            {loading ? 'Creating…' : 'Create workspace →'}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
