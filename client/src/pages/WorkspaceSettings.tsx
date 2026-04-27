import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Layers, User, Palette, Shield, Bell,
  Trash2, UserMinus, Send, LogOut, Sun, Moon, Check,
  Eye, EyeOff, ShieldCheck, ShieldOff, Copy, CheckCheck,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { useThemeStore, applyTheme } from '../store/theme'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'workspace' | 'profile' | 'appearance' | 'security' | 'notifications'

interface Member { id: string; userId: string; email: string; isOwner: boolean }
interface PendingInvite { id: string; email: string; expiresAt: string }
interface WorkspaceDetail {
  id: string; name: string; slug: string; ownerId: string
  members: Member[]; invites: PendingInvite[]
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'workspace',     label: 'Workspace',     icon: <Layers size={14} /> },
  { id: 'profile',       label: 'Profile',        icon: <User size={14} /> },
  { id: 'appearance',    label: 'Appearance',     icon: <Palette size={14} /> },
  { id: 'security',      label: 'Security',       icon: <Shield size={14} /> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell size={14} /> },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkspaceSettings() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('workspace')

  return (
    <div className="min-h-screen bg-white dark:bg-black text-[#09090b] dark:text-white">
      {/* Header */}
      <header className="border-b border-[#f4f4f5] dark:border-[#111] px-6 py-4 flex items-center gap-3">
        <Link
          to="/dashboard"
          className="p-1.5 text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
        </Link>
        <h1 className="text-sm font-semibold tracking-tight">Settings</h1>
      </header>

      <div className="flex flex-col md:flex-row max-w-4xl mx-auto px-0 md:px-6 py-0 md:py-10 gap-0 md:gap-8">
        {/* Sidebar — horizontal scroll on mobile, vertical on md+ */}
        <nav className="md:w-44 shrink-0">
          {/* Mobile: horizontal tab strip */}
          <div className="flex md:hidden overflow-x-auto border-b border-[#f4f4f5] dark:border-[#111] px-4 gap-1 scrollbar-hide">
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-xs font-medium border-b-2 transition-colors ${
                  tab === item.id
                    ? 'border-[#09090b] dark:border-white text-[#09090b] dark:text-white'
                    : 'border-transparent text-[#71717a] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop: vertical list */}
          <div className="hidden md:flex flex-col gap-0.5 pt-1">
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  tab === item.id
                    ? 'bg-[#f4f4f5] dark:bg-[#111] text-[#09090b] dark:text-white font-medium'
                    : 'text-[#71717a] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 px-6 md:px-0 py-8 md:py-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {tab === 'workspace'     && <WorkspaceTab />}
              {tab === 'profile'       && <ProfileTab />}
              {tab === 'appearance'    && <AppearanceTab />}
              {tab === 'security'      && <SecurityTab />}
              {tab === 'notifications' && <NotificationsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// ─── Workspace tab ────────────────────────────────────────────────────────────

function WorkspaceTab() {
  const navigate = useNavigate()
  const { user, workspace, workspaces, removeWorkspace } = useAuthStore()
  const queryClient = useQueryClient()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data, isLoading } = useQuery<WorkspaceDetail>({
    queryKey: ['workspace', workspace?.id],
    queryFn: () => api.get(`/workspaces/${workspace!.id}`).then(r => r.data),
    enabled: !!workspace,
  })

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.post(`/workspaces/${workspace!.id}/invite`, { email }),
    onSuccess: (res) => {
      setInviteEmail('')
      setInviteMsg({ type: 'ok', text: res.data.joined ? 'Member added.' : 'Invite sent.' })
      queryClient.invalidateQueries({ queryKey: ['workspace', workspace?.id] })
      setTimeout(() => setInviteMsg(null), 4000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setInviteMsg({ type: 'err', text: msg || 'Failed to send invite' })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/workspaces/${workspace!.id}/members/${userId}`),
    onSuccess: (_, userId) => {
      if (userId === user?.id) {
        removeWorkspace(workspace!.id)
        navigate({ to: workspaces.filter(w => w.id !== workspace?.id).length > 0 ? '/dashboard' : '/create-workspace' })
      } else {
        queryClient.invalidateQueries({ queryKey: ['workspace', workspace?.id] })
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/workspaces/${workspace!.id}`),
    onSuccess: () => {
      removeWorkspace(workspace!.id)
      navigate({ to: workspaces.filter(w => w.id !== workspace?.id).length > 0 ? '/dashboard' : '/create-workspace' })
    },
  })

  const isOwner = data?.ownerId === user?.id
  const canDelete = isOwner && workspaces.length > 1

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-base font-semibold mb-0.5">Workspace</h2>
        <p className="text-sm text-[#71717a] dark:text-[#555]">{workspace?.name}</p>
      </div>

      {/* Members */}
      <section>
        <p className="text-xs font-medium text-[#a1a1aa] dark:text-[#555] uppercase tracking-wider mb-3">Members</p>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map(i => <div key={i} className="h-10 rounded bg-[#fafafa] dark:bg-[#0a0a0a] animate-pulse" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {data?.members.map(m => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded border border-[#f4f4f5] dark:border-[#111]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm truncate">{m.email}</span>
                  {m.isOwner && (
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#555] border border-[#e4e4e7] dark:border-[#222] rounded px-1.5 py-0.5 shrink-0">owner</span>
                  )}
                </div>
                {!m.isOwner && (isOwner || m.userId === user?.id) && (
                  <button
                    onClick={() => removeMutation.mutate(m.userId)}
                    disabled={removeMutation.isPending}
                    className="p-1 text-[#a1a1aa] dark:text-[#555] hover:text-red-500 transition-colors shrink-0"
                    title={m.userId === user?.id ? 'Leave' : 'Remove'}
                  >
                    {m.userId === user?.id ? <LogOut size={13} /> : <UserMinus size={13} />}
                  </button>
                )}
              </div>
            ))}

            {(data?.invites.length ?? 0) > 0 && (
              <>
                <p className="text-[11px] text-[#a1a1aa] dark:text-[#555] mt-2 mb-1">Pending invites</p>
                {data!.invites.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between px-3 py-2 rounded border border-dashed border-[#e4e4e7] dark:border-[#222]">
                    <span className="text-sm text-[#71717a] dark:text-[#888]">{inv.email}</span>
                    <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">pending</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* Invite */}
      <section>
        <p className="text-xs font-medium text-[#a1a1aa] dark:text-[#555] uppercase tracking-wider mb-3">Invite by email</p>
        <form
          onSubmit={e => { e.preventDefault(); if (inviteEmail.trim()) inviteMutation.mutate(inviteEmail.trim()) }}
          className="flex gap-2"
        >
          <Input
            value={inviteEmail}
            onChange={e => { setInviteEmail(e.target.value); setInviteMsg(null) }}
            placeholder="colleague@company.com"
            type="email"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={inviteMutation.isPending || !inviteEmail.trim()}>
            <Send size={12} className="mr-1.5" />
            {inviteMutation.isPending ? 'Sending…' : 'Invite'}
          </Button>
        </form>
        {inviteMsg && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-xs mt-2 ${inviteMsg.type === 'ok' ? 'text-green-500' : 'text-red-500'}`}
          >
            {inviteMsg.text}
          </motion.p>
        )}
      </section>

      {/* Danger zone */}
      {isOwner && (
        <section className="border border-red-200 dark:border-red-900/30 rounded-lg p-4">
          <p className="text-xs font-medium text-red-500 uppercase tracking-wider mb-3">Danger zone</p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Delete workspace</p>
              <p className="text-xs text-[#a1a1aa] dark:text-[#555] mt-0.5">
                {canDelete
                  ? 'Permanently removes this workspace. Surveys are not deleted.'
                  : 'You cannot delete your only workspace. Create another one first.'}
              </p>
            </div>
            <button
              onClick={() => setDeleteOpen(true)}
              disabled={!canDelete}
              className="shrink-0 flex items-center gap-1.5 text-xs text-red-500 border border-red-200 dark:border-red-900/40 rounded px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </section>
      )}

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete workspace">
        <p className="text-sm text-[#71717a] dark:text-[#888] mb-6">
          This will permanently delete <span className="text-[#09090b] dark:text-white">{workspace?.name}</span>. All members will lose access. Surveys are not affected.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="flex-1">
            {deleteMutation.isPending ? 'Deleting…' : 'Delete workspace'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user } = useAuthStore()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold mb-0.5">Profile</h2>
        <p className="text-sm text-[#71717a] dark:text-[#555]">Your account information.</p>
      </div>

      <div className="w-14 h-14 rounded-2xl bg-[#f4f4f5] dark:bg-[#111] flex items-center justify-center">
        <span className="text-xl font-semibold text-[#a1a1aa] dark:text-[#555]">
          {user?.email?.[0]?.toUpperCase() ?? '?'}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-[#a1a1aa] dark:text-[#555] uppercase tracking-wider">Email</p>
          <p className="text-sm border border-[#f4f4f5] dark:border-[#111] rounded px-3 py-2 text-[#71717a] dark:text-[#888] bg-[#fafafa] dark:bg-[#0a0a0a]">
            {user?.email}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Appearance tab ───────────────────────────────────────────────────────────

function AppearanceTab() {
  const { theme, set } = useThemeStore()

  function pick(t: 'dark' | 'light') {
    set(t)
    applyTheme(t)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold mb-0.5">Appearance</h2>
        <p className="text-sm text-[#71717a] dark:text-[#555]">Choose how wdym looks for you.</p>
      </div>

      <div>
        <p className="text-xs font-medium text-[#a1a1aa] dark:text-[#555] uppercase tracking-wider mb-3">Theme</p>
        <div className="flex gap-3">
          {/* Dark card */}
          <button
            onClick={() => pick('dark')}
            className={`relative flex-1 max-w-[160px] rounded-xl border-2 overflow-hidden transition-all ${
              theme === 'dark' ? 'border-[#09090b] dark:border-white' : 'border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#444]'
            }`}
          >
            <div className="bg-black p-4 h-24 flex flex-col justify-end gap-1.5">
              <div className="h-1.5 w-3/4 rounded bg-[#222]" />
              <div className="h-1.5 w-1/2 rounded bg-[#222]" />
              <div className="h-5 w-full rounded bg-[#111] mt-1" />
            </div>
            <div className="bg-[#0a0a0a] px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-white font-medium">
                <Moon size={11} /> Dark
              </div>
              {theme === 'dark' && <Check size={11} className="text-white" />}
            </div>
          </button>

          {/* Light card */}
          <button
            onClick={() => pick('light')}
            className={`relative flex-1 max-w-[160px] rounded-xl border-2 overflow-hidden transition-all ${
              theme === 'light' ? 'border-[#09090b] dark:border-white' : 'border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#444]'
            }`}
          >
            <div className="bg-white p-4 h-24 flex flex-col justify-end gap-1.5">
              <div className="h-1.5 w-3/4 rounded bg-[#e4e4e7]" />
              <div className="h-1.5 w-1/2 rounded bg-[#e4e4e7]" />
              <div className="h-5 w-full rounded bg-[#f4f4f5] mt-1" />
            </div>
            <div className="bg-[#fafafa] px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-[#09090b] font-medium">
                <Sun size={11} /> Light
              </div>
              {theme === 'light' && <Check size={11} className="text-[#09090b]" />}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Security tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const qc = useQueryClient()

  // Password change state
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  // MFA setup state
  const [setupOpen, setSetupOpen] = useState(false)
  const [setupData, setSetupData] = useState<{ qrCode: string; secret: string } | null>(null)
  const [setupCode, setSetupCode] = useState('')
  const [setupError, setSetupError] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [copied, setCopied] = useState(false)

  // MFA disable state
  const [disableOpen, setDisableOpen] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)

  const { data: mfaStatus, isLoading: mfaLoading } = useQuery<{ enabled: boolean; backupCodesRemaining: number }>({
    queryKey: ['mfa-status'],
    queryFn: () => api.get('/mfa/status').then(r => r.data),
  })

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) { setPwMsg({ type: 'err', text: 'New passwords do not match' }); return }
    setPwMsg(null); setPwLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next })
      setPwMsg({ type: 'ok', text: 'Password updated successfully.' })
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setPwMsg({ type: 'err', text: m || 'Failed to update password' })
    } finally { setPwLoading(false) }
  }

  async function openSetup() {
    setSetupOpen(true)
    setSetupData(null)
    setSetupCode('')
    setSetupError('')
    try {
      const { data } = await api.post('/mfa/setup')
      setSetupData(data)
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setSetupError(m || 'Failed to start MFA setup')
    }
  }

  async function handleVerifySetup(e: React.FormEvent) {
    e.preventDefault()
    if (setupCode.length !== 6) return
    setSetupError(''); setSetupLoading(true)
    try {
      const { data } = await api.post('/mfa/verify-setup', { code: setupCode })
      setBackupCodes(data.backupCodes)
      qc.invalidateQueries({ queryKey: ['mfa-status'] })
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setSetupError(m || 'Invalid code')
      setSetupCode('')
    } finally { setSetupLoading(false) }
  }

  function closeSetup() {
    setSetupOpen(false)
    setSetupData(null)
    setSetupCode('')
    setSetupError('')
    setBackupCodes(null)
    setCopied(false)
  }

  function copyBackupCodes() {
    if (!backupCodes) return
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault()
    setDisableError(''); setDisableLoading(true)
    try {
      await api.post('/mfa/disable', { code: disableCode })
      setDisableOpen(false)
      setDisableCode('')
      qc.invalidateQueries({ queryKey: ['mfa-status'] })
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setDisableError(m || 'Invalid code')
    } finally { setDisableLoading(false) }
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-base font-semibold mb-0.5">Security</h2>
        <p className="text-sm text-[#71717a] dark:text-[#555]">Manage your password and two-factor authentication.</p>
      </div>

      {/* Two-factor auth */}
      <section>
        <p className="text-xs font-medium text-[#a1a1aa] dark:text-[#555] uppercase tracking-wider mb-4">Two-factor authentication</p>
        {mfaLoading ? (
          <div className="h-16 rounded bg-[#fafafa] dark:bg-[#0a0a0a] animate-pulse" />
        ) : (
          <div className="border border-[#f4f4f5] dark:border-[#111] rounded-lg p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${mfaStatus?.enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-[#f4f4f5] dark:bg-[#111]'}`}>
                {mfaStatus?.enabled
                  ? <ShieldCheck size={14} className="text-green-600 dark:text-green-400" />
                  : <ShieldOff size={14} className="text-[#a1a1aa] dark:text-[#555]" />
                }
              </div>
              <div>
                <p className="text-sm font-medium">Authenticator app</p>
                {mfaStatus?.enabled ? (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    Enabled · {mfaStatus.backupCodesRemaining} backup code{mfaStatus.backupCodesRemaining !== 1 ? 's' : ''} remaining
                  </p>
                ) : (
                  <p className="text-xs text-[#a1a1aa] dark:text-[#555] mt-0.5">Not enabled. Use Google Authenticator, Authy, or any TOTP app.</p>
                )}
              </div>
            </div>
            {mfaStatus?.enabled ? (
              <button
                onClick={() => { setDisableOpen(true); setDisableCode(''); setDisableError('') }}
                className="shrink-0 text-xs text-red-500 border border-red-200 dark:border-red-900/40 rounded px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Disable
              </button>
            ) : (
              <Button size="sm" onClick={openSetup}>Enable</Button>
            )}
          </div>
        )}
      </section>

      {/* Password change */}
      <section>
        <p className="text-xs font-medium text-[#a1a1aa] dark:text-[#555] uppercase tracking-wider mb-4">Change password</p>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 max-w-sm">
          <div className="relative">
            <Input label="Current password" type={showCurrent ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)} placeholder="••••••••" required />
            <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute right-3 top-[30px] text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors">
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="relative">
            <Input label="New password" type={showNext ? 'text' : 'password'} value={next} onChange={e => setNext(e.target.value)} placeholder="8+ characters" required minLength={8} />
            <button type="button" onClick={() => setShowNext(s => !s)} className="absolute right-3 top-[30px] text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors">
              {showNext ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Input label="Confirm new password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" required />
          {pwMsg && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-xs ${pwMsg.type === 'ok' ? 'text-green-500' : 'text-red-500'}`}>
              {pwMsg.text}
            </motion.p>
          )}
          <Button type="submit" disabled={pwLoading || !current || !next || !confirm} className="self-start">
            {pwLoading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </section>

      {/* MFA Setup modal */}
      <Modal open={setupOpen} onClose={closeSetup} title={backupCodes ? 'Save your backup codes' : 'Set up authenticator'}>
        {backupCodes ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#71717a] dark:text-[#888]">
              MFA is now enabled. Save these backup codes somewhere safe — they won't be shown again. Each code can only be used once.
            </p>
            <div className="bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#f4f4f5] dark:border-[#111] rounded-lg p-4 grid grid-cols-2 gap-1.5">
              {backupCodes.map(code => (
                <code key={code} className="text-sm font-mono text-[#09090b] dark:text-white tracking-wider">{code}</code>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyBackupCodes}
                className="flex items-center gap-1.5 text-xs text-[#71717a] dark:text-[#888] border border-[#e4e4e7] dark:border-[#222] rounded px-3 py-1.5 hover:border-[#a1a1aa] transition-colors"
              >
                {copied ? <CheckCheck size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy all'}
              </button>
              <Button onClick={closeSetup} className="flex-1">Done →</Button>
            </div>
          </div>
        ) : !setupData ? (
          <div className="flex items-center justify-center py-8">
            {setupError
              ? <p className="text-sm text-red-500">{setupError}</p>
              : <div className="w-5 h-5 border-2 border-[#e4e4e7] dark:border-[#333] border-t-[#09090b] dark:border-t-white rounded-full animate-spin" />
            }
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-[#71717a] dark:text-[#888]">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code below.
            </p>
            <div className="flex flex-col items-center gap-3">
              <img src={setupData.qrCode} alt="MFA QR code" className="w-44 h-44 rounded-lg bg-white p-2" />
              <p className="text-xs text-[#a1a1aa] dark:text-[#555]">Can't scan? Enter this key manually:</p>
              <code className="text-xs font-mono bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#f4f4f5] dark:border-[#111] rounded px-3 py-1.5 break-all text-center text-[#09090b] dark:text-white">
                {setupData.secret}
              </code>
            </div>
            <form onSubmit={handleVerifySetup} className="flex flex-col gap-3">
              <Input
                label="Verify — enter the 6-digit code from the app"
                value={setupCode}
                onChange={e => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoFocus
              />
              {setupError && <p className="text-xs text-red-500">{setupError}</p>}
              <Button type="submit" disabled={setupLoading || setupCode.length !== 6}>
                {setupLoading ? 'Verifying…' : 'Enable MFA →'}
              </Button>
            </form>
          </div>
        )}
      </Modal>

      {/* MFA Disable modal */}
      <Modal open={disableOpen} onClose={() => setDisableOpen(false)} title="Disable two-factor auth">
        <form onSubmit={handleDisable} className="flex flex-col gap-4">
          <p className="text-sm text-[#71717a] dark:text-[#888]">
            Enter the current code from your authenticator app to confirm.
          </p>
          <Input
            label="Authenticator code"
            value={disableCode}
            onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            autoFocus
          />
          {disableError && <p className="text-xs text-red-500">{disableError}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" type="button" onClick={() => setDisableOpen(false)} className="flex-1">Cancel</Button>
            <Button variant="danger" type="submit" disabled={disableLoading || disableCode.length !== 6} className="flex-1">
              {disableLoading ? 'Disabling…' : 'Disable MFA'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Notifications tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold mb-0.5">Notifications</h2>
        <p className="text-sm text-[#71717a] dark:text-[#555]">Control when and how you hear from us.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-10 h-10 rounded-xl bg-[#f4f4f5] dark:bg-[#111] flex items-center justify-center">
          <Bell size={16} className="text-[#a1a1aa] dark:text-[#555]" />
        </div>
        <p className="text-sm text-[#a1a1aa] dark:text-[#555]">Notification preferences coming soon.</p>
      </div>
    </div>
  )
}
