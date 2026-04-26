import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      toggle: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      set: (theme) => set({ theme }),
    }),
    { name: "wdym-theme" },
  ),
);

export function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  } else {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
  }
}
