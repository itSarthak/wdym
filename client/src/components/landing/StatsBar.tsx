import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'

const stats = [
  { value: 10000, label: 'Surveys published', format: (v: number) => `${(v/1000).toFixed(0)}k+` },
  { value: 98, label: 'Completion rate', format: (v: number) => `${Math.floor(v)}%` },
  { value: 4, label: 'Avg. publish time', format: (v: number) => `${Math.floor(v)}s` },
  { value: 1, label: 'To go live', format: (v: number) => `1-click` }, // Fixed string for 1-click
]

function StatItem({ value, label, format }: any) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" })
  const count = useMotionValue(0)
  const display = useTransform(count, (latest) => format(latest))

  useEffect(() => {
    if (inView) {
      const controls = animate(count, value, { duration: 1.5, ease: "easeOut" })
      return controls.stop
    }
  }, [inView, value, count])

  return (
    <div ref={ref} className="flex flex-col items-center justify-center p-8 border-r border-black/8 dark:border-white/8 last:border-r-0 max-sm:even:border-r-0 max-sm:[&:nth-child(n+3)]:border-t border-t-black/8 dark:border-t-white/8 sm:border-t-0">
      <motion.div className="text-3xl font-bold tracking-tight text-black dark:text-white">
        {display}
      </motion.div>
      <div className="text-xs text-zinc-500 mt-1 text-center">{label}</div>
    </div>
  )
}

export default function StatsBar() {
  return (
    <section className="w-full border-y border-black/8 dark:border-white/8 bg-transparent">
      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <StatItem key={i} {...stat} />
        ))}
      </div>
    </section>
  )
}
