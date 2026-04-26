import { useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Eye, CheckCircle2, XCircle, TrendingUp, Users,
  ChevronDown, ChevronUp, Loader2, ArrowDown, SlidersHorizontal, Download
} from 'lucide-react'
import { api } from '../lib/api'
import { ThemeToggle } from '../components/ui/ThemeToggle'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BlockConfig {
  label?: string
  text?: string
  field?: string
  questionType?: string
  style?: string
  rows?: string[]
  columns?: string[]
  options?: string[]
  // if_else fields
  operator?: string
  value?: string
  // switch fields
  cases?: { value: string; label: string }[]
  // end field
  message?: string
}

interface Block {
  id: string
  data: { blockType: string; config: BlockConfig }
}

interface SurveyEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  label?: string
}

interface AnalyticsResponse {
  id: string
  createdAt: string
  answers: Record<string, unknown>
}

interface AnalyticsData {
  title: string
  views: number
  blocks: Block[]
  edges: SurveyEdge[]
  publishedAt: string | null
  published: boolean
  stats: {
    views: number
    completed: number
    started: number
    forfeited: number
    completionRate: number
    viewToStart: number
  }
  dropOff: { blockId: string; count: number }[]
  responses: AnalyticsResponse[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function blockLabel(block: Block): string {
  const cfg = block.data.config
  switch (block.data.blockType) {
    case 'statement':    return cfg.text?.slice(0, 50) || 'Statement'
    case 'hidden_field': return `Hidden: {{${cfg.field}}}`
    default:             return cfg.label || block.data.blockType
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function npsColor(n: number, intensity: number): string {
  const a = (0.12 + intensity * 0.73).toFixed(2)
  if (n <= 6) return `rgba(239,68,68,${a})`
  if (n <= 8) return `rgba(234,179,8,${a})`
  return `rgba(34,197,94,${a})`
}

function starsColor(n: number, intensity: number): string {
  const a = (0.12 + intensity * 0.73).toFixed(2)
  const palette = ['', '239,68,68', '249,115,22', '234,179,8', '132,204,22', '34,197,94']
  return `rgba(${palette[n] ?? '156,163,175'},${a})`
}

// ── StatCard ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon }: {
  label: string; value: number | string; sub?: string; icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#f4f4f5] dark:border-[#1a1a1a] rounded-lg">
      <div className="flex items-center gap-1.5 text-[#71717a] dark:text-[#888]">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-[#09090b] dark:text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-[10px] text-[#a1a1aa] dark:text-[#555]">{sub}</p>}
    </div>
  )
}

// ── FunnelChart ────────────────────────────────────────────────────────────────

interface FunnelStep {
  block: Block
  reached: number
  dropped: number
  dropRate: number
  reachPct: number
}

function buildFunnelSteps(
  blocks: Block[],
  dropOff: AnalyticsData['dropOff'],
  stats: AnalyticsData['stats'],
): FunnelStep[] {
  const interactive = blocks.filter((b) =>
    ['question', 'rating', 'matrix'].includes(b.data.blockType)
  )
  const dropMap: Record<string, number> = {}
  dropOff.forEach((d) => { dropMap[d.blockId] = d.count })

  let reached = stats.started
  return interactive.map((block) => {
    const dropped = dropMap[block.id] || 0
    const reachPct = stats.started > 0 ? Math.round((reached / stats.started) * 100) : 0
    const dropRate = reached > 0 && dropped > 0 ? Math.round((dropped / reached) * 100) : 0
    const step: FunnelStep = { block, reached, dropped, dropRate, reachPct }
    reached = Math.max(0, reached - dropped)
    return step
  })
}

function FunnelChart({ blocks, dropOff, stats }: {
  blocks: Block[]
  dropOff: AnalyticsData['dropOff']
  stats: AnalyticsData['stats']
}) {
  if (stats.started === 0) {
    return (
      <p className="text-sm text-[#a1a1aa] dark:text-[#555] py-4">
        No responses yet — the funnel will populate once people start the survey.
      </p>
    )
  }

  const steps = buildFunnelSteps(blocks, dropOff, stats)
  const completionPct = stats.started > 0 ? Math.round((stats.completed / stats.started) * 100) : 0

  const FunnelRow = ({ label, count, pct, delay = 0 }: {
    label: string; count: number; pct: number; delay?: number
  }) => (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#71717a] dark:text-[#888] w-40 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-6 bg-[#f4f4f5] dark:bg-[#1a1a1a] rounded overflow-hidden">
        <motion.div
          className="h-full bg-[#09090b] dark:bg-[#e5e5e5] rounded"
          initial={{ width: 0 }}
          animate={{ width: pct > 0 ? `${pct}%` : '1%' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay }}
        />
      </div>
      <span className="text-xs text-[#a1a1aa] dark:text-[#555] w-20 text-right shrink-0 tabular-nums">
        {count.toLocaleString()} · {pct}%
      </span>
    </div>
  )

  const DropIndicator = ({ dropped, dropRate }: { dropped: number; dropRate: number }) => (
    <div className="flex items-center gap-3 py-0.5">
      <span className="w-40 shrink-0" />
      <div className="flex items-center gap-1.5 text-[10px] text-[#a1a1aa] dark:text-[#444]">
        <ArrowDown size={9} />
        <span>{dropped.toLocaleString()} dropped ({dropRate}%)</span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-1">
      <FunnelRow label="Started" count={stats.started} pct={100} delay={0} />
      {steps.map((step, i) => (
        <div key={step.block.id}>
          <FunnelRow
            label={blockLabel(step.block)}
            count={step.reached}
            pct={step.reachPct}
            delay={(i + 1) * 0.07}
          />
          {step.dropped > 0 && (
            <DropIndicator dropped={step.dropped} dropRate={step.dropRate} />
          )}
        </div>
      ))}
      <FunnelRow
        label="Completed"
        count={stats.completed}
        pct={completionPct}
        delay={(steps.length + 1) * 0.07}
      />
    </div>
  )
}

// ── RatingHeatmap ──────────────────────────────────────────────────────────────

function RatingHeatmap({ nums, style }: { nums: number[]; style: 'nps' | 'stars' }) {
  const range = style === 'nps'
    ? Array.from({ length: 11 }, (_, i) => i)
    : [1, 2, 3, 4, 5]
  const dist: Record<number, number> = {}
  nums.forEach((n) => { dist[n] = (dist[n] || 0) + 1 })
  const maxCount = Math.max(...Object.values(dist), 1)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-1">
        {range.map((v) => {
          const count = dist[v] || 0
          const intensity = count / maxCount
          const bg = style === 'nps' ? npsColor(v, intensity) : starsColor(v, intensity)
          const barH = count > 0 ? Math.max(12, Math.round(intensity * 52) + 12) : 12
          return (
            <div key={v} className="flex flex-col items-center gap-1" style={{ flex: 1, minWidth: 0 }}>
              <span className="text-[8px] leading-none text-[#a1a1aa] dark:text-[#555]">
                {count > 0 ? count : ''}
              </span>
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${barH}px`,
                  backgroundColor: count > 0 ? bg : 'rgba(156,163,175,0.08)',
                }}
              />
              <span className="text-[9px] leading-none text-[#71717a] dark:text-[#888]">{v}</span>
            </div>
          )
        })}
      </div>
      {style === 'nps' && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {[
            { color: 'rgba(239,68,68,0.7)', label: 'Detractors 0–6' },
            { color: 'rgba(234,179,8,0.7)', label: 'Passives 7–8' },
            { color: 'rgba(34,197,94,0.7)', label: 'Promoters 9–10' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1 text-[10px] text-[#a1a1aa] dark:text-[#555]">
              <span className="w-2 h-2 rounded-sm shrink-0 inline-block" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── DistributionBars ───────────────────────────────────────────────────────────

function DistributionBars({ dist, total, keys }: {
  dist: Record<string, number>; total: number; keys: string[]
}) {
  const max = Math.max(...Object.values(dist))
  return (
    <div className="flex flex-col gap-1.5">
      {keys.filter((k) => dist[k] !== undefined).map((key) => {
        const count = dist[key] || 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-[#71717a] dark:text-[#888] w-32 shrink-0 truncate">{key}</span>
            <div className="flex-1 h-1.5 bg-[#f4f4f5] dark:bg-[#1a1a1a] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#09090b] dark:bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: max > 0 ? `${(count / max) * 100}%` : '0%' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#555] w-8 shrink-0 text-right">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

// ── FieldStats ─────────────────────────────────────────────────────────────────

function FieldStats({ block, answers }: { block: Block; answers: unknown[] }) {
  const cfg = block.data.config
  const bt = block.data.blockType

  if (bt === 'rating' && cfg.style === 'nps') {
    const nums = answers.map(Number).filter((n) => !isNaN(n))
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length
    const promoters = nums.filter((n) => n >= 9).length
    const detractors = nums.filter((n) => n <= 6).length
    const nps = Math.round(((promoters - detractors) / nums.length) * 100)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-6">
          <div>
            <p className="text-xl font-semibold text-[#09090b] dark:text-white">{avg.toFixed(1)}</p>
            <p className="text-[10px] text-[#a1a1aa] dark:text-[#555]">Average</p>
          </div>
          <div>
            <p className={`text-xl font-semibold ${nps >= 0 ? 'text-[#09090b] dark:text-white' : 'text-red-500'}`}>
              {nps > 0 ? '+' : ''}{nps}
            </p>
            <p className="text-[10px] text-[#a1a1aa] dark:text-[#555]">NPS score</p>
          </div>
        </div>
        <RatingHeatmap nums={nums} style="nps" />
      </div>
    )
  }

  if (bt === 'rating' && cfg.style === 'stars') {
    const nums = answers.map(Number).filter((n) => !isNaN(n))
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xl font-semibold text-[#09090b] dark:text-white">{avg.toFixed(1)} / 5</p>
        <RatingHeatmap nums={nums} style="stars" />
      </div>
    )
  }

  if (cfg.questionType === 'multiple_choice') {
    const dist: Record<string, number> = {}
    answers.forEach((a) => { const s = String(a); dist[s] = (dist[s] || 0) + 1 })
    const keys = Object.keys(dist).sort((a, b) => dist[b] - dist[a])
    return <DistributionBars dist={dist} total={answers.length} keys={keys} />
  }

  if (bt === 'matrix') {
    const rows = cfg.rows || []
    const cols = cfg.columns || []
    const matrixAnswers = answers as Record<string, string>[]
    if (rows.length === 0 || cols.length === 0) return null
    return (
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left pr-4 py-1.5 text-[#a1a1aa] dark:text-[#555] font-normal w-32" />
              {cols.map((c) => (
                <th key={c} className="px-3 py-1.5 text-center text-[#71717a] dark:text-[#888] font-normal whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowAnswers = matrixAnswers.map((a) => a?.[row]).filter(Boolean)
              const dist: Record<string, number> = {}
              rowAnswers.forEach((v) => { dist[v] = (dist[v] || 0) + 1 })
              return (
                <tr key={row} className="border-t border-[#f4f4f5] dark:border-[#1a1a1a]">
                  <td className="pr-4 py-2 text-[#71717a] dark:text-[#888]">{row}</td>
                  {cols.map((col) => {
                    const count = dist[col] || 0
                    const pct = rowAnswers.length > 0 ? Math.round((count / rowAnswers.length) * 100) : 0
                    return (
                      <td key={col} className="px-3 py-2 text-center">
                        <span className={pct > 0 ? 'text-[#09090b] dark:text-white font-medium' : 'text-[#d4d4d8] dark:text-[#333]'}>
                          {pct > 0 ? `${pct}%` : '—'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const texts = answers.map(String).filter(Boolean).slice(0, 5)
  return (
    <div className="flex flex-col gap-2">
      {texts.map((t, i) => (
        <p key={i} className="text-sm text-[#09090b] dark:text-white bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#f4f4f5] dark:border-[#1a1a1a] rounded px-3 py-2 italic">
          "{t}"
        </p>
      ))}
      {answers.length > 5 && (
        <p className="text-[11px] text-[#a1a1aa] dark:text-[#555]">+ {answers.length - 5} more in Responses tab</p>
      )}
    </div>
  )
}

// ── QuestionBreakdown ──────────────────────────────────────────────────────────

function QuestionBreakdown({ blocks, responses }: { blocks: Block[]; responses: AnalyticsResponse[] }) {
  const interactiveBlocks = blocks.filter((b) =>
    ['question', 'rating', 'matrix', 'recall', 'hidden_field'].includes(b.data.blockType)
  )
  if (interactiveBlocks.length === 0 || responses.length === 0) {
    return <p className="text-sm text-[#a1a1aa] dark:text-[#555] py-4">No response data to display yet.</p>
  }
  return (
    <div className="flex flex-col gap-6">
      {interactiveBlocks.map((block) => {
        const field = block.data.config.field
        if (!field) return null
        const rawAnswers = responses
          .map((r) => r.answers[field])
          .filter((v) => v !== undefined && v !== null && v !== '')
        if (rawAnswers.length === 0) return null
        return (
          <div key={block.id} className="border-t border-[#f4f4f5] dark:border-[#1a1a1a] pt-5">
            <p className="text-sm font-medium text-[#09090b] dark:text-white mb-0.5">{blockLabel(block)}</p>
            <p className="text-[10px] text-[#a1a1aa] dark:text-[#555] mb-3">
              {rawAnswers.length} response{rawAnswers.length !== 1 ? 's' : ''}
            </p>
            <FieldStats block={block} answers={rawAnswers} />
          </div>
        )
      })}
    </div>
  )
}

// ── SegmentAnalysis ────────────────────────────────────────────────────────────

interface SegmentDef {
  label: string
  filter: (v: unknown) => boolean
  accentColor: string
}

function getSegments(block: Block): SegmentDef[] {
  const { blockType, config } = block.data
  if (blockType === 'rating' && config.style === 'nps') {
    return [
      { label: 'Detractors (0–6)', filter: (v) => Number(v) <= 6,   accentColor: 'rgba(239,68,68,0.08)' },
      { label: 'Passives (7–8)',   filter: (v) => { const n = Number(v); return n >= 7 && n <= 8 }, accentColor: 'rgba(234,179,8,0.08)' },
      { label: 'Promoters (9–10)', filter: (v) => Number(v) >= 9,   accentColor: 'rgba(34,197,94,0.08)' },
    ]
  }
  if (blockType === 'rating' && config.style === 'stars') {
    return [
      { label: 'Low (1–2)',  filter: (v) => Number(v) <= 2,  accentColor: 'rgba(239,68,68,0.08)' },
      { label: 'Medium (3)', filter: (v) => Number(v) === 3,  accentColor: 'rgba(234,179,8,0.08)' },
      { label: 'High (4–5)', filter: (v) => Number(v) >= 4,  accentColor: 'rgba(34,197,94,0.08)' },
    ]
  }
  const options = config.options || []
  return options.map((opt) => ({
    label: opt,
    filter: (v: unknown) => String(v) === opt,
    accentColor: 'transparent',
  }))
}

function MiniFieldStats({ block, answers }: { block: Block; answers: unknown[] }) {
  const { blockType, config } = block.data
  if (answers.length === 0) return null

  if (blockType === 'rating') {
    const nums = answers.map(Number).filter((n) => !isNaN(n))
    const avg = nums.reduce((a, b) => a + b, 0) / (nums.length || 1)
    return (
      <p className="text-sm font-medium text-[#09090b] dark:text-white">
        {avg.toFixed(1)}
        <span className="text-[10px] font-normal text-[#a1a1aa] dark:text-[#555] ml-1">
          {config.style === 'stars' ? '/ 5 avg' : 'avg'}
        </span>
      </p>
    )
  }

  if (config.questionType === 'multiple_choice') {
    const dist: Record<string, number> = {}
    answers.forEach((a) => { const s = String(a); dist[s] = (dist[s] || 0) + 1 })
    const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const total = answers.length
    return (
      <div className="flex flex-col gap-1">
        {top.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <div className="w-16 h-1 bg-[#f4f4f5] dark:bg-[#1a1a1a] rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-[#09090b] dark:bg-white rounded-full"
                style={{ width: `${Math.round((v / total) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-[#71717a] dark:text-[#888] truncate flex-1">{k}</span>
            <span className="text-[10px] text-[#a1a1aa] dark:text-[#555] shrink-0">
              {Math.round((v / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    )
  }

  const sample = answers.map(String).filter(Boolean)[0]
  return sample ? (
    <p className="text-[11px] text-[#71717a] dark:text-[#888] italic line-clamp-2">"{sample}"</p>
  ) : null
}

function SegmentAnalysis({ blocks, responses }: { blocks: Block[]; responses: AnalyticsResponse[] }) {
  const segmentableBlocks = blocks.filter((b) => {
    if (!b.data.config.field) return false
    if (b.data.blockType === 'rating') return true
    if (b.data.blockType === 'question' && b.data.config.questionType === 'multiple_choice') return true
    return false
  })

  const [segmentBlockId, setSegmentBlockId] = useState<string>(segmentableBlocks[0]?.id || '')
  const activeBlock = segmentableBlocks.find((b) => b.id === segmentBlockId) ?? segmentableBlocks[0]

  if (segmentableBlocks.length === 0) {
    return (
      <p className="text-sm text-[#a1a1aa] dark:text-[#555] py-4">
        Add rating or choice questions to enable segment analysis.
      </p>
    )
  }

  if (responses.length === 0) {
    return <p className="text-sm text-[#a1a1aa] dark:text-[#555] py-4">No completed responses to analyze yet.</p>
  }

  const segments = getSegments(activeBlock)
  const field = activeBlock.data.config.field!

  const segmentedGroups = segments.map((seg) => ({
    ...seg,
    responses: responses.filter((r) => {
      const v = r.answers[field]
      return v !== undefined && v !== null && v !== '' && seg.filter(v)
    }),
  }))

  const otherBlocks = blocks.filter((b) =>
    b.id !== activeBlock.id &&
    ['question', 'rating', 'matrix'].includes(b.data.blockType) &&
    b.data.config.field
  )

  const colCount = segmentedGroups.length
  const gridClass =
    colCount === 2 ? 'grid-cols-2' :
    colCount === 3 ? 'grid-cols-3' :
    'grid-cols-2'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <SlidersHorizontal size={12} className="text-[#a1a1aa] dark:text-[#555] shrink-0" />
        <span className="text-xs text-[#a1a1aa] dark:text-[#555]">Segment by</span>
        <select
          value={segmentBlockId}
          onChange={(e) => setSegmentBlockId(e.target.value)}
          className="text-xs bg-white dark:bg-[#0a0a0a] border border-[#e4e4e7] dark:border-[#1a1a1a] rounded px-2 py-1 text-[#09090b] dark:text-white outline-none focus:ring-1 focus:ring-[#09090b]/20 dark:focus:ring-white/20"
        >
          {segmentableBlocks.map((b) => (
            <option key={b.id} value={b.id}>{blockLabel(b)}</option>
          ))}
        </select>
      </div>

      <div className={`grid gap-3 ${gridClass}`}>
        {segmentedGroups.map(({ label, responses: segResponses, accentColor }) => (
          <div
            key={label}
            className="border border-[#f4f4f5] dark:border-[#1a1a1a] rounded-lg p-4 flex flex-col gap-4"
            style={{ backgroundColor: accentColor }}
          >
            <div>
              <p className="text-xs font-medium text-[#09090b] dark:text-white">{label}</p>
              <p className="text-[10px] text-[#a1a1aa] dark:text-[#555]">
                {segResponses.length} resp
                {responses.length > 0
                  ? ` · ${Math.round((segResponses.length / responses.length) * 100)}% of total`
                  : ''}
              </p>
            </div>

            {otherBlocks.length === 0 ? (
              <p className="text-[11px] text-[#a1a1aa] dark:text-[#444]">No other questions to compare.</p>
            ) : (
              otherBlocks.slice(0, 4).map((blk) => {
                const f = blk.data.config.field!
                const ans = segResponses
                  .map((r) => r.answers[f])
                  .filter((v) => v !== undefined && v !== null && v !== '')
                if (ans.length === 0) return (
                  <div key={blk.id}>
                    <p className="text-[10px] text-[#71717a] dark:text-[#888] mb-1 truncate">{blockLabel(blk)}</p>
                    <p className="text-[10px] text-[#a1a1aa] dark:text-[#444]">No data</p>
                  </div>
                )
                return (
                  <div key={blk.id}>
                    <p className="text-[10px] text-[#71717a] dark:text-[#888] mb-1.5 truncate">{blockLabel(blk)}</p>
                    <MiniFieldStats block={blk} answers={ans} />
                  </div>
                )
              })
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Logic Debugger ─────────────────────────────────────────────────────────────

type TraceStatus =
  | 'answered'
  | 'skipped'
  | 'shown'
  | 'branch_true'
  | 'branch_false'
  | 'switch_match'
  | 'switch_miss'
  | 'terminal'

interface TraceStep {
  blockId: string
  blockType: string
  label: string
  status: TraceStatus
  answer?: unknown
  conditionText?: string
  conditionResult?: boolean
  matchedCase?: string
  branchTaken?: string
  skippedBranchLabel?: string
  skippedBranchTarget?: string
}

function evaluateCondition(answer: unknown, operator: string, value: string): boolean {
  const a = String(answer ?? '')
  switch (operator) {
    case 'equals':       return a === value
    case 'not_equals':   return a !== value
    case 'contains':     return a.toLowerCase().includes(value.toLowerCase())
    case 'greater_than': return Number(a) > Number(value)
    case 'less_than':    return Number(a) < Number(value)
    default:             return false
  }
}

const OPERATOR_LABELS: Record<string, string> = {
  equals: '=', not_equals: '≠', contains: 'contains',
  greater_than: '>', less_than: '<',
}

function buildTraceSteps(
  blocks: Block[],
  edges: SurveyEdge[],
  answers: Record<string, unknown>,
): TraceStep[] {
  const blockMap = new Map(blocks.map((b) => [b.id, b]))
  const outgoing = new Map<string, SurveyEdge[]>()
  edges.forEach((e) => {
    if (!outgoing.has(e.source)) outgoing.set(e.source, [])
    outgoing.get(e.source)!.push(e)
  })

  const hasIncoming = new Set(edges.map((e) => e.target))
  const startBlock = blocks.find((b) => !hasIncoming.has(b.id)) ?? blocks[0]
  if (!startBlock) return []

  const steps: TraceStep[] = []
  const visited = new Set<string>()
  let currentId: string | undefined = startBlock.id

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const block = blockMap.get(currentId)
    if (!block) break

    const cfg = block.data.config
    const bt = block.data.blockType
    const outs: SurveyEdge[] = outgoing.get(currentId) ?? []

    // ── if_else ──────────────────────────────────────────────────────────────
    if (bt === 'if_else') {
      const field = cfg.field ?? ''
      const operator = cfg.operator ?? 'equals'
      const compareValue = cfg.value ?? ''
      const answer = answers[field]
      const result = evaluateCondition(answer, operator, compareValue)
      const takenHandle = result ? 'true' : 'false'
      const skippedHandle = result ? 'false' : 'true'
      const takenEdge: SurveyEdge | undefined = outs.find((e: SurveyEdge) => e.sourceHandle === takenHandle) ?? outs[0]
      const skippedEdge: SurveyEdge | undefined = outs.find((e: SurveyEdge) => e.sourceHandle === skippedHandle)
      const skippedBlock = skippedEdge?.target ? blockMap.get(skippedEdge.target) : undefined

      steps.push({
        blockId: block.id,
        blockType: bt,
        label: `If ${field} ${OPERATOR_LABELS[operator] ?? operator} "${compareValue}"`,
        status: result ? 'branch_true' : 'branch_false',
        answer,
        conditionText: `${field} ${OPERATOR_LABELS[operator] ?? operator} "${compareValue}"`,
        conditionResult: result,
        branchTaken: result ? 'Yes' : 'No',
        skippedBranchLabel: result ? 'No' : 'Yes',
        skippedBranchTarget: skippedBlock ? blockLabel(skippedBlock) : undefined,
      })
      currentId = takenEdge?.target
      continue
    }

    // ── switch ────────────────────────────────────────────────────────────────
    if (bt === 'switch') {
      const field = cfg.field ?? ''
      const cases = cfg.cases ?? []
      const answer = String(answers[field] ?? '')
      const matched = cases.find((c) => c.value === answer)
      const takenEdge: SurveyEdge | undefined = matched ? outs.find((e: SurveyEdge) => e.sourceHandle === matched.value) : undefined

      steps.push({
        blockId: block.id,
        blockType: bt,
        label: `Route on ${field}`,
        status: matched ? 'switch_match' : 'switch_miss',
        answer,
        matchedCase: matched?.label,
        branchTaken: matched?.label,
      })
      currentId = takenEdge?.target
      continue
    }

    // ── end ───────────────────────────────────────────────────────────────────
    if (bt === 'end') {
      steps.push({
        blockId: block.id,
        blockType: bt,
        label: cfg.message?.slice(0, 60) || 'End',
        status: 'terminal',
      })
      currentId = undefined
      continue
    }

    // ── statement ─────────────────────────────────────────────────────────────
    if (bt === 'statement') {
      steps.push({
        blockId: block.id,
        blockType: bt,
        label: cfg.text?.slice(0, 60) || 'Statement',
        status: 'shown',
      })
      currentId = outs[0]?.target
      continue
    }

    // ── interactive blocks ────────────────────────────────────────────────────
    const field = cfg.field
    const answer = field ? answers[field] : undefined
    const hasAnswer = answer !== undefined && answer !== null && answer !== ''

    steps.push({
      blockId: block.id,
      blockType: bt,
      label: blockLabel(block),
      status: hasAnswer ? 'answered' : 'skipped',
      answer,
    })
    currentId = outs[0]?.target
  }

  return steps
}

// ── StepDot ───────────────────────────────────────────────────────────────────

function StepDot({ status }: { status: TraceStatus }) {
  if (status === 'answered' || status === 'terminal') {
    return (
      <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 bg-[#09090b] dark:bg-white" />
    )
  }
  if (status === 'shown') {
    return (
      <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 border border-[#d4d4d8] dark:border-[#444]" />
    )
  }
  if (status === 'skipped') {
    return (
      <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 border border-dashed border-[#d4d4d8] dark:border-[#333]" />
    )
  }
  if (status === 'branch_true') {
    return (
      <div
        className="w-2.5 h-2.5 mt-1 shrink-0"
        style={{
          transform: 'rotate(45deg)',
          backgroundColor: 'rgba(34,197,94,0.2)',
          border: '1px solid rgba(34,197,94,0.7)',
          borderRadius: 2,
        }}
      />
    )
  }
  if (status === 'branch_false') {
    return (
      <div
        className="w-2.5 h-2.5 mt-1 shrink-0"
        style={{
          transform: 'rotate(45deg)',
          backgroundColor: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.6)',
          borderRadius: 2,
        }}
      />
    )
  }
  if (status === 'switch_match' || status === 'switch_miss') {
    return (
      <div
        className="w-2.5 h-2.5 mt-1 shrink-0"
        style={{
          transform: 'rotate(45deg)',
          backgroundColor: 'rgba(234,179,8,0.15)',
          border: '1px solid rgba(234,179,8,0.6)',
          borderRadius: 2,
        }}
      />
    )
  }
  return <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 bg-[#d4d4d8] dark:bg-[#333]" />
}

// ── StepContent ───────────────────────────────────────────────────────────────

function StepContent({ step }: { step: TraceStep }) {
  const fmt = (v: unknown) => {
    if (v === undefined || v === null || v === '') return 'no answer'
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  const typeLabel = step.blockType.replace('_', ' ')

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-[#09090b] dark:text-white leading-snug">{step.label}</span>
        <span className="text-[9px] uppercase tracking-wider text-[#a1a1aa] dark:text-[#444] bg-[#f4f4f5] dark:bg-[#111] px-1.5 py-0.5 rounded shrink-0">
          {typeLabel}
        </span>
      </div>

      {step.status === 'answered' && (
        <p className="text-[11px] text-[#71717a] dark:text-[#888]">
          answered{' '}
          <span className="text-[#09090b] dark:text-[#ccc] font-medium">"{fmt(step.answer)}"</span>
        </p>
      )}

      {step.status === 'skipped' && (
        <p className="text-[11px] text-[#a1a1aa] dark:text-[#555] italic">no answer recorded</p>
      )}

      {step.status === 'shown' && (
        <p className="text-[11px] text-[#a1a1aa] dark:text-[#555]">displayed, no input required</p>
      )}

      {step.status === 'terminal' && (
        <p className="text-[11px] text-[#a1a1aa] dark:text-[#555]">survey complete</p>
      )}

      {(step.status === 'branch_true' || step.status === 'branch_false') && (
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] text-[#71717a] dark:text-[#888]">
            answer: <span className="text-[#09090b] dark:text-[#ccc] font-medium">"{fmt(step.answer)}"</span>
          </p>
          <p className="text-[11px]">
            condition{' '}
            <span
              style={{
                color: step.conditionResult
                  ? 'rgba(34,197,94,0.9)'
                  : 'rgba(239,68,68,0.9)',
              }}
            >
              {step.conditionResult ? 'TRUE' : 'FALSE'}
            </span>
            {' '}→ took{' '}
            <span className="text-[#09090b] dark:text-[#ccc] font-medium">"{step.branchTaken}"</span> branch
          </p>
          {step.skippedBranchLabel && (
            <p className="text-[11px] text-[#a1a1aa] dark:text-[#444]">
              skipped "{step.skippedBranchLabel}" branch
              {step.skippedBranchTarget && (
                <span> → {step.skippedBranchTarget}</span>
              )}
            </p>
          )}
        </div>
      )}

      {(step.status === 'switch_match' || step.status === 'switch_miss') && (
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] text-[#71717a] dark:text-[#888]">
            value: <span className="text-[#09090b] dark:text-[#ccc] font-medium">"{fmt(step.answer)}"</span>
          </p>
          {step.status === 'switch_match' ? (
            <p className="text-[11px] text-[#71717a] dark:text-[#888]">
              matched case{' '}
              <span className="text-[#09090b] dark:text-[#ccc] font-medium">"{step.matchedCase}"</span>
            </p>
          ) : (
            <p className="text-[11px] text-[#a1a1aa] dark:text-[#555] italic">
              no case matched — survey stopped here
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── DebugTrace ────────────────────────────────────────────────────────────────

function DebugTrace({ blocks, edges, response }: {
  blocks: Block[]
  edges: SurveyEdge[]
  response: AnalyticsResponse
}) {
  const steps = buildTraceSteps(blocks, edges, response.answers)

  if (steps.length === 0) {
    return (
      <p className="text-xs text-[#a1a1aa] dark:text-[#555] py-2">
        No trace available — survey has no connected blocks.
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <div key={`${step.blockId}-${i}`} className="flex gap-3">
            <div className="flex flex-col items-center" style={{ width: 12 }}>
              <StepDot status={step.status} />
              {!isLast && (
                <div className="w-px flex-1 mt-1 bg-[#f4f4f5] dark:bg-[#1a1a1a]" />
              )}
            </div>
            <div className={`pb-4 flex-1 min-w-0 ${isLast ? 'pb-1' : ''}`}>
              <StepContent step={step} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── ResponseRow ────────────────────────────────────────────────────────────────

function ResponseRow({ response, blocks, edges }: {
  response: AnalyticsResponse
  blocks: Block[]
  edges: SurveyEdge[]
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'answers' | 'trace'>('answers')
  const fieldBlocks = blocks.filter((b) => b.data.config.field)
  const fieldMap = Object.fromEntries(fieldBlocks.map((b) => [b.data.config.field!, b]))

  return (
    <div className="border border-[#f4f4f5] dark:border-[#1a1a1a] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors text-left"
      >
        <span className="text-xs text-[#71717a] dark:text-[#888]">{formatDate(response.createdAt)}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">
            {Object.keys(response.answers).length} field{Object.keys(response.answers).length !== 1 ? 's' : ''}
          </span>
          {open
            ? <ChevronUp size={12} className="text-[#a1a1aa] dark:text-[#555]" />
            : <ChevronDown size={12} className="text-[#a1a1aa] dark:text-[#555]" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {/* View toggle */}
            <div className="border-t border-[#f4f4f5] dark:border-[#1a1a1a] flex">
              {(['answers', 'trace'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-2 text-[11px] transition-colors border-b ${
                    view === v
                      ? 'text-[#09090b] dark:text-white border-[#09090b] dark:border-white'
                      : 'text-[#a1a1aa] dark:text-[#555] border-transparent hover:text-[#71717a] dark:hover:text-[#888]'
                  }`}
                >
                  {v === 'trace' ? 'Logic trace' : 'Answers'}
                </button>
              ))}
            </div>

            {view === 'answers' ? (
              <div className="divide-y divide-[#f4f4f5] dark:divide-[#1a1a1a]">
                {Object.entries(response.answers).map(([f, value]) => {
                  const block = fieldMap[f]
                  const label = block ? blockLabel(block) : f
                  const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
                  return (
                    <div key={f} className="px-4 py-2.5 flex items-start gap-4">
                      <span className="text-[11px] text-[#a1a1aa] dark:text-[#555] w-36 shrink-0 mt-0.5 truncate">{label}</span>
                      <span className="text-xs text-[#09090b] dark:text-white">{displayValue}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-4 py-4">
                <DebugTrace blocks={blocks} edges={edges} response={response} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { id } = useParams({ from: '/analytics/$id' })
  const navigate = useNavigate()
  const [tab, setTab] = useState<'overview' | 'segments' | 'responses'>('overview')

  const { data, isLoading, isError } = useQuery<AnalyticsData>({
    queryKey: ['analytics', id],
    queryFn: () => api.get(`/surveys/${id}/analytics`).then((r) => r.data),
    refetchInterval: 30_000,
  })

  function handleExportCsv() {
    if (!data || data.responses.length === 0) return

    const fields = data.blocks
      .filter((b) => b.data.config.field)
      .map((b) => ({ id: b.data.config.field as string, label: blockLabel(b) }))

    const headers = ['Response ID', 'Submitted At', ...fields.map(f => `"${f.label.replace(/"/g, '""')}"`)]

    const rows = data.responses.map((r) => {
      const row = [
        r.id,
        new Date(r.createdAt).toISOString(),
      ]
      fields.forEach((f) => {
        let val = r.answers[f.id]
        if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val)
        }
        const stringVal = String(val ?? '').replace(/"/g, '""')
        row.push(`"${stringVal}"`)
      })
      return row.join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `survey_${id}_responses.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <Loader2 size={16} className="text-[#d4d4d8] dark:text-[#444] animate-spin" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <p className="text-[#a1a1aa] dark:text-[#555] text-sm">Failed to load analytics.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-[#09090b] dark:text-white">
      <header className="border-b border-[#f4f4f5] dark:border-[#111] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="p-1.5 text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{data.title}</p>
            {data.publishedAt && (
              <p className="text-[10px] text-[#a1a1aa] dark:text-[#555]">
                Published {new Date(data.publishedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            disabled={!data || data.responses.length === 0}
            className="flex items-center gap-1.5 text-xs text-[#09090b] dark:text-white border border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#444] disabled:opacity-50 disabled:cursor-not-allowed px-2.5 h-7 rounded transition-colors"
          >
            <Download size={12} />
            Export CSV
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex gap-1 mb-8 border-b border-[#f4f4f5] dark:border-[#111]">
          {(['overview', 'segments', 'responses'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm transition-colors capitalize relative ${
                tab === t
                  ? 'text-[#09090b] dark:text-white'
                  : 'text-[#a1a1aa] dark:text-[#555] hover:text-[#71717a] dark:hover:text-[#888]'
              }`}
            >
              {t}
              {t === 'responses' && data.stats.completed > 0 && (
                <span className="ml-1.5 text-[10px] bg-[#f4f4f5] dark:bg-[#1a1a1a] text-[#71717a] dark:text-[#888] rounded-full px-1.5 py-0.5">
                  {data.stats.completed}
                </span>
              )}
              {tab === t && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-px bg-[#09090b] dark:bg-white"
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-10"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={<Eye size={14} />} label="Views" value={data.stats.views} />
                <StatCard icon={<Users size={14} />} label="Started" value={data.stats.started} sub={`${data.stats.viewToStart}% of views`} />
                <StatCard icon={<CheckCircle2 size={14} />} label="Completed" value={data.stats.completed} sub={`${data.stats.completionRate}% of started`} />
                <StatCard icon={<XCircle size={14} />} label="Forfeited" value={data.stats.forfeited} sub="Started but didn't finish" />
              </div>

              {data.stats.started > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#71717a] dark:text-[#888] flex items-center gap-1.5">
                      <TrendingUp size={12} /> Completion rate
                    </span>
                    <span className="text-xs font-medium">{data.stats.completionRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#f4f4f5] dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#09090b] dark:bg-white rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${data.stats.completionRate}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Survey funnel</p>
                <p className="text-xs text-[#a1a1aa] dark:text-[#555] mb-4">
                  How respondents progress and drop off through each question
                </p>
                <FunnelChart blocks={data.blocks} dropOff={data.dropOff} stats={data.stats} />
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Response heatmaps</p>
                <p className="text-xs text-[#a1a1aa] dark:text-[#555] mb-4">
                  Distribution of answers per question
                </p>
                <QuestionBreakdown blocks={data.blocks} responses={data.responses} />
              </div>
            </motion.div>
          )}

          {tab === 'segments' && (
            <motion.div
              key="segments"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-sm font-medium mb-1">Segment analysis</p>
              <p className="text-xs text-[#a1a1aa] dark:text-[#555] mb-6">
                Compare how different groups of respondents answered other questions
              </p>
              <SegmentAnalysis blocks={data.blocks} responses={data.responses} />
            </motion.div>
          )}

          {tab === 'responses' && (
            <motion.div
              key="responses"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-2"
            >
              {data.responses.length === 0 ? (
                <p className="text-sm text-[#a1a1aa] dark:text-[#555] py-8 text-center">
                  No completed responses yet.
                </p>
              ) : (
                data.responses.map((r) => (
                  <ResponseRow key={r.id} response={r} blocks={data.blocks} edges={data.edges ?? []} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
