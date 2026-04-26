import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Trash2, UserMinus, Send, LogOut } from 'lucide-react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ThemeToggle } from '../components/ui/ThemeToggle'

interface Member {
  id: string
  userId: string
  email: string
  isOwner: boolean
}

interface PendingInvite {
  id: string
  email: string
  expiresAt: string
}

interface WorkspaceDetail {
  id: string
  name: string
  slug: string
  ownerId: string
  members: Member[]
  invites: PendingInvite[]
}

export default function WorkspaceSettings() {
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
      setInviteMsg({ type: 'ok', text: res.data.joined ? 'Member added directly.' : 'Invite sent.' })
      queryClient.invalidateQueries({ queryKey: ['workspace', workspace?.id] })
      setTimeout(() => setInviteMsg(null), 4000)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setInviteMsg({ type: 'err', text: msg || 'Failed to send invite' })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/workspaces/${workspace!.id}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace', workspace?.id] }),
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
    <div className="min-h-screen bg-white dark:bg-black text-[#09090b] dark:text-white">
      <header className="border-b border-[#f4f4f5] dark:border-[#111] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-1.5 text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
          </Link>
          <h1 className="text-sm font-semibold tracking-tight">Workspace settings</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="max-w-xl mx-auto px-6 py-12 flex flex-col gap-10">
        {/* Workspace name */}
        <section>
          <p className="text-xs text-[#a1a1aa] dark:text-[#555] uppercase tracking-wider mb-1">Workspace</p>
          <p className="text-lg font-semibold">{workspace?.name}</p>
        </section>

        {/* Members */}
        <section>
          <p className="text-xs text-[#a1a1aa] dark:text-[#555] uppercase tracking-wider mb-3">Members</p>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map(i => (
                <div key={i} className="h-10 rounded bg-[#fafafa] dark:bg-[#0a0a0a] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {data?.members.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-3 py-2 rounded border border-[#f4f4f5] dark:border-[#111]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm truncate">{m.email}</span>
                    {m.isOwner && (
                      <span className="text-[10px] text-[#a1a1aa] dark:text-[#555] border border-[#e4e4e7] dark:border-[#222] rounded px-1.5 py-0.5 shrink-0">
                        owner
                      </span>
                    )}
                  </div>
                  {!m.isOwner && (isOwner || m.userId === user?.id) && (
                    <button
                      onClick={() => removeMemberMutation.mutate(m.userId)}
                      disabled={removeMemberMutation.isPending}
                      className="p-1 text-[#a1a1aa] dark:text-[#555] hover:text-red-500 transition-colors shrink-0"
                      title={m.userId === user?.id ? 'Leave workspace' : 'Remove member'}
                    >
                      {m.userId === user?.id ? <LogOut size={13} /> : <UserMinus size={13} />}
                    </button>
                  )}
                </div>
              ))}

              {/* Pending invites */}
              {(data?.invites.length ?? 0) > 0 && (
                <>
                  <p className="text-[11px] text-[#a1a1aa] dark:text-[#555] mt-3 mb-1">Pending invites</p>
                  {data!.invites.map(inv => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between px-3 py-2 rounded border border-dashed border-[#e4e4e7] dark:border-[#222]"
                    >
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
          <p className="text-xs text-[#a1a1aa] dark:text-[#555] uppercase tracking-wider mb-3">Invite by email</p>
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
              <Send size={13} className="mr-1.5" />
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
          <section className="border border-red-200 dark:border-red-900/40 rounded-lg p-4">
            <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Danger zone</p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Delete workspace</p>
                <p className="text-xs text-[#a1a1aa] dark:text-[#555] mt-0.5">
                  {canDelete
                    ? 'Permanently removes this workspace and all its invites.'
                    : 'You cannot delete your only workspace.'}
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
      </main>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete workspace">
        <p className="text-sm text-[#71717a] dark:text-[#888] mb-6">
          This will permanently delete <span className="text-[#09090b] dark:text-white">{workspace?.name}</span> and remove all members. Surveys are not affected.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Button>
          <Button
            variant="danger"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex-1"
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete workspace'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
