import { useState } from 'react'
import { motion } from 'framer-motion'
import { MatrixConfig } from '../../store/builder'
import { Button } from '../ui/Button'

interface MatrixBlockProps {
  config: MatrixConfig
  onAnswer: (value: Record<string, string>) => void
}

export function MatrixBlock({ config, onAnswer }: MatrixBlockProps) {
  const [selections, setSelections] = useState<Record<string, string>>({})

  function submit() {
    if (config.required) {
      const allAnswered = config.rows.every((r) => selections[r])
      if (!allAnswered) return
    }
    onAnswer(selections)
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
        {config.label || 'Matrix'}
        {config.required && <span className="text-[#a1a1aa] dark:text-[#555] ml-1">*</span>}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 text-[#71717a] dark:text-[#888] font-normal text-xs w-40" />
              {config.columns.map((col) => (
                <th key={col} className="text-center py-2 px-3 text-[#71717a] dark:text-[#888] font-normal text-xs whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {config.rows.map((row, ri) => (
              <tr
                key={row}
                className={ri % 2 === 0 ? 'bg-[#fafafa] dark:bg-[#0a0a0a]' : ''}
              >
                <td className="py-2.5 pr-4 text-[#09090b] dark:text-white text-xs">{row}</td>
                {config.columns.map((col) => (
                  <td key={col} className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => setSelections((s) => ({ ...s, [row]: col }))}
                      className={`w-4 h-4 rounded-full border mx-auto flex items-center justify-center transition-colors ${
                        selections[row] === col
                          ? 'border-[#09090b] dark:border-white bg-[#09090b] dark:bg-white'
                          : 'border-[#d4d4d8] dark:border-[#444] hover:border-[#a1a1aa] dark:hover:border-[#666]'
                      }`}
                    >
                      {selections[row] === col && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#111] block" />
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={submit} size="sm" className="self-start">
        Continue →
      </Button>
    </motion.div>
  )
}
