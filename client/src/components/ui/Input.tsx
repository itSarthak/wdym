import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-xs text-[#71717a] dark:text-[#888] tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'h-9 px-3 text-sm bg-[#fafafa] dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded',
            'text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444]',
            'focus:outline-none focus:border-[#a1a1aa] dark:focus:border-[#444] transition-colors',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
