export default function ShortcutStrip() {
  const shortcuts = [
    { key: "⌘ + S", label: "Auto-saves your survey" },
    { key: "⌘ + P", label: "Publishes instantly" },
    { key: "⌘ + K", label: "Command palette" },
    { key: "⌘ + D", label: "Duplicate block" },
  ]

  return (
    <div className="w-full bg-[#fafafa] dark:bg-[#111] border-y border-[#e4e4e7] dark:border-[#222] py-4 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 hide-scrollbar overflow-x-auto whitespace-nowrap">
        <div className="flex items-center justify-center sm:gap-12 gap-8 w-max sm:w-full mx-auto">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <kbd className="bg-[#fafafa] dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded text-xs px-2 py-1 font-mono text-[#09090b] dark:text-white shadow-sm dark:shadow-none font-medium">
                {s.key}
              </kbd>
              <span className="text-xs text-[#71717a] dark:text-[#555]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
