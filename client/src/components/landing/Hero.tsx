import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import AppPreview from './AppPreview'

// ── Animation variants ─────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden:   { opacity: 0, y: 20 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

// ── Hero ───────────────────────────────────────────────────────────────────────

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center pt-14 bg-white dark:bg-black text-black dark:text-white transition-colors" aria-label="Hero">
      <div className="max-w-6xl mx-auto px-6 w-full py-20 grid lg:grid-cols-2 gap-16 items-center">

        {/* Text column */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          <motion.h1
            variants={itemVariants}
            className="text-6xl lg:text-8xl font-bold tracking-tighter leading-[1.02]"
          >
            surveys that{' '}
            <span className="font-light italic">actually</span>
            <br />get answered.
          </motion.h1>

          <motion.p variants={itemVariants} className="text-zinc-500 text-lg leading-relaxed">
            Logic-first survey builder. Build flows that adapt to every respondent.
          </motion.p>

          <motion.div variants={itemVariants} className="flex gap-3 flex-wrap">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded text-sm font-medium hover:bg-black/90 dark:hover:bg-white/90 transition-colors focus-visible:outline focus-visible:outline-black/50 dark:focus-visible:outline-white/50"
            >
              Get started <ArrowRight size={14} aria-hidden />
            </Link>
            <Link
              to="/s/$slug"
              params={{ slug: 'demo' }}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-black/20 dark:border-white/20 text-black dark:text-white rounded text-sm hover:border-black/40 dark:hover:border-white/40 transition-colors bg-white/5 dark:bg-transparent focus-visible:outline focus-visible:outline-black/50 dark:focus-visible:outline-white/50"
              aria-label="See a live survey demo"
            >
              See it live
            </Link>
          </motion.div>

          <motion.p variants={itemVariants} className="text-xs text-zinc-600">
            Trusted by teams at Stripe, Notion, and Linear.
          </motion.p>
        </motion.div>

        {/* Mock column */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
          className="flex justify-center lg:justify-end relative"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-black/10 dark:bg-white/10 blur-[100px] pointer-events-none rounded-full" />
          <AppPreview />
        </motion.div>

      </div>
    </section>
  )
}
