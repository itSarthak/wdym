import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, Copy, Loader2, Play, Sparkles, Settings2 } from 'lucide-react'
import { api } from '../lib/api'
import { useBuilderStore, BlockNode, SurveySettings } from '../store/builder'
import { DragCanvas } from '../components/builder/DragCanvas'
import { GenerateModal } from '../components/builder/GenerateModal'
import { SettingsModal } from '../components/builder/SettingsModal'
import { Button } from '../components/ui/Button'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { debounce } from '../lib/utils'
import type { Edge, Node } from '@xyflow/react'

interface SurveyData {
  id: string; title: string; blocks: BlockNode[]; edges: Edge[]
  published: boolean; slug: string; settings?: SurveySettings
}

export default function Builder() {
  const { id } = useParams({ from: '/builder/$id' })
  const navigate = useNavigate()
  const store = useBuilderStore()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [titleEditing, setTitleEditing] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        setGenerateOpen(true)
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
      if (surveyData.published) setPublishedUrl(`/s/${surveyData.slug}`)
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
    onSuccess: (res) => setPublishedUrl(res.data.url),
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

  async function generateSurvey(prompt: string, model: 'gemini' | 'anthropic') {
    const res = await api.post(`/surveys/${id}/generate`, { prompt, model })
    return res.data as { title: string; nodes: Node[]; edges: Edge[] }
  }

  function handleGenerated(result: { title: string; nodes: Node[]; edges: Edge[] }) {
    store.loadSurvey(result.nodes as BlockNode[], result.edges, result.title)
    // loadSurvey resets isDirty — flip it back so auto-save fires immediately
    useBuilderStore.setState({ isDirty: true })
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-white dark:bg-black flex items-center justify-center">
        <Loader2 size={16} className="text-[#d4d4d8] dark:text-[#444] animate-spin" />
      </div>
    )
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
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#444] px-2.5 h-7 rounded transition-colors"
            title="Survey Settings"
          >
            <Settings2 size={12} />
            Settings
          </button>

          <button
            onClick={() => window.open(`/preview/${id}`, '_blank')}
            className="flex items-center gap-1.5 text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#444] px-2.5 h-7 rounded transition-colors"
            title="Preview survey"
          >
            <Play size={12} />
            Preview
          </button>

          <button
            onClick={() => setGenerateOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white border border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#444] px-2.5 h-7 rounded transition-colors"
            title="Generate survey with AI (⌘G)"
          >
            <Sparkles size={12} />
            Generate
          </button>

          {publishedUrl ? (
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 text-xs text-[#09090b] dark:text-white border border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#444] px-3 h-7 rounded transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Live ↗'}
            </button>
          ) : (
            <Button size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              {publishMutation.isPending ? 'Publishing…' : 'Publish →'}
            </Button>
          )}
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <DragCanvas />
      </div>

      <GenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerated={handleGenerated}
        existingBlockCount={store.nodes.length}
        generate={generateSurvey}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
