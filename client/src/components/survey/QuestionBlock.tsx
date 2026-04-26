import { useState } from 'react'
import { motion } from 'framer-motion'
import { QuestionConfig } from '../../store/builder'
import { Button } from '../ui/Button'

interface QuestionBlockProps {
  config: QuestionConfig
  onAnswer: (value: unknown) => void
}

export function QuestionBlock({ config, onAnswer }: QuestionBlockProps) {
  const [value, setValue] = useState<string | number>('')
  const [selected, setSelected] = useState<string>('')

  function submit() {
    const answer = config.questionType === 'multiple_choice' ? selected : value
    if (config.required && !answer) return
    onAnswer(answer)
  }

  return (
    <motion.div
      className="flex flex-col gap-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-lg font-medium leading-snug text-[#09090b] dark:text-white">
        {config.label}
        {config.required && <span className="text-[#a1a1aa] dark:text-[#555] ml-1">*</span>}
      </p>

      {config.questionType === 'text' && (
        <textarea
          className="w-full bg-transparent border-b border-[#d4d4d8] dark:border-[#333] text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] text-sm py-2 focus:outline-none focus:border-[#09090b] dark:focus:border-white transition-colors resize-none"
          rows={3}
          placeholder="Your answer"
          value={value as string}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) submit() }}
        />
      )}

      {config.questionType === 'multiple_choice' && (
        <div className="flex flex-col gap-2">
          {(config.options || []).map((opt) => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className={`text-left px-4 py-2.5 border rounded text-sm transition-colors ${
                selected === opt
                  ? 'border-[#09090b] text-[#09090b] bg-[#f4f4f5] dark:border-white dark:text-white dark:bg-[#111]'
                  : 'border-[#e4e4e7] text-[#71717a] dark:border-[#222] dark:text-[#888] hover:border-[#a1a1aa] dark:hover:border-[#444] hover:text-[#09090b] dark:hover:text-white'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {config.questionType === 'rating' && (
        <div className="flex gap-2">
          {Array.from({ length: config.maxRating ?? 5 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setValue(n)}
              className={`w-10 h-10 border rounded text-sm font-medium transition-colors ${
                value === n
                  ? 'border-[#09090b] text-[#09090b] bg-[#f4f4f5] dark:border-white dark:text-white dark:bg-[#111]'
                  : 'border-[#e4e4e7] text-[#71717a] dark:border-[#222] dark:text-[#888] hover:border-[#a1a1aa] dark:hover:border-[#444] hover:text-[#09090b] dark:hover:text-white'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <Button onClick={submit} size="sm" className="self-start">
        Continue →
      </Button>
    </motion.div>
  )
}
