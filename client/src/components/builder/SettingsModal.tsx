import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBuilderStore, SurveySettings } from '../../store/builder'

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useBuilderStore((s) => s.settings)
  const updateSettings = useBuilderStore((s) => s.updateSettings)

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-sm bg-white dark:bg-[#0a0a0a] border border-[#e4e4e7] dark:border-[#222] rounded-xl shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-[#f4f4f5] dark:border-[#1a1a1a]">
            <h3 className="font-semibold text-[#09090b] dark:text-white">Survey Settings</h3>
            <button
              onClick={onClose}
              className="text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-6">
            {/* Theme */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[#09090b] dark:text-white">Theme</label>
              <div className="flex bg-[#f4f4f5] dark:bg-[#1a1a1a] p-1 rounded-lg">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateSettings({ theme: t })}
                    className={`flex-1 text-xs py-1.5 rounded capitalize transition-all ${
                      settings.theme === t
                        ? 'bg-white dark:bg-[#333] text-[#09090b] dark:text-white shadow-sm'
                        : 'text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Corner Radius */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[#09090b] dark:text-white">Corner Radius</label>
              <div className="flex gap-2">
                {(['none', 'sm', 'full'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => updateSettings({ radius: r })}
                    className={`flex-1 py-3 border text-xs capitalize transition-all flex items-center justify-center ${
                      r === 'none' ? 'rounded-none' : r === 'sm' ? 'rounded-md' : 'rounded-full'
                    } ${
                      settings.radius === r
                        ? 'border-[#09090b] dark:border-white text-[#09090b] dark:text-white bg-black/5 dark:bg-white/5'
                        : 'border-[#e4e4e7] dark:border-[#333] text-[#71717a] dark:text-[#888] hover:border-[#a1a1aa] dark:hover:border-[#555]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Color */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[#09090b] dark:text-white">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.brandColor || '#ffffff'}
                  onChange={(e) => updateSettings({ brandColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                  style={{
                    WebkitAppearance: 'none',
                  }}
                />
                <input
                  type="text"
                  value={settings.brandColor || '#ffffff'}
                  onChange={(e) => updateSettings({ brandColor: e.target.value })}
                  className="flex-1 text-xs bg-transparent border border-[#e4e4e7] dark:border-[#333] rounded px-3 py-2 text-[#09090b] dark:text-white focus:outline-none focus:border-[#09090b] dark:focus:border-[#888]"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
