import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Grid, GitBranch, EyeOff, Repeat2, AlignLeft, Circle } from 'lucide-react'

const blocks = [
  {
    id: 'rating',
    name: 'Rating',
    icon: Star,
    desc: 'Capture nuanced feedback with star ratings or NPS scores. Let respondents express how they really feel with a simple click.',
    preview: (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-8 h-8 rounded-full border border-black/20 dark:border-white/20 flex items-center justify-center bg-black/5 dark:bg-white/5">
            <Star size={12} className="text-black/30 dark:text-white/30" />
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'matrix',
    name: 'Matrix',
    icon: Grid,
    desc: 'Group related questions into a single, cohesive grid. Perfect for feature evaluations or multi-dimensional scoring.',
    preview: (
      <div className="grid grid-cols-4 gap-2 w-full max-w-[200px]">
        <div />
        {['A', 'B', 'C'].map((lbl) => (
          <div key={lbl} className="text-[10px] text-center text-black/40 dark:text-white/40">{lbl}</div>
        ))}
        {[1, 2, 3].map((row) => (
          <><div key={'r'+row} className="text-[10px] text-right pr-2 text-black/40 dark:text-white/40 flex items-center justify-end">Q{row}</div>
          {[1,2,3].map((col) => (
            <div key={`${row}-${col}`} className="flex items-center justify-center">
              <Circle size={10} className="text-black/20 dark:text-white/20" />
            </div>
          ))}
          </>
        ))}
      </div>
    )
  },
  {
    id: 'ifelse',
    name: 'If / Else',
    icon: GitBranch,
    desc: 'Build dynamic flows that branch based on conditions. Send promoters one way, and detractors another.',
    preview: (
      <div className="flex flex-col items-center gap-2">
        <div className="px-3 py-1.5 border border-black/10 dark:border-white/10 rounded text-[10px] bg-black/5 dark:bg-white/5">Is score &gt; 8?</div>
        <div className="flex w-16 justify-between border-t border-black/20 dark:border-white/20 h-2 border-r border-l"></div>
        <div className="flex w-[88px] justify-between">
          <div className="px-2 py-1 bg-black/10 dark:bg-white/10 rounded text-[9px]">Yes</div>
          <div className="px-2 py-1 bg-black/10 dark:bg-white/10 rounded text-[9px]">No</div>
        </div>
      </div>
    )
  },
  {
    id: 'hidden',
    name: 'Hidden Field',
    icon: EyeOff,
    desc: 'Silently track metadata like user IDs or campaign source from URL parameters without cluttering the survey.',
    preview: (
      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        <div className="flex items-center justify-between p-2 border border-black/10 dark:border-white/10 shadow-sm rounded bg-black/5 dark:bg-white/5">
          <span className="text-[10px] font-mono text-black/60 dark:text-white/60">?utm_source=</span>
          <div className="px-1.5 bg-black text-white dark:bg-white dark:text-black rounded-sm text-[9px]">hidden</div>
        </div>
      </div>
    )
  },
  {
    id: 'recall',
    name: 'Recall',
    icon: Repeat2,
    desc: 'Personalize questions by piping in previous answers. Bring their own words into the next question.',
    preview: (
      <div className="text-sm font-medium text-black/80 dark:text-white/80">
        Hi <span className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded text-black dark:text-white">{'{{first_name}}'}</span>, tell us more.
      </div>
    )
  },
  {
    id: 'statement',
    name: 'Statement',
    icon: AlignLeft,
    desc: 'Break up the survey with text. Welcome users, add context before a complex section, or say goodbye.',
    preview: (
      <div className="flex flex-col gap-1.5 w-full max-w-[200px]">
        <div className="w-3/4 h-2 bg-black/20 dark:bg-white/20 rounded" />
        <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded" />
        <div className="w-5/6 h-2 bg-black/10 dark:bg-white/10 rounded" />
        <div className="w-16 h-4 bg-black border border-black text-white dark:bg-white dark:text-black rounded mt-2 flex items-center justify-center text-[8px]">Continue</div>
      </div>
    )
  }
]

export default function BlockShowcase() {
  const [active, setActive] = useState(blocks[0].id)
  const activeBlock = blocks.find(b => b.id === active) || blocks[0]

  return (
    <section className="max-w-6xl mx-auto px-6 py-24 sm:py-32 border-b border-black/8 dark:border-white/8">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl tracking-tight font-bold text-black dark:text-white">
          Every block you need.
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
        {/* Left Tabs */}
        <div className="flex flex-row md:flex-col gap-2 w-full md:w-64 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
          {blocks.map((block) => (
            <button
              key={block.id}
              onClick={() => setActive(block.id)}
              className={`text-left px-4 py-2.5 rounded-sm transition-all whitespace-nowrap min-w-max md:min-w-0 ${
                active === block.id
                  ? 'text-black dark:text-white border-l-2 md:border-b-0 border-b-2 border-black dark:border-white font-medium bg-black/5 dark:bg-white/5'
                  : 'text-zinc-500 hover:text-black/80 dark:hover:text-white/80 border-l-2 md:border-b-0 border-b-2 border-transparent hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <block.icon size={16} className={active === block.id ? 'opacity-100' : 'opacity-50'} />
                {block.name}
              </div>
            </button>
          ))}
        </div>

        {/* Right Panel */}
        <div className="flex-1 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-black/10 dark:bg-white/10 blur-[120px] pointer-events-none rounded-full" />
          <div className="relative z-10 bg-black/5 dark:bg-[#111] border border-black/10 dark:border-white/10 rounded-xl p-8 sm:p-12 min-h-[300px] flex flex-col justify-center overflow-hidden h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeBlock.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6"
              >
                <div className="w-12 h-12 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg flex items-center justify-center text-black dark:text-white shadow-sm">
                  <activeBlock.icon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-black dark:text-white">{activeBlock.name}</h3>
                  <p className="text-zinc-500 leading-relaxed max-w-sm">
                    {activeBlock.desc}
                  </p>
                </div>
                <div className="mt-4 p-6 bg-white dark:bg-black border border-black/10 dark:border-white/10 rounded-lg shadow-sm flex items-center justify-center h-48 w-full max-w-sm">
                  {activeBlock.preview}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
