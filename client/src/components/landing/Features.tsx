import { motion } from 'framer-motion'
import { GripVertical, GitBranch, Zap, EyeOff, MessageSquare } from 'lucide-react'

interface Card {
  icon: React.ReactNode
  title: string
  description: string
  wide?: boolean
}

const CARDS: Card[] = [
  {
    icon: <GripVertical size={18} />,
    title: 'Drag-and-drop builder',
    description: 'Arrange blocks visually. No code, no config.',
    wide: true,
  },
  {
    icon: <GitBranch size={18} />,
    title: 'Logic blocks',
    description: 'If / else and switch routing built in.',
  },
  {
    icon: <Zap size={18} />,
    title: 'One-click publish',
    description: 'Hit publish. Get a link. Done.',
  },
  {
    icon: <EyeOff size={18} />,
    title: 'Hidden fields',
    description: 'Pass UTM params and user context silently.',
  },
  {
    icon: <MessageSquare size={18} />,
    title: 'Recall answers',
    description: 'Reference earlier answers in later questions.',
  },
]

function FeatureCard({ card }: { card: Card }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ willChange: 'transform' }}
      className={`bg-[#f0f0f0] dark:bg-[#0d0d0d] border border-black/8 dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20 transition-colors rounded p-6 flex flex-col gap-4 ${card.wide ? 'md:col-span-2' : ''}`}
    >
      <span className="text-zinc-500">{card.icon}</span>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-black dark:text-white">{card.title}</h3>
        <p className="text-sm text-zinc-600 leading-relaxed">{card.description}</p>
      </div>
    </motion.div>
  )
}

export default function Features() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24" aria-labelledby="features-heading">
      <p
        id="features-heading"
        className="text-xs text-zinc-600 uppercase tracking-widest mb-10"
      >
        Features
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CARDS.map((card) => (
          <FeatureCard key={card.title} card={card} />
        ))}
      </div>
    </section>
  )
}
