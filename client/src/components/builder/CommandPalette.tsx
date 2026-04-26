import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import {
  GitBranch, GitMerge, HelpCircle, Square,
  Star, AlignLeft, Grid3X3, EyeOff, CornerDownRight,
} from 'lucide-react'
import { BlockType } from '../../store/builder'

const BLOCKS: { type: BlockType; label: string; description: string; icon: React.ReactNode }[] = [
  { type: 'question',     label: 'Question',     description: 'Text, choice, or rating',   icon: <HelpCircle size={14} /> },
  { type: 'rating',       label: 'Rating',        description: 'NPS 0–10 or Stars',         icon: <Star size={14} /> },
  { type: 'statement',    label: 'Statement',     description: 'Display-only text',         icon: <AlignLeft size={14} /> },
  { type: 'matrix',       label: 'Matrix',        description: 'Rate multiple items',       icon: <Grid3X3 size={14} /> },
  { type: 'recall',       label: 'Recall',        description: 'Pipe a previous answer',    icon: <CornerDownRight size={14} /> },
  { type: 'hidden_field', label: 'Hidden Field',  description: 'Capture URL params',        icon: <EyeOff size={14} /> },
  { type: 'if_else',      label: 'If / Else',     description: 'Branch on condition',       icon: <GitBranch size={14} /> },
  { type: 'switch',       label: 'Switch',        description: 'Multi-branch on field',     icon: <GitMerge size={14} /> },
  { type: 'end',          label: 'End',           description: 'Terminal block',            icon: <Square size={14} /> },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onSelect: (type: BlockType) => void
}

export function CommandPalette({ open, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? BLOCKS.filter((b) =>
        b.label.toLowerCase().includes(query.toLowerCase()) ||
        b.description.toLowerCase().includes(query.toLowerCase())
      )
    : BLOCKS

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setCursor(0)
  }, [query])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(c + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[cursor]) {
        onSelect(filtered[cursor].type)
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            className="fixed left-1/2 top-32 z-50 w-80 bg-white dark:bg-[#0a0a0a] border border-[#e4e4e7] dark:border-[#222] rounded-lg shadow-lg dark:shadow-none overflow-hidden"
            style={{ x: '-50%' }}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.12 }}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f4f4f5] dark:border-[#1a1a1a]">
              <Search size={13} className="text-[#a1a1aa] dark:text-[#555] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search blocks…"
                className="flex-1 bg-transparent text-sm text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#555] focus:outline-none"
              />
              <kbd className="text-[10px] text-[#a1a1aa] dark:text-[#555] bg-[#f4f4f5] dark:bg-[#1a1a1a] px-1.5 py-0.5 rounded font-mono">
                Esc
              </kbd>
            </div>

            {/* Block list */}
            <div className="max-h-72 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="text-xs text-[#a1a1aa] dark:text-[#555] px-3 py-3">No blocks match "{query}"</p>
              ) : (
                filtered.map((block, i) => (
                  <button
                    key={block.type}
                    onClick={() => { onSelect(block.type); onClose() }}
                    onMouseEnter={() => setCursor(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      cursor === i
                        ? 'bg-[#f4f4f5] dark:bg-[#1a1a1a]'
                        : 'hover:bg-[#fafafa] dark:hover:bg-[#111]'
                    }`}
                  >
                    <span className="text-[#71717a] dark:text-[#888] shrink-0">{block.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#09090b] dark:text-white">{block.label}</p>
                      <p className="text-[10px] text-[#a1a1aa] dark:text-[#555] truncate">{block.description}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="px-3 py-2 border-t border-[#f4f4f5] dark:border-[#1a1a1a] flex items-center gap-3">
              <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">
                <kbd className="font-mono bg-[#f4f4f5] dark:bg-[#1a1a1a] px-1 rounded">↑↓</kbd> navigate
              </span>
              <span className="text-[10px] text-[#a1a1aa] dark:text-[#555]">
                <kbd className="font-mono bg-[#f4f4f5] dark:bg-[#1a1a1a] px-1 rounded">↵</kbd> insert
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
