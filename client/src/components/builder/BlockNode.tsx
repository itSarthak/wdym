import { NodeProps, Handle, Position, Node } from '@xyflow/react'
import {
  GitBranch, GitMerge, HelpCircle, Square,
  Star, AlignLeft, Grid3X3, EyeOff, CornerDownRight, X,
} from 'lucide-react'
import { BlockData, SwitchConfig, useBuilderStore } from '../../store/builder'

const ICONS: Record<string, React.ReactNode> = {
  question:     <HelpCircle size={12} />,
  if_else:      <GitBranch size={12} />,
  switch:       <GitMerge size={12} />,
  end:          <Square size={12} />,
  rating:       <Star size={12} />,
  statement:    <AlignLeft size={12} />,
  matrix:       <Grid3X3 size={12} />,
  hidden_field: <EyeOff size={12} />,
  recall:       <CornerDownRight size={12} />,
}

const LABELS: Record<string, string> = {
  question: 'Question', if_else: 'If / Else', switch: 'Switch', end: 'End',
  rating: 'Rating', statement: 'Statement', matrix: 'Matrix',
  hidden_field: 'Hidden Field', recall: 'Recall',
}

export function BlockNode({ id, data, selected }: NodeProps<Node<BlockData>>) {
  const { blockType, config } = data
  const switchCases = blockType === 'switch' ? (config as SwitchConfig).cases : []

  function summary() {
    const c = config as unknown as Record<string, unknown>
    switch (blockType) {
      case 'question':    return (c.label as string) || 'Untitled'
      case 'rating':      return `${(c.label as string) || 'Rating'} · ${c.style === 'nps' ? 'NPS 0–10' : 'Stars'}`
      case 'statement':   return (c.text as string)?.slice(0, 40) || 'Statement'
      case 'matrix':      return (c.label as string) || 'Matrix'
      case 'hidden_field':return `{{${c.field}}} ← ?${c.paramName}`
      case 'recall':      return (c.label as string) || 'Recall'
      case 'if_else': {
        const cc = c as { field: string; operator: string; value: string }
        return cc.field ? `${cc.field} ${cc.operator.replace('_', ' ')} "${cc.value}"` : 'Configure condition'
      }
      case 'switch':      return (c.field as string) ? `on ${c.field}` : 'Configure field'
      case 'end':         return 'End of survey'
      default:            return ''
    }
  }

  const hs = {
    background: '#a1a1aa',
    border: '1px solid #e4e4e7',
    width: 8, height: 8,
  }

  // Blocks with a single output handle
  const singleOutput = ['question', 'rating', 'statement', 'matrix', 'hidden_field', 'recall'].includes(blockType)

  return (
    <div className="min-w-[170px] max-w-[230px] relative" data-node-id={id}>
      <Handle type="target" position={Position.Top} id="in" style={hs} />

      <div
        className={`bg-white dark:bg-[#111] border rounded px-3 py-2.5 transition-colors shadow-sm dark:shadow-none ${
          selected
            ? 'border-[#09090b] dark:border-white'
            : 'border-[#e4e4e7] dark:border-[#222] hover:border-[#a1a1aa] dark:hover:border-[#333]'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#71717a] dark:text-[#888]">{ICONS[blockType]}</span>
          <span className="text-[10px] text-[#a1a1aa] dark:text-[#555] uppercase tracking-widest font-medium">
            {LABELS[blockType]}
          </span>
        </div>
        <p className="text-xs text-[#09090b] dark:text-white truncate">{summary()}</p>
      </div>

      {/* Delete button — visible when selected */}
      {selected && (
        <button
          className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center z-20 transition-colors"
          onMouseDown={(e) => {
            e.stopPropagation()
            useBuilderStore.getState().deleteNode(id)
          }}
          title="Delete block"
        >
          <X size={10} />
        </button>
      )}

      {/* Output handles */}
      {singleOutput && (
        <Handle type="source" position={Position.Bottom} id="out" style={hs} />
      )}
      {blockType === 'if_else' && (
        <>
          <Handle type="source" position={Position.Bottom} id="true"  style={{ ...hs, left: '30%' }} />
          <Handle type="source" position={Position.Bottom} id="false" style={{ ...hs, left: '70%' }} />
        </>
      )}
      {blockType === 'switch' && switchCases.length > 0 &&
        switchCases.map((c, i) => (
          <Handle key={c.value} type="source" position={Position.Bottom} id={c.value}
            style={{ ...hs, left: `${((i + 1) / (switchCases.length + 1)) * 100}%` }} />
        ))}
    </div>
  )
}
