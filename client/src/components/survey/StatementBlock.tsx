import { motion } from 'framer-motion'
import { StatementConfig } from '../../store/builder'
import { Button } from '../ui/Button'

interface StatementBlockProps {
  config: StatementConfig
  onContinue: () => void
}

export function StatementBlock({ config, onContinue }: StatementBlockProps) {
  return (
    <motion.div
      className="flex flex-col gap-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-lg leading-relaxed text-[#09090b] dark:text-white whitespace-pre-wrap">
        {config.text || 'Statement'}
      </p>
      <Button onClick={onContinue} size="sm" className="self-start">
        {config.buttonLabel || 'Continue'} →
      </Button>
    </motion.div>
  )
}
