import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import type { Edge, Node } from '@xyflow/react'

type Provider = 'gemini' | 'anthropic'

interface GenerateResult {
  title: string
  nodes: Node[]
  edges: Edge[]
}

interface GenerateModalProps {
  open: boolean
  onClose: () => void
  onGenerated: (result: GenerateResult) => void
  existingBlockCount: number
  generate: (prompt: string, model: Provider) => Promise<GenerateResult>
}

const EXAMPLES = [
  'Customer satisfaction survey with NPS. Branch on score: promoters get a "what do you love?" question, detractors get "how can we improve?". End with a thank you.',
  'Employee onboarding feedback with a matrix rating tools, process, and team culture. Add an open text field for suggestions at the end.',
  'Product market fit survey: ask role, company size, how they found us, then how disappointed they would be if we shut down (multiple choice), then a follow-up open question.',
]

const PROVIDERS: { id: Provider; label: string; sub: string }[] = [
  { id: 'gemini',    label: 'Gemini',  sub: 'gemini-2.0-flash' },
  { id: 'anthropic', label: 'Claude',  sub: 'claude-sonnet-4-5' },
]

export function GenerateModal({
  open, onClose, onGenerated, existingBlockCount, generate,
}: GenerateModalProps) {
  const [prompt, setPrompt] = useState('')
  const [provider, setProvider] = useState<Provider>('gemini')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!prompt.trim() || loading) return
    setError(null)
    setLoading(true)
    try {
      const result = await generate(prompt.trim(), provider)
      onGenerated(result)
      setPrompt('')
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Generation failed. Try rephrasing your prompt.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGenerate()
    if (e.key === 'Escape') onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 dark:bg-black/70 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl bg-white dark:bg-[#0a0a0a] border border-[#e4e4e7] dark:border-[#222] rounded-lg p-6 shadow-xl dark:shadow-none"
            initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-50%' }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#f4f4f5] dark:bg-[#1a1a1a] flex items-center justify-center">
                  <Sparkles size={14} className="text-[#09090b] dark:text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-[#09090b] dark:text-white">Build with AI</h2>
                  <p className="text-[11px] text-[#a1a1aa] dark:text-[#555]">Describe your survey in plain English</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Model picker */}
            <div className="flex gap-2 mb-4">
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

            {/* Textarea */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKey}
              placeholder={EXAMPLES[0]}
              rows={5}
              disabled={loading}
              className="w-full bg-[#fafafa] dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded text-sm text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] px-3 py-2.5 focus:outline-none focus:border-[#a1a1aa] dark:focus:border-[#444] transition-colors resize-none disabled:opacity-50"
            />

            {/* Example prompts */}
            <div className="mt-2 mb-4">
              <p className="text-[10px] text-[#a1a1aa] dark:text-[#444] mb-1.5">Examples</p>
              <div className="flex flex-col gap-1">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(ex)}
                    disabled={loading}
                    className="text-left text-[11px] text-[#71717a] dark:text-[#666] hover:text-[#09090b] dark:hover:text-[#aaa] transition-colors truncate disabled:opacity-50"
                  >
                    → {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Warning if existing blocks */}
            {existingBlockCount > 0 && (
              <p className="text-[11px] text-[#a1a1aa] dark:text-[#555] mb-3 flex items-center gap-1.5">
                <AlertCircle size={11} />
                This will replace your {existingBlockCount} existing block{existingBlockCount !== 1 ? 's' : ''}.
              </p>
            )}

            {/* Error */}
            {error && (
              <p className="text-[11px] text-red-500 mb-3 flex items-center gap-1.5">
                <AlertCircle size={11} /> {error}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#a1a1aa] dark:text-[#444]">
                <kbd className="font-mono bg-[#f4f4f5] dark:bg-[#1a1a1a] px-1 rounded">⌘↵</kbd> generate
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleGenerate}
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
