import { create } from 'zustand'

interface SurveyState {
  answers: Record<string, unknown>
  setAnswer: (field: string, value: unknown) => void
  reset: () => void
}

export const useSurveyStore = create<SurveyState>((set) => ({
  answers: {},
  setAnswer: (field, value) =>
    set((s) => ({ answers: { ...s.answers, [field]: value } })),
  reset: () => set({ answers: {} }),
}))
