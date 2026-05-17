import { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useThemeStore } from '../../store/theme'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { theme } = useThemeStore()
  const dark = theme === 'dark'

  return (
    <div className="min-h-screen flex">
      {/* Left panel — form, elevated above image panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-black relative min-h-screen z-10 rounded-r-3xl shadow-[8px_0_48px_-4px_rgba(0,0,0,0.12)] dark:shadow-[8px_0_48px_-4px_rgba(0,0,0,0.6)]">
        <Link
          to="/"
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Home
        </Link>

        <div className="flex-1 flex items-center justify-center px-8 py-20">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>

      {/* Right panel — slides left under the form panel's rounded corners */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden select-none bg-black -ml-8">
        {/* bg image — inverts in light mode (white), stays dark in dark mode */}
        <img
          src="/auth-bg.png"
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-[filter] duration-500 ${dark ? '' : 'invert'}`}
        />

        {/* overlay */}
        <div className={`absolute inset-0 transition-colors duration-500 ${dark ? 'bg-black/30' : 'bg-white/20'}`} />

        {/* ThemeToggle — top right, animation ripple starts here */}
        <div className="relative z-10 self-end">
          <ThemeToggle imagePanel />
        </div>

        <div className="relative z-10 space-y-2">
          <p className={`text-sm font-medium leading-relaxed max-w-xs transition-colors duration-500 ${dark ? 'text-white/90' : 'text-black/80'}`}>
            Build surveys that people actually want to answer.
          </p>
          <p className={`text-xs transition-colors duration-500 ${dark ? 'text-white/55' : 'text-black/50'}`}>
            wdym — what do you mean
          </p>
        </div>
      </div>
    </div>
  )
}
