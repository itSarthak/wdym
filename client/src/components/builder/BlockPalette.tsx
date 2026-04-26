import {
  GitBranch, GitMerge, HelpCircle, Square,
  Star, AlignLeft, Grid3X3, EyeOff, CornerDownRight,
} from 'lucide-react'
import { BlockType } from '../../store/builder'

const BLOCKS: { type: BlockType; label: string; description: string; icon: React.ReactNode }[] = [
  { type: 'question',     label: 'Question',     description: 'Text, choice, or rating',   icon: <HelpCircle size={13} /> },
  { type: 'rating',       label: 'Rating',        description: 'NPS 0–10 or Stars',         icon: <Star size={13} /> },
  { type: 'statement',    label: 'Statement',     description: 'Display-only text',         icon: <AlignLeft size={13} /> },
  { type: 'matrix',       label: 'Matrix',        description: 'Rate multiple items',       icon: <Grid3X3 size={13} /> },
  { type: 'recall',       label: 'Recall',        description: 'Pipe a previous answer',    icon: <CornerDownRight size={13} /> },
  { type: 'hidden_field', label: 'Hidden Field',  description: 'Capture URL params',        icon: <EyeOff size={13} /> },
  { type: 'if_else',      label: 'If / Else',     description: 'Branch on condition',       icon: <GitBranch size={13} /> },
  { type: 'switch',       label: 'Switch',        description: 'Multi-branch on field',     icon: <GitMerge size={13} /> },
  { type: 'end',          label: 'End',           description: 'Terminal block',            icon: <Square size={13} /> },
]

export function BlockPalette() {
  function onDragStart(event: React.DragEvent, type: BlockType) {
    event.dataTransfer.setData('block-type', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-44 shrink-0 h-full border-r border-[#f4f4f5] dark:border-[#111] bg-white dark:bg-black flex flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <p className="text-[10px] text-[#a1a1aa] dark:text-[#444] uppercase tracking-widest px-1">Blocks</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 flex flex-col gap-1">
        {BLOCKS.map((block) => (
          <div
            key={block.type}
            draggable
            onDragStart={(e) => onDragStart(e, block.type)}
            className="flex items-center gap-2.5 px-2.5 py-2 bg-white dark:bg-[#0a0a0a] border border-[#f4f4f5] dark:border-[#1a1a1a] rounded cursor-grab active:cursor-grabbing hover:border-[#e4e4e7] dark:hover:border-[#222] hover:bg-[#fafafa] dark:hover:bg-[#111] transition-colors select-none"
          >
            <span className="text-[#71717a] dark:text-[#888] shrink-0">{block.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#09090b] dark:text-white leading-tight">{block.label}</p>
              <p className="text-[9px] text-[#a1a1aa] dark:text-[#444] leading-tight truncate">{block.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
