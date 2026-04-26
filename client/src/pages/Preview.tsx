import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2, ArrowLeft, Eye } from 'lucide-react'
import { api } from '../lib/api'
import { PublicSurveyRenderer } from '../components/survey/PublicSurveyRenderer'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export default function Preview() {
  const { id } = useParams({ from: '/preview/$id' })
  const navigate = useNavigate()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: survey, isLoading } = useQuery<any>({
    queryKey: ['survey-preview', id],
    queryFn: () => api.get(`/surveys/${id}`).then((r) => r.data),
  })

  if (isLoading) {
    return (
      <div className="h-screen bg-white dark:bg-black flex items-center justify-center">
        <Loader2 size={16} className="text-[#d4d4d8] dark:text-[#444] animate-spin" />
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="h-screen bg-white dark:bg-black flex items-center justify-center">
        <p className="text-sm text-[#a1a1aa] dark:text-[#555]">Survey not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col">
      <header className="h-12 border-b border-[#f4f4f5] dark:border-[#111] flex items-center justify-between px-4 shrink-0">
        <button
          onClick={() => navigate({ to: '/builder/$id', params: { id } })}
          className="text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex items-center gap-1.5 text-xs text-[#71717a] dark:text-[#888]">
          <Eye size={12} />
          Preview — responses not recorded
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          <PublicSurveyRenderer
            survey={survey}
            onSubmit={() => {}}
            onProgress={() => {}}
            preview
          />
        </div>
      </main>
    </div>
  )
}
