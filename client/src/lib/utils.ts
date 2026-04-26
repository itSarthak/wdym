export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timer)
    timer = setTimeout(fn, ms)
  }
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
