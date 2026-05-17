import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, Copy, Loader2, Sparkles, Settings2, X,
  LayoutGrid, SlidersHorizontal, Radio, Play, Download, Code2,
  ExternalLink, Globe, GlobeLock, FileJson, FileText, QrCode,
  Bell, BarChart2, Clock, ChevronRight, Plus, MoreHorizontal, ArrowUp,
  Upload, Lock,
} from 'lucide-react'
import Papa from 'papaparse'
import { api } from '../lib/api'
import { useBuilderStore, BlockNode, SurveySettings, BlockType, defaultConfig } from '../store/builder'
import { DragCanvas } from '../components/builder/DragCanvas'
import { MobileBlockList } from '../components/builder/BlockPalette'
import { Button } from '../components/ui/Button'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { debounce } from '../lib/utils'
import { useIsMobile } from '../lib/useIsMobile'
import type { Edge, Node } from '@xyflow/react'

type Provider = 'gemini' | 'anthropic'
type ActivePanel = 'settings' | 'generate' | 'publish' | null
type SettingsTab = 'survey' | 'canvas'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  changes?: { added: number; removed: number; modified: number }
  loading?: boolean
  error?: string
}

interface SurveyData {
  id: string; title: string; blocks: BlockNode[]; edges: Edge[]
  published: boolean; slug: string; publishedAt?: string; settings?: SurveySettings
}

const PROVIDERS: { id: Provider; label: string; sub: string }[] = [
  { id: 'gemini', label: 'Gemini', sub: 'gemini-2.0-flash' },
  { id: 'anthropic', label: 'Claude', sub: 'claude-sonnet-4-5' },
]

const EXAMPLES = [
  'Customer satisfaction survey with NPS. Branch on score: promoters get a "what do you love?" question, detractors get "how can we improve?". End with a thank you.',
  'Employee onboarding feedback with a matrix rating tools, process, and team culture. Add an open text field for suggestions at the end.',
  'Product market fit survey: ask role, company size, how they found us, then how disappointed they would be if we shut down (multiple choice), then a follow-up open question.',
]

// ── Bottom-sheet wrapper (mobile only) ────────────────

