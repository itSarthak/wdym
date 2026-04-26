import { cn } from '../../lib/utils'

interface BadgeProps {
  variant?: 'draft' | 'live'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'draft', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-sm tracking-wide',
        variant === 'draft' &&
          'bg-[#f4f4f5] text-[#71717a] dark:bg-[#222] dark:text-[#888]',
        variant === 'live' &&
          'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0] dark:bg-[#1a1a1a] dark:text-white dark:border-[#333]',
        className
      )}
    >
      {children}
    </span>
  )
}
