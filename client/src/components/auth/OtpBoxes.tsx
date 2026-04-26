import { useEffect, useRef, useState } from 'react'

const LENGTH = 6

export function OtpBoxes({
  onChange,
  autoFocus,
}: {
  onChange: (value: string) => void
  autoFocus?: boolean
}) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''))
  const refs = useRef<Array<HTMLInputElement | null>>(Array(LENGTH).fill(null))

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  function commit(next: string[]) {
    setDigits(next)
    onChange(next.join(''))
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = digit
    commit(next)
    if (digit && i < LENGTH - 1) refs.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...digits]
      if (next[i]) {
        next[i] = ''
        commit(next)
      } else if (i > 0) {
        next[i - 1] = ''
        commit(next)
        refs.current[i - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < LENGTH - 1) {
      refs.current[i + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    const next = Array(LENGTH).fill('').map((_, i) => pasted[i] ?? '')
    commit(next)
    refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus()
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select()
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={digit}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={handleFocus}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          className="w-11 h-11 text-center text-lg font-mono
            bg-[#fafafa] dark:bg-[#111]
            border border-[#e4e4e7] dark:border-[#222] rounded-xl
            text-[#09090b] dark:text-white
            focus:outline-none focus:border-[#a1a1aa] dark:focus:border-[#555]
            transition-colors caret-transparent shrink-0"
        />
      ))}
    </div>
  )
}