function BottomSheet({
  open,
  onClose,
  title,
  children,
  fullHeight = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  fullHeight?: boolean
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`absolute bottom-0 left-0 right-0 bg-[#fafafa] dark:bg-[#0a0a0a] border-t border-[#e4e4e7] dark:border-[#1a1a1a] flex flex-col z-50 rounded-t-2xl ${fullHeight ? 'max-h-[90vh]' : 'max-h-[70vh]'}`}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#e4e4e7] dark:bg-[#333]" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e4e4e7] dark:border-[#1a1a1a] shrink-0">
              <span className="text-xs font-medium uppercase tracking-widest text-[#71717a] dark:text-[#888]">{title}</span>
              <button onClick={onClose} className="text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Mobile overflow menu ───────────────────────────────

function MobileOverflowMenu({
  open,
  onClose,
  isPublished,
  publishPending,
  unpublishPending,
  onSettings,
  onGenerate,
  onPublish,
  onPreview,
}: {
  open: boolean
  onClose: () => void
  isPublished: boolean
  publishPending: boolean
  unpublishPending: boolean
  onSettings: () => void
  onGenerate: () => void
  onPublish: () => void
  onPreview: () => void
}) {
  const items = [
    { icon: Settings2, label: 'Settings', action: onSettings },
    { icon: Sparkles, label: 'Generate with AI', action: onGenerate },
    { icon: Play, label: 'Preview', action: onPreview },
    {
      icon: isPublished ? GlobeLock : Radio,
      label: isPublished ? 'Publish settings' : 'Publish →',
      action: onPublish,
      highlight: isPublished,
    },
  ]

  return (
    <BottomSheet open={open} onClose={onClose} title="Actions">
      <div className="flex flex-col gap-0.5 py-2">
        {items.map(({ icon: Icon, label, action, highlight }) => (
          <button
            key={label}
            onClick={() => { action(); onClose() }}
            disabled={publishPending || unpublishPending}
            className={`flex items-center gap-3 px-4 py-3.5 text-sm transition-colors w-full text-left disabled:opacity-50 hover:bg-[#f4f4f5] dark:hover:bg-[#111] ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#09090b] dark:text-white'}`}
          >
            <Icon size={14} className="shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

export default function Builder() {
  const { id } = useParams({ from: '/builder/$id' })
  return <BuilderContent id={id} />
}

function BuilderContent({ id }: { id: string }) {
  const navigate = useNavigate()
  const store = useBuilderStore()
  const isMobile = useIsMobile()

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [embedModalOpen, setEmbedModalOpen] = useState(false)
  const [surveySlug, setSurveySlug] = useState<string | null>(null)
  const [titleEditing, setTitleEditing] = useState(false)

  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [panelWidth, setPanelWidth] = useState(320)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('survey')

  const [mobileMenu, setMobileMenu] = useState(false)
  const [mobileBlocks, setMobileBlocks] = useState(false)
  const [mobileSheet, setMobileSheet] = useState<ActivePanel>(null)
  const [mobileSettingsTab, setMobileSettingsTab] = useState<SettingsTab>('survey')

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatProvider, setChatProvider] = useState<Provider>(
    () => (localStorage.getItem('wdym:generate:provider') as Provider) ?? 'gemini'
  )
  const [chatLoading, setChatLoading] = useState(false)

  const loaded = useRef(false)
  const panelResizing = useRef(false)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)
  const addBlockRef = useRef<((type: BlockType) => void) | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        if (isMobile) setMobileSheet((p) => p === 'generate' ? null : 'generate')
        else setActivePanel((prev) => (prev === 'generate' ? null : 'generate'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobile])

  const { data: surveyData, isLoading } = useQuery<SurveyData>({
    queryKey: ['survey', id],
    queryFn: () => api.get(`/surveys/${id}`).then((r) => r.data),
  })

  useEffect(() => {
    if (surveyData && !loaded.current) {
      loaded.current = true
      store.loadSurvey(surveyData.blocks ?? [], surveyData.edges ?? [], surveyData.title, surveyData.settings)
      setIsPublished(surveyData.published)
      setSurveySlug(surveyData.slug)
      if (surveyData.published) {
        setPublishedUrl(`/s/${surveyData.slug}`)
        setPublishedAt(surveyData.publishedAt ?? null)
      }
      const hymnPrompt = sessionStorage.getItem(`hymn:${id}`)
      if (hymnPrompt) {
        sessionStorage.removeItem(`hymn:${id}`)
        setActivePanel('generate')
        setTimeout(() => handleChatSend(hymnPrompt), 150)
      }
    }
  }, [surveyData, store])

  const saveMutation = useMutation({
    mutationFn: (payload: { title: string; blocks: unknown; edges: unknown; settings: unknown }) =>
      api.patch(`/surveys/${id}`, payload),
    onMutate: () => setSaveStatus('saving'),
    onSettled: () => {
      setSaveStatus('saved')
      store.markClean()
      setTimeout(() => setSaveStatus('idle'), 2000)
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => api.post(`/surveys/${id}/publish`),
    onSuccess: (res) => {
      setPublishedUrl(res.data.url)
      setIsPublished(true)
      setPublishedAt(new Date().toISOString())
      if (!surveySlug) setSurveySlug(res.data.url.replace('/s/', ''))
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: () => api.post(`/surveys/${id}/unpublish`),
    onSuccess: () => setIsPublished(false),
  })

  const saveMutateRef = useRef(saveMutation.mutate)
  saveMutateRef.current = saveMutation.mutate

  const debouncedSave = useRef(
    debounce(() => {
      const { nodes, edges, title, settings } = useBuilderStore.getState()
      saveMutateRef.current({ title, blocks: nodes, edges, settings })
    }, 1500)
  ).current

  useEffect(() => {
    if (store.isDirty) debouncedSave()
  }, [store.isDirty, store.nodes, store.edges, store.title, store.settings, debouncedSave])

  function copyLink() {
    if (!publishedUrl) return
    navigator.clipboard.writeText(window.location.origin + publishedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyEmbed() {
    if (!publishedUrl) return
    const src = window.location.origin + publishedUrl
    const code = `<iframe src="${src}" width="100%" height="600" frameborder="0" style="border:none;"></iframe>`
    navigator.clipboard.writeText(code)
    setCopiedEmbed(true)
    setTimeout(() => setCopiedEmbed(false), 2000)
  }

  function exportJson() {
    const { nodes, edges, title, settings } = useBuilderStore.getState()
    const payload = { title, settings, blocks: nodes, edges }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title.replace(/\s+/g, '_') || 'survey'}.json`
    a.click()
  }

  function exportCsv() {
    const { nodes, title } = useBuilderStore.getState()
    const fields = nodes
      .filter((n) => ['question', 'rating', 'matrix', 'recall', 'hidden_field'].includes(n.data.blockType))
      .map((n) => (n.data.config as { field?: string }).field ?? '')
      .filter(Boolean)
    const blob = new Blob([fields.join(',') + '\n'], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title.replace(/\s+/g, '_') || 'survey'}_template.csv`
    a.click()
  }

  async function handleChatSend(overrideInput?: string) {
    const input = (overrideInput !== undefined ? overrideInput : chatInput).trim()
    if (!input || chatLoading) return

    const userMsgId = `${Date.now()}-u`
    const asstMsgId = `${Date.now()}-a`

    if (overrideInput === undefined) setChatInput('')
    setChatLoading(true)
    setChatMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: input, timestamp: Date.now() },
      { id: asstMsgId, role: 'assistant', content: '', timestamp: Date.now(), loading: true },
    ])

    const { nodes: oldNodes, edges: oldEdges, title: oldTitle } = useBuilderStore.getState()
    const isEdit = oldNodes.length > 0

    try {
      const payload: Record<string, unknown> = { prompt: input, model: chatProvider }
      if (isEdit) {
        payload.currentSurvey = {
          title: oldTitle,
          nodes: oldNodes.map((n) => ({ id: n.id, blockType: n.data.blockType, config: n.data.config })),
          edges: oldEdges.map((e) => ({ source: e.source, target: e.target, sourceHandle: (e as { sourceHandle?: string }).sourceHandle ?? 'out' })),
          positions: oldNodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })),
        }
      }

      const res = await api.post(`/surveys/${id}/generate`, payload)
      const result = res.data as { title: string; nodes: BlockNode[]; edges: Edge[]; changes: { added: number; removed: number; modified: number }; isEdit: boolean }

      store.loadSurvey(result.nodes as BlockNode[], result.edges, result.title)
      useBuilderStore.setState({ isDirty: true })

      const { added, removed, modified } = result.changes
      const parts: string[] = []
      if (!result.isEdit) parts.push('Survey created')
      else {
        if (added > 0) parts.push(`${added} block${added !== 1 ? 's' : ''} added`)
        if (removed > 0) parts.push(`${removed} removed`)
        if (modified > 0) parts.push(`${modified} updated`)
        if (parts.length === 0) parts.push('Survey updated')
      }

      setChatMessages((prev) => prev.map((m) =>
        m.id === asstMsgId
          ? { ...m, loading: false, content: parts.join(', ') + '.', changes: result.changes }
          : m,
      ))
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Generation failed. Try rephrasing your prompt.'
      setChatMessages((prev) => prev.map((m) =>
        m.id === asstMsgId ? { ...m, loading: false, error: msg } : m,
      ))
    } finally {
      setChatLoading(false)
    }
  }

  function startPanelResize(e: React.MouseEvent) {
    e.preventDefault()
    panelResizing.current = true
    resizeStartX.current = e.clientX
    resizeStartWidth.current = panelWidth
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'

    function onMouseMove(ev: MouseEvent) {
      if (!panelResizing.current) return
      const delta = resizeStartX.current - ev.clientX
      setPanelWidth(Math.min(600, Math.max(280, resizeStartWidth.current + delta)))
    }
    function onMouseUp() {
      panelResizing.current = false
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function togglePanel(panel: NonNullable<ActivePanel>) {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  // Mobile: add block via DragCanvas registered callback (has access to ReactFlow context)
  function handleMobileAddBlock(type: BlockType) {
    if (addBlockRef.current) addBlockRef.current(type)
    setMobileBlocks(false)
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-white dark:bg-black flex items-center justify-center">
        <Loader2 size={16} className="text-[#d4d4d8] dark:text-[#444] animate-spin" />
      </div>
    )
  }

  const btnBase = 'flex items-center gap-1.5 text-xs border px-2.5 h-7 rounded transition-colors'
  const btnIdle = 'text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#444]'
  const btnActive = 'text-[#09090b] dark:text-white bg-[#f4f4f5] dark:bg-[#1a1a1a] border-[#a1a1aa] dark:border-[#444]'

  const panelTitle: Record<NonNullable<ActivePanel>, string> = {
    settings: 'Settings',
    generate: 'Build with AI',
    publish: 'Publish',
  }

  const publishContent = (
    <>
      <PublishPanelContent
        surveyId={id}
        isPublished={isPublished}
        publishedUrl={publishedUrl}
        publishedAt={publishedAt}
        copied={copied}
        copiedEmbed={copiedEmbed}
        publishPending={publishMutation.isPending}
        unpublishPending={unpublishMutation.isPending}
        onPublish={() => publishMutation.mutate()}
        onUnpublish={() => unpublishMutation.mutate()}
        onCopyLink={copyLink}
        onCopyEmbed={copyEmbed}
        onOpenEmbed={() => setEmbedModalOpen(true)}
        onExportJson={exportJson}
        onExportCsv={exportCsv}
        onPreview={() => window.open(`/preview/${id}`, '_blank')}
      />
      {surveySlug && (
        <EmbedModal
          open={embedModalOpen}
          onClose={() => setEmbedModalOpen(false)}
          slug={surveySlug}
        />
      )}
    </>
  )

  const settingsContent = (tab: SettingsTab, setTab: (t: SettingsTab) => void) => (
    <>
      {/* Sub-tabs */}
      <div className="flex border-b border-[#e4e4e7] dark:border-[#1a1a1a] shrink-0">
        {([['survey', SlidersHorizontal, 'Survey'], ['canvas', LayoutGrid, 'Canvas']] as const).map(([t, Icon, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 flex-1 justify-center py-2.5 text-[11px] tracking-wide transition-colors ${
              tab === t
                ? 'text-[#09090b] dark:text-white border-b-2 border-[#09090b] dark:border-white -mb-px font-medium'
                : 'text-[#888] dark:text-[#555] hover:text-[#09090b] dark:hover:text-[#aaa]'
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {tab === 'survey' ? (
          <SurveySettingsContent settings={store.settings} updateSettings={store.updateSettings} />
        ) : (
          <CanvasSettingsContent settings={store.settings} updateSettings={store.updateSettings} />
        )}
      </div>
    </>
  )

  const chatPanelProps = {
    messages: chatMessages,
    input: chatInput,
    setInput: setChatInput,
    onSend: handleChatSend,
    loading: chatLoading,
    provider: chatProvider,
    setProvider: (p: Provider) => {
      setChatProvider(p)
      localStorage.setItem('wdym:generate:provider', p)
    },
  }

  return (
    <div className="h-screen bg-white dark:bg-black flex flex-col">
      {/* ── Top bar ── */}
      <header className="h-12 border-b border-[#f4f4f5] dark:border-[#111] flex items-center justify-between px-3 md:px-4 shrink-0 z-20">
        {/* Left: back + title */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft size={14} />
          </button>

          {titleEditing ? (
            <input
              value={store.title}
              onChange={(e) => store.setTitle(e.target.value)}
              onBlur={() => setTitleEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setTitleEditing(false)}
              className="text-sm bg-transparent border-b border-[#d4d4d8] dark:border-[#333] text-[#09090b] dark:text-white focus:outline-none focus:border-[#09090b] dark:focus:border-white px-0 w-36 md:w-48"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setTitleEditing(true)}
              className="text-sm text-[#09090b] dark:text-white hover:text-[#71717a] dark:hover:text-[#aaa] transition-colors truncate max-w-[120px] md:max-w-[200px]"
            >
              {store.title || 'Untitled Survey'}
            </button>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {/* Save status */}
          <AnimatePresence>
            {saveStatus === 'saving' && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] text-[#a1a1aa] dark:text-[#555] flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" />
                <span className="hidden sm:inline">Saving</span>
              </motion.span>
            )}
            {saveStatus === 'saved' && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] text-[#a1a1aa] dark:text-[#555] flex items-center gap-1">
                <Check size={10} />
                <span className="hidden sm:inline">Saved</span>
              </motion.span>
            )}
          </AnimatePresence>

          <ThemeToggle />

          {/* Desktop-only action buttons */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => togglePanel('settings')} className={`${btnBase} ${activePanel === 'settings' ? btnActive : btnIdle}`}>
              <Settings2 size={12} /> Settings
            </button>
            <button onClick={() => togglePanel('generate')} className={`${btnBase} ${activePanel === 'generate' ? btnActive : btnIdle}`} title="⌘G">
              <Sparkles size={12} /> Generate
            </button>
            <button
              onClick={() => togglePanel('publish')}
              className={`${btnBase} ${activePanel === 'publish' ? btnActive : btnIdle} ${isPublished ? 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 hover:border-emerald-400 dark:hover:border-emerald-700' : ''}`}
            >
              <Radio size={12} className={isPublished ? 'animate-pulse' : ''} />
              {isPublished ? 'Live ↗' : 'Publish →'}
            </button>
          </div>

          {/* Mobile: compact publish indicator + overflow menu */}
          <div className="flex md:hidden items-center gap-2">
            {isPublished && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
            <button
              onClick={() => setMobileMenu(true)}
              className="flex items-center justify-center w-7 h-7 border border-[#e4e4e7] dark:border-[#222] rounded text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Canvas area ── */}
      <div className="flex-1 relative overflow-hidden">
        <DragCanvas />

        {/* ── Desktop side panel ── */}
        <AnimatePresence>
          {!isMobile && activePanel && (
            <motion.div
              key={activePanel}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ width: panelWidth }}
              className="absolute right-0 top-0 h-full bg-[#fafafa] dark:bg-[#0a0a0a] border-l border-[#e4e4e7] dark:border-[#1a1a1a] flex flex-col z-30"
            >
              {/* Resize handle */}
              <div
                className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#e4e4e7] dark:hover:bg-[#2a2a2a] transition-colors z-10"
                onMouseDown={startPanelResize}
              />
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e4e4e7] dark:border-[#1a1a1a] shrink-0">
                <span className="text-xs font-medium uppercase tracking-widest text-[#71717a] dark:text-[#888]">
                  {panelTitle[activePanel]}
                </span>
                <button onClick={() => setActivePanel(null)} className="text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Settings sub-tabs */}
              {activePanel === 'settings' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {settingsContent(settingsTab, setSettingsTab)}
                </div>
              )}

              {activePanel === 'generate' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <ChatPanel {...chatPanelProps} />
                </div>
              )}

              {activePanel === 'publish' && (
                <div className="flex-1 overflow-y-auto p-4">{publishContent}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Mobile FAB: add block ── */}
        {isMobile && (
          <button
            onClick={() => setMobileBlocks(true)}
            className="absolute bottom-20 right-4 w-12 h-12 bg-[#09090b] dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-lg z-30 active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        )}

        {/* ── Mobile: block picker sheet ── */}
        {isMobile && (
          <BottomSheet open={mobileBlocks} onClose={() => setMobileBlocks(false)} title="Add Block">
            <MobileBlockList onSelect={handleMobileAddBlock} />
          </BottomSheet>
        )}

        {/* ── Mobile: overflow action sheet ── */}
        {isMobile && (
          <MobileOverflowMenu
            open={mobileMenu}
            onClose={() => setMobileMenu(false)}
            isPublished={isPublished}
            publishPending={publishMutation.isPending}
            unpublishPending={unpublishMutation.isPending}
            onSettings={() => setMobileSheet('settings')}
            onGenerate={() => setMobileSheet('generate')}
            onPublish={() => setMobileSheet('publish')}
            onPreview={() => window.open(`/preview/${id}`, '_blank')}
          />
        )}

        {/* ── Mobile: settings sheet ── */}
        {isMobile && (
          <BottomSheet open={mobileSheet === 'settings'} onClose={() => setMobileSheet(null)} title="Settings" fullHeight>
            {settingsContent(mobileSettingsTab, setMobileSettingsTab)}
          </BottomSheet>
        )}

        {/* ── Mobile: generate sheet ── */}
        {isMobile && (
          <BottomSheet open={mobileSheet === 'generate'} onClose={() => setMobileSheet(null)} title="Build with AI" fullHeight>
            <ChatPanel {...chatPanelProps} />
          </BottomSheet>
        )}

        {/* ── Mobile: publish sheet ── */}
        {isMobile && (
          <BottomSheet open={mobileSheet === 'publish'} onClose={() => setMobileSheet(null)} title="Publish" fullHeight>
            <div className="p-4">{publishContent}</div>
          </BottomSheet>
        )}
      </div>
    </div>
  )
}

// ── Shared label ──────────────────────────────────────
const labelCls = 'text-xs text-[#71717a] dark:text-[#888] tracking-wide'

// ── Publish Panel ─────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 -mx-4 px-4 py-2 mt-2">
      <span className="text-[10px] uppercase tracking-widest text-[#a1a1aa] dark:text-[#444] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-[#e4e4e7] dark:bg-[#1a1a1a]" />
    </div>
  )
}

function PublishPanelContent({
  surveyId, isPublished, publishedUrl, publishedAt,
  copied, copiedEmbed, publishPending, unpublishPending,
  onPublish, onUnpublish, onCopyLink, onCopyEmbed, onOpenEmbed, onExportJson, onExportCsv, onPreview,
}: {
  surveyId: string; isPublished: boolean; publishedUrl: string | null; publishedAt: string | null
  copied: boolean; copiedEmbed: boolean; publishPending: boolean; unpublishPending: boolean
  onPublish: () => void; onUnpublish: () => void; onCopyLink: () => void; onCopyEmbed: () => void
  onOpenEmbed: () => void
  onExportJson: () => void; onExportCsv: () => void; onPreview: () => void
}) {
  const publicUrl = publishedUrl ? window.location.origin + publishedUrl : null

  return (
    <div className="flex flex-col gap-1">
      <div className={`rounded-lg border p-3.5 flex items-start gap-3 mb-3 ${
        isPublished
          ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30'
          : 'border-[#e4e4e7] dark:border-[#1a1a1a] bg-white dark:bg-[#111]'
      }`}>
        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-[#a1a1aa] dark:bg-[#444]'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-medium ${isPublished ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#09090b] dark:text-white'}`}>
              {isPublished ? 'Live' : 'Draft'}
            </span>
            {isPublished && publishedAt && (
              <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">
                {new Date(publishedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#a1a1aa] dark:text-[#555] mt-0.5">
            {isPublished ? 'Anyone with the link can respond.' : 'Only you can see this survey.'}
          </p>
        </div>
      </div>

      {isPublished ? (
        <button
          onClick={onUnpublish} disabled={unpublishPending}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs border border-[#e4e4e7] dark:border-[#222] text-[#71717a] dark:text-[#888] hover:border-red-300 dark:hover:border-red-900 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors disabled:opacity-50"
        >
          {unpublishPending ? <Loader2 size={11} className="animate-spin" /> : <GlobeLock size={11} />}
          {unpublishPending ? 'Unpublishing…' : 'Unpublish survey'}
        </button>
      ) : (
        <Button size="sm" onClick={onPublish} disabled={publishPending} className="w-full justify-center gap-2">
          {publishPending ? <Loader2 size={11} className="animate-spin" /> : <Globe size={11} />}
          {publishPending ? 'Publishing…' : 'Publish survey'}
        </Button>
      )}

      <SectionDivider label="Share" />
      {isPublished && publicUrl ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded px-3 py-2">
            <span className="flex-1 text-[11px] text-[#09090b] dark:text-white font-mono truncate">{publicUrl}</span>
            <button onClick={onCopyLink} className="shrink-0 text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors">
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors">
              <ExternalLink size={12} />
            </a>
          </div>
          <button
            onClick={onOpenEmbed}
            className="flex items-center gap-2 w-full text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] px-3 py-2.5 rounded transition-colors"
          >
            <Code2 size={11} />
            <span className="flex-1 text-left">Embed in your app</span>
            <ChevronRight size={10} className="text-[#a1a1aa] dark:text-[#444]" />
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-[#a1a1aa] dark:text-[#555]">Publish the survey to get a shareable link.</p>
      )}

      <SectionDivider label="Preview" />
      <button onClick={onPreview} className="flex items-center gap-2 w-full text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] px-3 py-2.5 rounded transition-colors">
        <Play size={11} /><span className="flex-1 text-left">Preview survey</span><ExternalLink size={10} className="text-[#a1a1aa] dark:text-[#444]" />
      </button>

      <SectionDivider label="Export" />
      <div className="flex flex-col gap-2">
        <button onClick={onExportJson} className="flex items-center gap-2 w-full text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] px-3 py-2.5 rounded transition-colors">
          <FileJson size={11} />
          <div className="flex-1 text-left"><div>Download as JSON</div><div className="text-[10px] text-[#a1a1aa] dark:text-[#444] mt-0.5">Full survey definition</div></div>
          <Download size={10} className="text-[#a1a1aa] dark:text-[#444] shrink-0" />
        </button>
        <button onClick={onExportCsv} className="flex items-center gap-2 w-full text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] px-3 py-2.5 rounded transition-colors">
          <FileText size={11} />
          <div className="flex-1 text-left"><div>Download field template</div><div className="text-[10px] text-[#a1a1aa] dark:text-[#444] mt-0.5">CSV with question field headers</div></div>
          <Download size={10} className="text-[#a1a1aa] dark:text-[#444] shrink-0" />
        </button>
      </div>

      <SectionDivider label="Analytics" />
      <a href={`/analytics/${surveyId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] px-3 py-2.5 rounded transition-colors">
        <BarChart2 size={11} /><span className="flex-1 text-left">View responses & analytics</span><ExternalLink size={10} className="text-[#a1a1aa] dark:text-[#444]" />
      </a>

      <SectionDivider label="Coming soon" />
      <div className="flex flex-col gap-1.5">
        {[
          { icon: QrCode, label: 'QR code download', desc: 'Share via printed materials' },
          { icon: Bell, label: 'Response notifications', desc: 'Email alerts on new submissions' },
          { icon: Clock, label: 'Scheduled publish', desc: 'Set a go-live date and time' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-center gap-2.5 px-3 py-2.5 rounded border border-dashed border-[#e4e4e7] dark:border-[#1a1a1a] opacity-50 cursor-not-allowed">
            <Icon size={11} className="shrink-0 text-[#a1a1aa] dark:text-[#555]" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-[#71717a] dark:text-[#888]">{label}</div>
              <div className="text-[10px] text-[#a1a1aa] dark:text-[#444]">{desc}</div>
            </div>
            <ChevronRight size={10} className="text-[#a1a1aa] dark:text-[#444] shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Survey Settings ───────────────────────────────────
function SurveySettingsContent({ settings, updateSettings }: { settings: SurveySettings; updateSettings: (patch: Partial<SurveySettings>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Theme</label>
        <div className="flex bg-[#f4f4f5] dark:bg-[#1a1a1a] p-1 rounded-lg">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button key={t} onClick={() => updateSettings({ theme: t })}
              className={`flex-1 text-xs py-1.5 rounded capitalize transition-all ${settings.theme === t ? 'bg-white dark:bg-[#333] text-[#09090b] dark:text-white shadow-sm' : 'text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Corner Radius</label>
        <div className="flex gap-2">
          {(['none', 'sm', 'full'] as const).map((r) => (
            <button key={r} onClick={() => updateSettings({ radius: r })}
              className={`flex-1 py-3 border text-xs capitalize transition-all flex items-center justify-center ${r === 'none' ? 'rounded-none' : r === 'sm' ? 'rounded-md' : 'rounded-full'} ${settings.radius === r ? 'border-[#09090b] dark:border-white text-[#09090b] dark:text-white bg-black/5 dark:bg-white/5' : 'border-[#e4e4e7] dark:border-[#333] text-[#71717a] dark:text-[#888] hover:border-[#a1a1aa] dark:hover:border-[#555]'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Accent Color</label>
        <div className="flex items-center gap-3">
          <input type="color" value={settings.brandColor || '#ffffff'} onChange={(e) => updateSettings({ brandColor: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" style={{ WebkitAppearance: 'none' } as React.CSSProperties} />
          <input type="text" value={settings.brandColor || '#ffffff'} onChange={(e) => updateSettings({ brandColor: e.target.value })}
            className="flex-1 text-xs bg-transparent border border-[#e4e4e7] dark:border-[#333] rounded px-3 py-2 text-[#09090b] dark:text-white focus:outline-none focus:border-[#09090b] dark:focus:border-[#888]" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#09090b] dark:text-white">Response Limit</span>
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">Stop accepting after N completions</span>
        </div>
        <Toggle
          checked={settings.responseLimit != null}
          onChange={(v) => updateSettings({ responseLimit: v ? 100 : null })}
        />
      </div>

      {settings.responseLimit != null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={settings.responseLimit ?? ''}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10)
                updateSettings({ responseLimit: n > 0 ? n : null })
              }}
              className="w-24 text-xs bg-transparent border border-[#e4e4e7] dark:border-[#333] rounded px-3 py-2 text-[#09090b] dark:text-white focus:outline-none focus:border-[#09090b] dark:focus:border-[#888] tabular-nums"
            />
            <span className="text-xs text-[#a1a1aa] dark:text-[#555]">max responses</span>
          </div>
          <input
            type="text"
            value={settings.closedMessage || ''}
            onChange={(e) => updateSettings({ closedMessage: e.target.value })}
            placeholder="This survey is no longer accepting responses."
            className="w-full text-xs bg-transparent border border-[#e4e4e7] dark:border-[#333] rounded px-3 py-2 text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] focus:outline-none focus:border-[#09090b] dark:focus:border-[#888]"
          />
          <p className="text-[10px] text-[#a1a1aa] dark:text-[#444]">Message shown to respondents when closed.</p>
        </div>
      )}

      {/* ── Access / Auth ── */}
      <div className="border-t border-[#e4e4e7] dark:border-[#1a1a1a] pt-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-[#09090b] dark:text-white flex items-center gap-1.5">
              <Lock size={12} /> Require Authentication
            </span>
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">Respondents must sign in to access</span>
          </div>
          <Toggle
            checked={settings.authRequired}
            onChange={(v) => updateSettings({ authRequired: v })}
          />
        </div>

        {settings.authRequired && (
          <div className="flex flex-col gap-4">
            {/* Provider */}
            <div className="flex flex-col gap-2">
              <label className={labelCls}>Auth Provider</label>
              <div className="flex bg-[#f4f4f5] dark:bg-[#1a1a1a] p-1 rounded-lg">
                {(['wdym', 'google'] as const).map((p) => (
                  <button key={p} onClick={() => updateSettings({ authProvider: p })}
                    className={`flex-1 text-xs py-1.5 rounded capitalize transition-all ${settings.authProvider === p ? 'bg-white dark:bg-[#333] text-[#09090b] dark:text-white shadow-sm' : 'text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white'}`}>
                    {p === 'wdym' ? 'wdym account' : 'Google OAuth'}
                  </button>
                ))}
              </div>
            </div>

            {/* Google credentials */}
            {settings.authProvider === 'google' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Google Client ID</label>
                  <input
                    type="text"
                    value={settings.googleClientId || ''}
                    onChange={(e) => updateSettings({ googleClientId: e.target.value })}
                    placeholder="123456789-abc.apps.googleusercontent.com"
                    className="text-xs bg-transparent border border-[#e4e4e7] dark:border-[#333] rounded px-3 py-2 text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] focus:outline-none focus:border-[#09090b] dark:focus:border-[#888]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Google Client Secret</label>
                  <input
                    type="password"
                    value={settings.googleClientSecret || ''}
                    onChange={(e) => updateSettings({ googleClientSecret: e.target.value })}
                    placeholder="Will be encrypted on save"
                    autoComplete="off"
                    className="text-xs bg-transparent border border-[#e4e4e7] dark:border-[#333] rounded px-3 py-2 text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] focus:outline-none focus:border-[#09090b] dark:focus:border-[#888]"
                  />
                </div>
                <div className="bg-[#f4f4f5] dark:bg-[#1a1a1a] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-[#71717a] dark:text-[#888] leading-relaxed">
                    Add this redirect URI in your Google Cloud Console:
                  </p>
                  <p className="text-[10px] font-mono text-[#09090b] dark:text-white mt-1 break-all">
                    {(import.meta.env.VITE_API_URL || 'http://localhost:4000')}/s/oauth/callback
                  </p>
                </div>
              </div>
            )}

            {/* Allowlist */}
            <AllowlistEditor
              allowlist={settings.allowlist || []}
              onChange={(list) => updateSettings({ allowlist: list })}
            />

            {/* Blocked message */}
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Blocked Message</label>
              <input
                type="text"
                value={settings.allowlistMessage || ''}
                onChange={(e) => updateSettings({ allowlistMessage: e.target.value })}
                placeholder="You are not allowed to access this survey."
                className="text-xs bg-transparent border border-[#e4e4e7] dark:border-[#333] rounded px-3 py-2 text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] focus:outline-none focus:border-[#09090b] dark:focus:border-[#888]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AllowlistEditor({ allowlist, onChange }: { allowlist: string[]; onChange: (list: string[]) => void }) {
  const [dragging, setDragging] = useState(false)
  const [rawText, setRawText] = useState(() => allowlist.join('\n'))

  function parseEmails(raw: string): string[] {
    return raw.split(/[\n,;]+/).map(s => s.trim().toLowerCase()).filter(s => s.includes('@'))
  }

  function handleBlur() {
    onChange(parseEmails(rawText))
  }

  function setFromEmails(emails: string[]) {
    setRawText(emails.join('\n'))
    onChange(emails)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    Papa.parse<string[]>(file, {
      complete: (result) => {
        const emails = result.data.flat().map(s => String(s).trim().toLowerCase()).filter(s => s.includes('@'))
        setFromEmails(emails)
      },
    })
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<string[]>(file, {
      complete: (result) => {
        const emails = result.data.flat().map(s => String(s).trim().toLowerCase()).filter(s => s.includes('@'))
        setFromEmails(emails)
      },
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className={labelCls}>Allowlist</label>
        {allowlist.length > 0 && (
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">{allowlist.length} email{allowlist.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      <textarea
        rows={4}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        onBlur={handleBlur}
        placeholder="alice@example.com&#10;bob@example.com&#10;(one per line, or paste CSV)"
        className="text-xs font-mono bg-transparent border border-[#e4e4e7] dark:border-[#333] rounded px-3 py-2 text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] focus:outline-none focus:border-[#09090b] dark:focus:border-[#888] resize-none"
      />
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg px-3 py-3 cursor-pointer transition-colors ${dragging ? 'border-[#09090b] dark:border-white bg-black/5 dark:bg-white/5' : 'border-[#e4e4e7] dark:border-[#333] hover:border-[#a1a1aa] dark:hover:border-[#555]'}`}
      >
        <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
        <Upload size={12} className="text-[#a1a1aa] dark:text-[#555]" />
        <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">Drop CSV or click to upload</span>
      </label>
      <p className="text-[10px] text-[#a1a1aa] dark:text-[#444]">Leave empty to allow all authenticated users.</p>
    </div>
  )
}

// ── Canvas Settings ───────────────────────────────────

type BgOption = { id: SurveySettings['canvasBg']; label: string; preview: React.ReactNode }

function DotsSVG() {
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="36" rx="3" className="fill-[#f4f4f5] dark:fill-[#1a1a1a]" />
      {[8, 20, 32, 44].map(x => [8, 20, 32].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r={2} className="fill-[#a1a1aa] dark:fill-[#444]" />))}
    </svg>
  )
}
function LinesSVG() {
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="36" rx="3" className="fill-[#f4f4f5] dark:fill-[#1a1a1a]" />
      {[0,12,24,36,48].map(x => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={36} className="stroke-[#d4d4d8] dark:stroke-[#333]" strokeWidth={0.5} />)}
      {[0,12,24,36].map(y => <line key={`h${y}`} x1={0} y1={y} x2={52} y2={y} className="stroke-[#d4d4d8] dark:stroke-[#333]" strokeWidth={0.5} />)}
    </svg>
  )
}
function CrossSVG() {
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="36" rx="3" className="fill-[#f4f4f5] dark:fill-[#1a1a1a]" />
      {[12,26,40].map(x => [10,24].map(y => (
        <g key={`${x}-${y}`}>
          <line x1={x-5} y1={y} x2={x+5} y2={y} className="stroke-[#a1a1aa] dark:stroke-[#444]" strokeWidth={1.2} />
          <line x1={x} y1={y-5} x2={x} y2={y+5} className="stroke-[#a1a1aa] dark:stroke-[#444]" strokeWidth={1.2} />
        </g>
      )))}
    </svg>
  )
}
function NoneSVG() {
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="36" rx="3" className="fill-[#f4f4f5] dark:fill-[#1a1a1a]" />
      <text x="26" y="21" textAnchor="middle" className="fill-[#a1a1aa] dark:fill-[#555]" style={{ fontSize: 9, fontFamily: 'Inter, sans-serif' }}>None</text>
    </svg>
  )
}

const BG_OPTIONS: BgOption[] = [
  { id: 'dots', label: 'Dots', preview: <DotsSVG /> },
  { id: 'lines', label: 'Grid', preview: <LinesSVG /> },
  { id: 'cross', label: 'Cross', preview: <CrossSVG /> },
  { id: 'none', label: 'None', preview: <NoneSVG /> },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 focus:outline-none ${checked ? 'bg-[#09090b] dark:bg-white border-[#09090b] dark:border-white' : 'bg-transparent border-[#d4d4d8] dark:border-[#333]'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 mt-[3px] ${checked ? 'translate-x-[18px] bg-white dark:bg-black' : 'translate-x-[3px] bg-[#a1a1aa] dark:bg-[#555]'}`} />
    </button>
  )
}

function CanvasSettingsContent({ settings, updateSettings }: { settings: SurveySettings; updateSettings: (patch: Partial<SurveySettings>) => void }) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <label className={labelCls}>Background Pattern</label>
        <div className="grid grid-cols-2 gap-2">
          {BG_OPTIONS.map((opt) => {
            const isSelected = settings.canvasBg === opt.id
            return (
              <button key={opt.id} onClick={() => updateSettings({ canvasBg: opt.id })}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${isSelected ? 'border-[#09090b] dark:border-white bg-black/5 dark:bg-white/5' : 'border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#444]'}`}>
                <div className={`rounded overflow-hidden ${isSelected ? 'ring-[1.5px] ring-[#09090b] dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-[#0a0a0a]' : ''}`}>
                  {opt.preview}
                </div>
                <span className={`text-[10px] tracking-wide ${isSelected ? 'text-[#09090b] dark:text-white font-medium' : 'text-[#888] dark:text-[#555]'}`}>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {settings.canvasBg !== 'none' && (
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Pattern Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={settings.canvasBgColor || '#1a1a1a'} onChange={(e) => updateSettings({ canvasBgColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" style={{ WebkitAppearance: 'none' } as React.CSSProperties} />
            <input type="text" value={settings.canvasBgColor || ''} onChange={(e) => updateSettings({ canvasBgColor: e.target.value })}
              placeholder="Auto (theme default)"
              className="flex-1 text-xs bg-transparent border border-[#e4e4e7] dark:border-[#333] rounded px-3 py-2 text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] focus:outline-none focus:border-[#09090b] dark:focus:border-[#888]" />
            {settings.canvasBgColor && (
              <button onClick={() => updateSettings({ canvasBgColor: '' })} className="text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"><X size={12} /></button>
            )}
          </div>
          <p className="text-[10px] text-[#a1a1aa] dark:text-[#444]">Leave blank to auto-follow theme.</p>
        </div>
      )}

      {/* Opacity slider */}
      {settings.canvasBg !== 'none' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className={labelCls}>Pattern Opacity</label>
            <span className="text-[11px] text-[#09090b] dark:text-white font-mono tabular-nums">
              {settings.canvasBgOpacity ?? 30}%
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={settings.canvasBgOpacity ?? 30}
            onChange={(e) => updateSettings({ canvasBgOpacity: Number(e.target.value) })}
            className="w-full h-1 rounded-full appearance-none cursor-pointer bg-[#e4e4e7] dark:bg-[#222] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#09090b] dark:[&::-webkit-slider-thumb]:bg-white"
          />
          <div className="flex justify-between text-[9px] text-[#a1a1aa] dark:text-[#444]">
            <span>Subtle</span>
            <span>Bold</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#09090b] dark:text-white">Minimap</span>
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">Show overview map in bottom-left</span>
        </div>
        <Toggle checked={settings.minimap} onChange={(v) => updateSettings({ minimap: v })} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#09090b] dark:text-white">Snap to Grid</span>
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">Align nodes to a 16px grid</span>
        </div>
        <Toggle checked={settings.snapToGrid} onChange={(v) => updateSettings({ snapToGrid: v })} />
      </div>
    </div>
  )
}

// ── Embed Modal ────────────────────────────────────────

type EmbedTab = 'iframe' | 'popup' | 'react'

const EMBED_TABS: { id: EmbedTab; label: string }[] = [
  { id: 'iframe',  label: 'iFrame'  },
  { id: 'popup',   label: 'JS Popup' },
  { id: 'react',   label: 'React'   },
]

function EmbedModal({ open, onClose, slug }: { open: boolean; onClose: () => void; slug: string }) {
  const [tab, setTab] = useState<EmbedTab>('iframe')
  const [copied, setCopied] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const src = `${origin}/s/${slug}?embed=1`

  const snippets: Record<EmbedTab, string> = {
    iframe: `<iframe
  src="${src}"
  width="100%"
  height="600"
  frameborder="0"
  style="border:none; border-radius:8px;"
></iframe>`,
    popup: `<script
  src="${origin}/embed.js"
  data-survey="${slug}"
  data-mode="popup"
  data-label="Give Feedback"
  data-position="bottom-right"
  async
></script>`,
    react: `<iframe
  src="${src}"
  style={{
    width: '100%',
    height: '600px',
    border: 'none',
    borderRadius: '8px',
  }}
  title="Survey"
/>`,
  }

  const descriptions: Record<EmbedTab, string> = {
    iframe:  'Drop this anywhere in your HTML to embed the survey inline.',
    popup:   'Add to your page\'s <body>. Renders a floating button that opens the survey in a modal.',
    react:   'Use directly in any React component.',
  }

  function copy() {
    navigator.clipboard.writeText(snippets[tab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg bg-white dark:bg-[#0a0a0a] border border-[#e4e4e7] dark:border-[#222] rounded-xl shadow-2xl dark:shadow-none flex flex-col"
            initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#e4e4e7] dark:border-[#1a1a1a]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#f4f4f5] dark:bg-[#1a1a1a] flex items-center justify-center">
                  <Code2 size={13} className="text-[#09090b] dark:text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-[#09090b] dark:text-white">Embed survey</h2>
                  <p className="text-[11px] text-[#a1a1aa] dark:text-[#555]">Add this survey to any website or app</p>
                </div>
              </div>
              <button onClick={onClose} className="text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#e4e4e7] dark:border-[#1a1a1a] px-5">
              {EMBED_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setCopied(false) }}
                  className={`py-2.5 text-xs font-medium mr-4 border-b-[1.5px] transition-colors ${
                    tab === t.id
                      ? 'border-[#09090b] dark:border-white text-[#09090b] dark:text-white'
                      : 'border-transparent text-[#71717a] dark:text-[#666] hover:text-[#09090b] dark:hover:text-[#aaa]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-[11px] text-[#71717a] dark:text-[#888]">{descriptions[tab]}</p>

              {/* Code block */}
              <div className="relative group">
                <pre className="bg-[#f4f4f5] dark:bg-[#111] border border-[#e4e4e7] dark:border-[#1a1a1a] rounded-lg px-4 py-3.5 text-[11px] font-mono text-[#09090b] dark:text-[#d4d4d8] overflow-x-auto whitespace-pre leading-relaxed">
                  {snippets[tab]}
                </pre>
                <button
                  onClick={copy}
                  className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-white dark:bg-[#1a1a1a] border border-[#e4e4e7] dark:border-[#333] text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white transition-colors"
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Popup-specific options hint */}
              {tab === 'popup' && (
                <div className="rounded-lg border border-[#e4e4e7] dark:border-[#1a1a1a] p-3 flex flex-col gap-1.5">
                  <p className="text-[10px] font-medium text-[#71717a] dark:text-[#888] uppercase tracking-wider">Customise via data attributes</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      ['data-label', 'Button text'],
                      ['data-color', 'Button colour (#hex)'],
                      ['data-position', 'bottom-right / bottom-left'],
                      ['data-mode', 'popup / inline'],
                    ].map(([attr, desc]) => (
                      <div key={attr} className="flex flex-col">
                        <span className="text-[10px] font-mono text-[#09090b] dark:text-white">{attr}</span>
                        <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer note */}
            <div className="px-5 pb-4">
              <p className="text-[10px] text-[#a1a1aa] dark:text-[#444]">
                Survey must be published for the embed to work.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Chat Panel ─────────────────────────────────────────

function ChatEmptyState({ onExampleClick }: { onExampleClick: (s: string) => void }) {
  const shorts = ['NPS survey with branch logic', 'Employee onboarding feedback', 'Product market fit survey']
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-8 text-center px-4">
      <div className="w-10 h-10 rounded-xl bg-[#f4f4f5] dark:bg-[#1a1a1a] flex items-center justify-center">
        <Sparkles size={16} className="text-[#71717a] dark:text-[#888]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#09090b] dark:text-white">Build with AI</p>
        <p className="text-xs text-[#71717a] dark:text-[#555] mt-1.5 leading-relaxed">
          Describe your survey and I'll build it.<br />Then ask me to modify any part.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full">
        {shorts.map((s, i) => (
          <button
            key={s}
            onClick={() => onExampleClick(EXAMPLES[i])}
            className="text-left text-[11px] text-[#71717a] dark:text-[#666] hover:text-[#09090b] dark:hover:text-[#aaa] border border-[#e4e4e7] dark:border-[#1a1a1a] hover:border-[#a1a1aa] dark:hover:border-[#333] rounded-lg px-3 py-2.5 transition-colors"
          >
            {s} →
          </button>
        ))}
      </div>
    </div>
  )
}

function ChatUserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-[#09090b] dark:bg-white text-white dark:text-black text-xs px-3.5 py-2.5 rounded-2xl rounded-tr-sm leading-relaxed whitespace-pre-wrap break-words">
        {content}
      </div>
    </div>
  )
}

function ChatAssistantMessage({ message }: { message: ChatMessage }) {
  const avatar = (
    <div className="w-5 h-5 rounded-full bg-[#f4f4f5] dark:bg-[#1a1a1a] flex items-center justify-center shrink-0 mt-0.5">
      <Sparkles size={10} className="text-[#71717a] dark:text-[#888]" />
    </div>
  )

  if (message.loading) {
    return (
      <div className="flex items-start gap-2">
        {avatar}
        <div className="bg-[#f4f4f5] dark:bg-[#1a1a1a] rounded-2xl rounded-tl-sm px-3.5 py-3">
          <div className="flex gap-1 items-center h-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#a1a1aa] dark:bg-[#555]"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22 }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (message.error) {
    return (
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0 mt-0.5">
          <X size={10} className="text-red-500" />
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400 leading-relaxed max-w-[85%]">
          {message.error}
        </div>
      </div>
    )
  }

  const { changes } = message
  return (
    <div className="flex items-start gap-2">
      {avatar}
      <div className="flex flex-col gap-1.5 max-w-[85%]">
        <div className="bg-[#f4f4f5] dark:bg-[#1a1a1a] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-[#09090b] dark:text-white leading-relaxed">
          {message.content}
        </div>
        {changes && (changes.added > 0 || changes.removed > 0 || changes.modified > 0) && (
          <div className="flex gap-1.5 flex-wrap pl-1">
            {changes.added > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                +{changes.added}
              </span>
            )}
            {changes.removed > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 font-mono font-medium">
                −{changes.removed}
              </span>
            )}
            {changes.modified > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e4e4e7] dark:bg-[#222] text-[#71717a] dark:text-[#888] font-mono font-medium">
                ~{changes.modified}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ChatPanel({
  messages, input, setInput, onSend, loading, provider, setProvider,
}: {
  messages: ChatMessage[]
  input: string
  setInput: (v: string) => void
  onSend: () => void
  loading: boolean
  provider: Provider
  setProvider: (p: Provider) => void
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
        {messages.length === 0 ? (
          <ChatEmptyState onExampleClick={(s) => {
            setInput(s)
            textareaRef.current?.focus()
          }} />
        ) : (
          messages.map((msg) =>
            msg.role === 'user'
              ? <ChatUserMessage key={msg.id} content={msg.content} />
              : <ChatAssistantMessage key={msg.id} message={msg} />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#e4e4e7] dark:border-[#1a1a1a] px-3 pt-3 pb-3 flex flex-col gap-2.5 shrink-0">
        {/* Provider toggle */}
        <div className="flex gap-1.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              disabled={loading}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors disabled:opacity-50 ${
                provider === p.id
                  ? 'bg-[#09090b] dark:bg-white text-white dark:text-black'
                  : 'bg-[#f4f4f5] dark:bg-[#1a1a1a] text-[#71717a] dark:text-[#888] hover:bg-[#e4e4e7] dark:hover:bg-[#222]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Textarea + send */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={messages.length === 0 ? 'Describe your survey…' : 'Ask me to edit anything…'}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-[#f4f4f5] dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded-xl text-xs text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] px-3 py-2.5 focus:outline-none focus:border-[#a1a1aa] dark:focus:border-[#444] transition-colors disabled:opacity-50 leading-relaxed"
            style={{ minHeight: 38, maxHeight: 120 }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || loading}
            className="shrink-0 w-8 h-8 flex items-center justify-center bg-[#09090b] dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-25 transition-opacity active:scale-95"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ArrowUp size={12} />}
          </button>
        </div>
        <p className="text-[9px] text-[#a1a1aa] dark:text-[#444]">
          <kbd className="font-mono bg-[#f4f4f5] dark:bg-[#1a1a1a] px-1 rounded">⌘↵</kbd> to send
        </p>
      </div>
    </div>
  )
}
