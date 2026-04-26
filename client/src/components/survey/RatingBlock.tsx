import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { RatingConfig } from '../../store/builder'
import { Button } from '../ui/Button'

interface RatingBlockProps {
  config: RatingConfig
  onAnswer: (value: number) => void
}

export function RatingBlock({ config, onAnswer }: RatingBlockProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  function submit() {
    if (config.required && selected === null) return
    if (selected === null) return
    onAnswer(selected)
  }

  const isNPS = config.style === 'nps'

  return (
    <motion.div
      className="flex flex-col gap-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-lg font-medium leading-snug text-[#09090b] dark:text-white">
        {config.label || 'Rating'}
        {config.required && <span className="text-[#a1a1aa] dark:text-[#555] ml-1">*</span>}
      </p>

      {isNPS ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 11 }, (_, i) => i).map((n) => (
              <button
                key={n}
                onClick={() => setSelected(n)}
                className={`w-10 h-10 border rounded text-sm font-medium transition-colors ${
                  selected === n
                    ? 'border-[#09090b] text-[#09090b] bg-[#f4f4f5] dark:border-white dark:text-white dark:bg-[#111]'
                    : 'border-[#e4e4e7] text-[#71717a] dark:border-[#222] dark:text-[#888] hover:border-[#a1a1aa] dark:hover:border-[#444] hover:text-[#09090b] dark:hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[#a1a1aa] dark:text-[#555]">
            <span>Not likely</span>
            <span>Extremely likely</span>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => {
            const active = (hovered ?? selected ?? 0) >= n
            return (
              <button
                key={n}
                onClick={() => setSelected(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(null)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={28}
                  className={active
                    ? 'text-[#09090b] dark:text-white fill-[#09090b] dark:fill-white'
                    : 'text-[#d4d4d8] dark:text-[#333]'}
                />
              </button>
            )
          })}
        </div>
      )}

      <Button onClick={submit} size="sm" className="self-start">
        Continue →
      </Button>
    </motion.div>
  )
}
