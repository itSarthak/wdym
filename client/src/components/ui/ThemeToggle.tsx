import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '../../store/theme'
import { AnimatePresence, motion } from 'framer-motion'
import { MouseEvent } from 'react'

export function ThemeToggle({ imagePanel = false }: { imagePanel?: boolean }) {
  const { theme, toggle } = useThemeStore()

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    // @ts-ignore - View Transitions API might not be fully typed in all TS versions
    if (!document.startViewTransition) {
      toggle()
      return
    }

    const { clientX: x, clientY: y } = e
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    )

    document.documentElement.classList.add('theme-transition')

    // @ts-ignore
    const transition = document.startViewTransition(() => {
      toggle()
    })

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      )
    })

    transition.finished.finally(() => {
      document.documentElement.classList.remove('theme-transition')
    })
  }

  return (
    <button
      onClick={handleToggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative flex items-center justify-center w-8 h-8 rounded transition-colors ${
        imagePanel
          ? theme === 'dark'
            ? 'text-white/90 hover:text-white bg-white/15 hover:bg-white/25'
            : 'text-black/70 hover:text-black bg-black/10 hover:bg-black/20'
          : 'text-[#71717a] hover:text-[#09090b] dark:text-[#555] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </motion.div>
      </AnimatePresence>
    </button>
  )
}
