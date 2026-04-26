import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium tracking-tight transition-all disabled:opacity-40 disabled:cursor-not-allowed',
          size === 'md' && 'h-9 px-4 text-sm rounded',
          size === 'sm' && 'h-7 px-3 text-xs rounded',
          variant === 'primary' &&
            'bg-[#09090b] text-white hover:bg-[#27272a] dark:bg-white dark:text-black dark:hover:bg-[#e4e4e7]',
          variant === 'ghost' &&
            'bg-transparent text-[#71717a] border border-[#e4e4e7] hover:border-[#a1a1aa] hover:text-[#09090b] dark:text-[#888] dark:border-[#222] dark:hover:border-[#444] dark:hover:text-white',
          variant === 'danger' &&
            'bg-transparent text-red-500 border border-[#e4e4e7] hover:border-red-400 dark:border-[#222] dark:hover:border-red-500',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
