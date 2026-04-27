import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Check, Copy, Loader2, Sparkles, Settings2, X, AlertCircle,
  LayoutGrid, SlidersHorizontal, Radio, Play, Download, Code2,
  ExternalLink, Globe, GlobeLock, FileJson, FileText, QrCode,
  Bell, BarChart2, Clock, ChevronRight,
} from 'lucide-react'
import { api } from '../lib/api'
import { useBuilderStore, BlockNode, SurveySettings } from '../store/builder'
import { DragCanvas } from '../components/builder/DragCanvas'
import { Button } from '../components/ui/Button'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { debounce } from '../lib/utils'
import type { Edge, Node } from '@xyflow/react'

type Provider = 'gemini' | 'anthropic'
type ActivePanel = 'settings' | 'generate' | 'publish' | null
type SettingsTab = 'survey' | 'canvas'

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

export default function Builder() {
  const { id } = useParams({ from: '/builder/$id' })
  const navigate = useNavigate()
  const store = useBuilderStore()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [titleEditing, setTitleEditing] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [panelWidth, setPanelWidth] = useState(320)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('survey')

  // Generate panel state
  const [genPrompt, setGenPrompt] = useState('')
  const [genProvider, setGenProvider] = useState<Provider>('gemini')
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const loaded = useRef(false)
  const panelResizing = useRef(false)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        setActivePanel((prev) => (prev === 'generate' ? null : 'generate'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { data: surveyData, isLoading } = useQuery<SurveyData>({
    queryKey: ['survey', id],
    queryFn: () => api.get(`/surveys/${id}`).then((r) => r.data),
  })

  useEffect(() => {
    if (surveyData && !loaded.current) {
      loaded.current = true
      store.loadSurvey(surveyData.blocks ?? [], surveyData.edges ?? [], surveyData.title, surveyData.settings)
      setIsPublished(surveyData.published)
      if (surveyData.published) {
        setPublishedUrl(`/s/${surveyData.slug}`)
        setPublishedAt(surveyData.publishedAt ?? null)
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
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: () => api.post(`/surveys/${id}/unpublish`),
    onSuccess: () => {
      setIsPublished(false)
    },
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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '_') || 'survey'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCsv() {
    const { nodes, title } = useBuilderStore.getState()
    const interactiveTypes = ['question', 'rating', 'matrix', 'recall', 'hidden_field']
    const fields = nodes
      .filter((n) => interactiveTypes.includes(n.data.blockType))
      .map((n) => {
        const cfg = n.data.config as { field?: string; label?: string }
        return cfg.field ?? ''
      })
      .filter(Boolean)
    const csv = fields.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '_') || 'survey'}_template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleGenerate() {
    if (!genPrompt.trim() || genLoading) return
    setGenError(null)
    setGenLoading(true)
    try {
      const res = await api.post(`/surveys/${id}/generate`, { prompt: genPrompt.trim(), model: genProvider })
      const result = res.data as { title: string; nodes: Node[]; edges: Edge[] }
      store.loadSurvey(result.nodes as BlockNode[], result.edges, result.title)
      useBuilderStore.setState({ isDirty: true })
      setGenPrompt('')
      setActivePanel(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Generation failed. Try rephrasing your prompt.'
      setGenError(msg)
    } finally {
      setGenLoading(false)
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

  return (
    <div className="h-screen bg-white dark:bg-black flex flex-col">
      {/* Top bar */}
      <header className="h-12 border-b border-[#f4f4f5] dark:border-[#111] flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
          </button>

          {titleEditing ? (
            <input
              value={store.title}
              onChange={(e) => store.setTitle(e.target.value)}
              onBlur={() => setTitleEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setTitleEditing(false)}
              className="text-sm bg-transparent border-b border-[#d4d4d8] dark:border-[#333] text-[#09090b] dark:text-white focus:outline-none focus:border-[#09090b] dark:focus:border-white px-0 w-48"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setTitleEditing(true)}
              className="text-sm text-[#09090b] dark:text-white hover:text-[#71717a] dark:hover:text-[#aaa] transition-colors truncate max-w-[200px]"
            >
              {store.title || 'Untitled Survey'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence>
            {saveStatus === 'saving' && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] text-[#a1a1aa] dark:text-[#555] flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Saving
              </motion.span>
            )}
            {saveStatus === 'saved' && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] text-[#a1a1aa] dark:text-[#555] flex items-center gap-1">
                <Check size={10} /> Saved
              </motion.span>
            )}
          </AnimatePresence>

          <ThemeToggle />

          <button
            onClick={() => togglePanel('settings')}
            className={`${btnBase} ${activePanel === 'settings' ? btnActive : btnIdle}`}
          >
            <Settings2 size={12} />
            Settings
          </button>

          <button
            onClick={() => togglePanel('generate')}
            className={`${btnBase} ${activePanel === 'generate' ? btnActive : btnIdle}`}
            title="⌘G"
          >
            <Sparkles size={12} />
            Generate
          </button>

          {/* Publish button — always visible, opens panel */}
          <button
            onClick={() => togglePanel('publish')}
            className={`${btnBase} ${activePanel === 'publish' ? btnActive : btnIdle} ${isPublished ? 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 hover:border-emerald-400 dark:hover:border-emerald-700' : ''}`}
          >
            <Radio size={12} className={isPublished ? 'animate-pulse' : ''} />
            {isPublished ? 'Live ↗' : 'Publish →'}
          </button>
        </div>
      </header>

      {/* Canvas + side panel */}
      <div className="flex-1 relative overflow-hidden">
        <DragCanvas />

        <AnimatePresence>
          {activePanel && (
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

              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e4e4e7] dark:border-[#1a1a1a] shrink-0">
                <span className="text-xs font-medium uppercase tracking-widest text-[#71717a] dark:text-[#888]">
                  {panelTitle[activePanel]}
                </span>
                <button
                  onClick={() => setActivePanel(null)}
                  className="text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Settings sub-tabs */}
              {activePanel === 'settings' && (
                <div className="flex border-b border-[#e4e4e7] dark:border-[#1a1a1a] shrink-0">
                  <button
                    onClick={() => setSettingsTab('survey')}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-2.5 text-[11px] tracking-wide transition-colors ${
                      settingsTab === 'survey'
                        ? 'text-[#09090b] dark:text-white border-b-2 border-[#09090b] dark:border-white -mb-px font-medium'
                        : 'text-[#888] dark:text-[#555] hover:text-[#09090b] dark:hover:text-[#aaa]'
                    }`}
                  >
                    <SlidersHorizontal size={11} />
                    Survey
                  </button>
                  <button
                    onClick={() => setSettingsTab('canvas')}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-2.5 text-[11px] tracking-wide transition-colors ${
                      settingsTab === 'canvas'
                        ? 'text-[#09090b] dark:text-white border-b-2 border-[#09090b] dark:border-white -mb-px font-medium'
                        : 'text-[#888] dark:text-[#555] hover:text-[#09090b] dark:hover:text-[#aaa]'
                    }`}
                  >
                    <LayoutGrid size={11} />
                    Canvas
                  </button>
                </div>
              )}

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activePanel === 'settings' && settingsTab === 'survey' && (
                  <SurveySettingsContent
                    settings={store.settings}
                    updateSettings={store.updateSettings}
                  />
                )}
                {activePanel === 'settings' && settingsTab === 'canvas' && (
                  <CanvasSettingsContent
                    settings={store.settings}
                    updateSettings={store.updateSettings}
                  />
                )}
                {activePanel === 'generate' && (
                  <GeneratePanelContent
                    prompt={genPrompt}
                    setPrompt={setGenPrompt}
                    provider={genProvider}
                    setProvider={setGenProvider}
                    loading={genLoading}
                    error={genError}
                    existingBlockCount={store.nodes.length}
                    onGenerate={handleGenerate}
                  />
                )}
                {activePanel === 'publish' && (
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
                    onExportJson={exportJson}
                    onExportCsv={exportCsv}
                    onPreview={() => window.open(`/preview/${id}`, '_blank')}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Shared ────────────────────────────────────────────
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
  surveyId,
  isPublished,
  publishedUrl,
  publishedAt,
  copied,
  copiedEmbed,
  publishPending,
  unpublishPending,
  onPublish,
  onUnpublish,
  onCopyLink,
  onCopyEmbed,
  onExportJson,
  onExportCsv,
  onPreview,
}: {
  surveyId: string
  isPublished: boolean
  publishedUrl: string | null
  publishedAt: string | null
  copied: boolean
  copiedEmbed: boolean
  publishPending: boolean
  unpublishPending: boolean
  onPublish: () => void
  onUnpublish: () => void
  onCopyLink: () => void
  onCopyEmbed: () => void
  onExportJson: () => void
  onExportCsv: () => void
  onPreview: () => void
}) {
  const publicUrl = publishedUrl ? window.location.origin + publishedUrl : null

  return (
    <div className="flex flex-col gap-1">

      {/* ── Status card ── */}
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

      {/* Publish / Unpublish */}
      {isPublished ? (
        <button
          onClick={onUnpublish}
          disabled={unpublishPending}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs border border-[#e4e4e7] dark:border-[#222] text-[#71717a] dark:text-[#888] hover:border-red-300 dark:hover:border-red-900 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors disabled:opacity-50"
        >
          {unpublishPending ? <Loader2 size={11} className="animate-spin" /> : <GlobeLock size={11} />}
          {unpublishPending ? 'Unpublishing…' : 'Unpublish survey'}
        </button>
      ) : (
        <Button
          size="sm"
          onClick={onPublish}
          disabled={publishPending}
          className="w-full justify-center gap-2"
        >
          {publishPending ? <Loader2 size={11} className="animate-spin" /> : <Globe size={11} />}
          {publishPending ? 'Publishing…' : 'Publish survey'}
        </Button>
      )}

      {/* ── Share ── */}
      <SectionDivider label="Share" />

      {isPublished && publicUrl ? (
        <div className="flex flex-col gap-2">
          {/* Public URL */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded px-3 py-2">
            <span className="flex-1 text-[11px] text-[#09090b] dark:text-white font-mono truncate">{publicUrl}</span>
            <button
              onClick={onCopyLink}
              className="shrink-0 text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
              title="Copy link"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Copy embed */}
          <button
            onClick={onCopyEmbed}
            className="flex items-center gap-2 text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] px-3 py-2 rounded transition-colors"
          >
            <Code2 size={11} />
            {copiedEmbed ? 'Embed code copied!' : 'Copy embed code'}
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-[#a1a1aa] dark:text-[#555]">
          Publish the survey to get a shareable link.
        </p>
      )}

      {/* ── Preview ── */}
      <SectionDivider label="Preview" />

      <button
        onClick={onPreview}
        className="flex items-center gap-2 w-full text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] px-3 py-2.5 rounded transition-colors"
      >
        <Play size={11} />
        <span className="flex-1 text-left">Preview survey</span>
        <ExternalLink size={10} className="text-[#a1a1aa] dark:text-[#444]" />
      </button>

      {/* ── Export ── */}
      <SectionDivider label="Export" />

      <div className="flex flex-col gap-2">
        <button
          onClick={onExportJson}
          className="flex items-center gap-2 w-full text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] px-3 py-2.5 rounded transition-colors"
        >
          <FileJson size={11} />
          <div className="flex-1 text-left">
            <div>Download as JSON</div>
            <div className="text-[10px] text-[#a1a1aa] dark:text-[#444] mt-0.5">Full survey definition — blocks, edges, settings</div>
          </div>
          <Download size={10} className="text-[#a1a1aa] dark:text-[#444] shrink-0" />
        </button>

        <button
          onClick={onExportCsv}
          className="flex items-center gap-2 w-full text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] px-3 py-2.5 rounded transition-colors"
        >
          <FileText size={11} />
          <div className="flex-1 text-left">
            <div>Download field template</div>
            <div className="text-[10px] text-[#a1a1aa] dark:text-[#444] mt-0.5">CSV with question field headers</div>
          </div>
          <Download size={10} className="text-[#a1a1aa] dark:text-[#444] shrink-0" />
        </button>
      </div>

      {/* ── Analytics ── */}
      {isPublished && (
        <>
          <SectionDivider label="Analytics" />
          <a
            href={`/analytics/${surveyId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] px-3 py-2.5 rounded transition-colors"
          >
            <BarChart2 size={11} />
            <span className="flex-1 text-left">View responses & analytics</span>
            <ExternalLink size={10} className="text-[#a1a1aa] dark:text-[#444]" />
          </a>
        </>
      )}

      {/* ── Coming soon ── */}
      <SectionDivider label="Coming soon" />

      <div className="flex flex-col gap-1.5">
        {[
          { icon: QrCode, label: 'QR code download', desc: 'Share via printed materials' },
          { icon: Bell, label: 'Response notifications', desc: 'Email alerts on new submissions' },
          { icon: Clock, label: 'Scheduled publish', desc: 'Set a go-live date and time' },
        ].map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded border border-dashed border-[#e4e4e7] dark:border-[#1a1a1a] opacity-50 cursor-not-allowed"
          >
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
function SurveySettingsContent({
  settings,
  updateSettings,
}: {
  settings: SurveySettings
  updateSettings: (patch: Partial<SurveySettings>) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Theme</label>
        <div className="flex bg-[#f4f4f5] dark:bg-[#1a1a1a] p-1 rounded-lg">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateSettings({ theme: t })}
              className={`flex-1 text-xs py-1.5 rounded capitalize transition-all ${
                settings.theme === t
                  ? 'bg-white dark:bg-[#333] text-[#09090b] dark:text-white shadow-sm'
                  : 'text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Corner Radius</label>
        <div className="flex gap-2">
          {(['none', 'sm', 'full'] as const).map((r) => (
            <button
              key={r}
              onClick={() => updateSettings({ radius: r })}
              className={`flex-1 py-3 border text-xs capitalize transition-all flex items-center justify-center ${
                r === 'none' ? 'rounded-none' : r === 'sm' ? 'rounded-md' : 'rounded-full'
              } ${
                settings.radius === r
                  ? 'border-[#09090b] dark:border-white text-[#09090b] dark:text-white bg-black/5 dark:bg-white/5'
                  : 'border-[#e4e4e7] dark:border-[#333] text-[#71717a] dark:text-[#888] hover:border-[#a1a1aa] dark:hover:border-[#555]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Accent Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={settings.brandColor || '#ffffff'}
            onChange={(e) => updateSettings({ brandColor: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
            style={{ WebkitAppearance: 'none' } as React.CSSProperties}
          />
          <input
            type="text"
            value={settings.brandColor || '#ffffff'}
            onChange={(e) => updateSettings({ brandColor: e.target.value })}
            className="flex-1 text-xs bg-transparent border border-[#e4e4e7] dark:border-[#333] rounded px-3 py-2 text-[#09090b] dark:text-white focus:outline-none focus:border-[#09090b] dark:focus:border-[#888]"
          />
        </div>
      </div>
    </div>
  )
}

// ── Canvas Settings ───────────────────────────────────

type BgOption = {
  id: SurveySettings['canvasBg']
  label: string
  preview: React.ReactNode
}

function DotsSVG() {
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="36" rx="3" className="fill-[#f4f4f5] dark:fill-[#1a1a1a]" />
      {[8, 20, 32, 44].map(x =>
        [8, 20, 32].map(y => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={2} className="fill-[#a1a1aa] dark:fill-[#444]" />
        ))
      )}
    </svg>
  )
}

function LinesSVG() {
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="36" rx="3" className="fill-[#f4f4f5] dark:fill-[#1a1a1a]" />
      {[0, 12, 24, 36, 48].map(x => (
        <line key={`v${x}`} x1={x} y1={0} x2={x} y2={36} className="stroke-[#d4d4d8] dark:stroke-[#333]" strokeWidth={0.5} />
      ))}
      {[0, 12, 24, 36].map(y => (
        <line key={`h${y}`} x1={0} y1={y} x2={52} y2={y} className="stroke-[#d4d4d8] dark:stroke-[#333]" strokeWidth={0.5} />
      ))}
    </svg>
  )
}

function CrossSVG() {
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="36" rx="3" className="fill-[#f4f4f5] dark:fill-[#1a1a1a]" />
      {[12, 26, 40].map(x =>
        [10, 24].map(y => (
          <g key={`${x}-${y}`}>
            <line x1={x - 5} y1={y} x2={x + 5} y2={y} className="stroke-[#a1a1aa] dark:stroke-[#444]" strokeWidth={1.2} />
            <line x1={x} y1={y - 5} x2={x} y2={y + 5} className="stroke-[#a1a1aa] dark:stroke-[#444]" strokeWidth={1.2} />
          </g>
        ))
      )}
    </svg>
  )
}

function NoneSVG() {
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="36" rx="3" className="fill-[#f4f4f5] dark:fill-[#1a1a1a]" />
      <text x="26" y="21" textAnchor="middle" className="fill-[#a1a1aa] dark:fill-[#555]" style={{ fontSize: 9, fontFamily: 'Inter, sans-serif' }}>
        None
      </text>
    </svg>
  )
}

const BG_OPTIONS: BgOption[] = [
  { id: 'dots', label: 'Dots', preview: <DotsSVG /> },
  { id: 'lines', label: 'Grid', preview: <LinesSVG /> },
  { id: 'cross', label: 'Cross', preview: <CrossSVG /> },
  { id: 'none', label: 'None', preview: <NoneSVG /> },
]

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 focus:outline-none ${
        checked
          ? 'bg-[#09090b] dark:bg-white border-[#09090b] dark:border-white'
          : 'bg-transparent border-[#d4d4d8] dark:border-[#333]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 mt-[3px] ${
          checked
            ? 'translate-x-[18px] bg-white dark:bg-black'
            : 'translate-x-[3px] bg-[#a1a1aa] dark:bg-[#555]'
        }`}
      />
    </button>
  )
}

function CanvasSettingsContent({
  settings,
  updateSettings,
}: {
  settings: SurveySettings
  updateSettings: (patch: Partial<SurveySettings>) => void
}) {
  return (
    <div className="flex flex-col gap-7">
      {/* Background pattern */}
      <div className="flex flex-col gap-3">
        <label className={labelCls}>Background Pattern</label>
        <div className="grid grid-cols-2 gap-2">
          {BG_OPTIONS.map((opt) => {
            const isSelected = settings.canvasBg === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => updateSettings({ canvasBg: opt.id })}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-[#09090b] dark:border-white bg-black/5 dark:bg-white/5'
                    : 'border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#444]'
                }`}
              >
                <div className={`rounded overflow-hidden transition-all ${isSelected ? 'ring-[1.5px] ring-[#09090b] dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-[#0a0a0a]' : ''}`}>
                  {opt.preview}
                </div>
                <span className={`text-[10px] tracking-wide ${isSelected ? 'text-[#09090b] dark:text-white font-medium' : 'text-[#888] dark:text-[#555]'}`}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Background dot/line color */}
      {settings.canvasBg !== 'none' && (
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Pattern Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.canvasBgColor || '#1a1a1a'}
              onChange={(e) => updateSettings({ canvasBgColor: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
              style={{ WebkitAppearance: 'none' } as React.CSSProperties}
            />
            <input
              type="text"
              value={settings.canvasBgColor || ''}
              onChange={(e) => updateSettings({ canvasBgColor: e.target.value })}
              placeholder="Auto (theme default)"
              className="flex-1 text-xs bg-transparent border border-[#e4e4e7] dark:border-[#333] rounded px-3 py-2 text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] focus:outline-none focus:border-[#09090b] dark:focus:border-[#888]"
            />
            {settings.canvasBgColor && (
              <button
                onClick={() => updateSettings({ canvasBgColor: '' })}
                className="text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
                title="Reset to default"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <p className="text-[10px] text-[#a1a1aa] dark:text-[#444]">Leave blank to auto-follow theme.</p>
        </div>
      )}

      {/* Minimap */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#09090b] dark:text-white">Minimap</span>
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">Show overview map in bottom-left</span>
        </div>
        <Toggle
          checked={settings.minimap}
          onChange={(v) => updateSettings({ minimap: v })}
        />
      </div>

      {/* Snap to grid */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#09090b] dark:text-white">Snap to Grid</span>
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">Align nodes to a 16px grid</span>
        </div>
        <Toggle
          checked={settings.snapToGrid}
          onChange={(v) => updateSettings({ snapToGrid: v })}
        />
      </div>
    </div>
  )
}

// ── Generate panel content ────────────────────────────────

function GeneratePanelContent({
  prompt, setPrompt, provider, setProvider, loading, error, existingBlockCount, onGenerate,
}: {
  prompt: string
  setPrompt: (s: string) => void
  provider: Provider
  setProvider: (p: Provider) => void
  loading: boolean
  error: string | null
  existingBlockCount: number
  onGenerate: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            disabled={loading}
            className={`flex-1 flex flex-col items-center gap-0.5 px-3 py-2.5 border rounded transition-colors disabled:opacity-50 ${
              provider === p.id
                ? 'border-[#09090b] dark:border-white bg-[#f4f4f5] dark:bg-[#1a1a1a]'
                : 'border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#444]'
            }`}
          >
            <span className={`text-xs font-medium ${provider === p.id ? 'text-[#09090b] dark:text-white' : 'text-[#71717a] dark:text-[#888]'}`}>
              {p.label}
            </span>
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#555] font-mono">{p.sub}</span>
          </button>
        ))}
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onGenerate() }}
        placeholder={EXAMPLES[0]}
        rows={6}
        disabled={loading}
        className="w-full bg-[#fafafa] dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded text-sm text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] px-3 py-2.5 focus:outline-none focus:border-[#a1a1aa] dark:focus:border-[#444] transition-colors resize-none disabled:opacity-50"
      />

      <div>
        <p className="text-[10px] text-[#a1a1aa] dark:text-[#444] mb-1.5">Examples</p>
        <div className="flex flex-col gap-1.5">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              disabled={loading}
              className="text-left text-[11px] text-[#71717a] dark:text-[#666] hover:text-[#09090b] dark:hover:text-[#aaa] transition-colors line-clamp-2 disabled:opacity-50"
            >
              → {ex}
            </button>
          ))}
        </div>
      </div>

      {existingBlockCount > 0 && (
        <p className="text-[11px] text-[#a1a1aa] dark:text-[#555] flex items-start gap-1.5">
          <AlertCircle size={11} className="mt-0.5 shrink-0" />
          This will replace your {existingBlockCount} existing block{existingBlockCount !== 1 ? 's' : ''}.
        </p>
      )}

      {error && (
        <p className="text-[11px] text-red-500 flex items-start gap-1.5">
          <AlertCircle size={11} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-[#a1a1aa] dark:text-[#444]">
          <kbd className="font-mono bg-[#f4f4f5] dark:bg-[#1a1a1a] px-1 rounded">⌘↵</kbd> generate
        </span>
        <Button
          size="sm"
          onClick={onGenerate}
          disabled={!prompt.trim() || loading}
          className="flex items-center gap-1.5"
        >
          {loading ? (
            <><Loader2 size={12} className="animate-spin" /> Generating…</>
          ) : (
            <><Sparkles size={12} /> Generate</>
          )}
        </Button>
      </div>
    </div>
  )
}
