import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string, workspaces: Workspace[]) => void;
  setWorkspace: (workspace: Workspace) => void;
  addWorkspace: (workspace: Workspace) => void;
  removeWorkspace: (id: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      workspace: null,
      workspaces: [],
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken, workspaces) =>
        set((s) => {
          const kept = s.workspace && workspaces.find(w => w.id === s.workspace?.id)
          return { user, accessToken, refreshToken, workspaces, workspace: kept ?? workspaces[0] ?? null }
        }),
      setWorkspace: (workspace) => set({ workspace }),
      addWorkspace: (workspace) =>
        set((s) => ({
          workspaces: s.workspaces.find(w => w.id === workspace.id) ? s.workspaces : [...s.workspaces, workspace],
          workspace: s.workspace ?? workspace,
        })),
      removeWorkspace: (id) =>
        set((s) => {
          const remaining = s.workspaces.filter(w => w.id !== id)
          return { workspaces: remaining, workspace: s.workspace?.id === id ? (remaining[0] ?? null) : s.workspace }
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, workspace: null, workspaces: [] }),
    }),
    {
      name: "wdym-auth",
      version: 1,
      migrate: (stored: unknown, version) => {
        // v0 had singular `workspace`, v1 has `workspaces[]`
        const s = stored as Record<string, unknown>
        if (version === 0 && s.workspace && !Array.isArray(s.workspaces)) {
          s.workspaces = [s.workspace]
        }
        return s as unknown as AuthState
      },
    },
  ),
);
