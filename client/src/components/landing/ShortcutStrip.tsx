export default function ShortcutStrip() {
  const shortcuts = [
    { key: "⌘ + S", label: "Auto-saves your survey" },
    { key: "⌘ + P", label: "Publishes instantly" },
    { key: "⌘ + K", label: "Command palette" },
    { key: "⌘ + D", label: "Duplicate block" },
  ]

  return (
    <div className="w-full bg-[#f0f0f0] dark:bg-[#0a0a0a] border-y border-black/5 dark:border-white/5 py-4 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 hide-scrollbar overflow-x-auto whitespace-nowrap">
        <div className="flex items-center justify-center sm:gap-12 gap-8 w-max sm:w-full mx-auto">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <kbd className="bg-black/5 dark:bg-white/8 border border-black/10 dark:border-white/15 rounded text-xs px-2 py-1 font-mono text-black dark:text-white shadow-sm font-medium">
                {s.key}
              </kbd>
              <span className="text-xs text-zinc-500">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
