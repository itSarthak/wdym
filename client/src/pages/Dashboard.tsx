import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  LogOut,
  Eye,
  CheckCircle2,
  ArrowUpRight,
  Play,
  CloudOff,
  Settings,
  ChevronDown,
  Check,
  Layers,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import type { Workspace } from "../store/auth";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { formatDate } from "../lib/utils";

interface Survey {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  publishedAt: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
  _count: { responses: number };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, workspace, workspaces, setWorkspace, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleAvatarEnter() {
    if (avatarLeaveTimer.current) clearTimeout(avatarLeaveTimer.current);
    setAvatarOpen(true);
  }

  function handleAvatarLeave() {
    avatarLeaveTimer.current = setTimeout(() => setAvatarOpen(false), 200);
  }

  function handleSwitchWorkspace(w: Workspace) {
    setWorkspace(w)
    setSwitcherOpen(false)
  }

  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: ["surveys", workspace?.id],
    queryFn: () => api.get("/surveys").then((r) => r.data),
    enabled: !!workspace,
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => api.post("/surveys", { title }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      setCreateOpen(false);
      setNewTitle("");
      navigate({ to: "/builder/$id", params: { id: res.data.id } });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/surveys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      setDeleteId(null);
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/surveys/${id}/unpublish`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["surveys"] }),
  });

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-[#09090b] dark:text-white">
      {/* Header */}
      <header className="border-b border-[#f4f4f5] dark:border-[#111] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight">wdym</h1>
          {/* Workspace switcher */}
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen(o => !o)}
              className="flex items-center gap-1 text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white transition-colors border border-[#f4f4f5] dark:border-[#1a1a1a] rounded px-2 py-1"
            >
              <Layers size={11} />
              <span className="max-w-[120px] truncate">{workspace?.name ?? 'No workspace'}</span>
              <ChevronDown size={11} />
            </button>
            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 w-52 bg-white dark:bg-[#0a0a0a] border border-[#f4f4f5] dark:border-[#1a1a1a] rounded-lg shadow-lg py-1 overflow-hidden">
                  {workspaces.map(w => (
                    <button
                      key={w.id}
                      onClick={() => handleSwitchWorkspace(w)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#fafafa] dark:hover:bg-[#111] transition-colors"
                    >
                      <Check size={12} className={w.id === workspace?.id ? 'text-[#09090b] dark:text-white' : 'opacity-0'} />
                      <span className="truncate">{w.name}</span>
                    </button>
                  ))}
                  <div className="border-t border-[#f4f4f5] dark:border-[#1a1a1a] mt-1 pt-1">
                    <button
                      onClick={() => { setSwitcherOpen(false); navigate({ to: '/create-workspace' }) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-[#a1a1aa] dark:text-[#555] hover:bg-[#fafafa] dark:hover:bg-[#111] transition-colors"
                    >
                      <Plus size={11} /> New workspace
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div
            className="relative"
            onMouseEnter={handleAvatarEnter}
            onMouseLeave={handleAvatarLeave}
          >
            <button className="w-7 h-7 rounded-full bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e4e4e7] dark:border-[#222] flex items-center justify-center text-xs font-semibold text-[#09090b] dark:text-white hover:border-[#a1a1aa] dark:hover:border-[#444] transition-colors">
              {user?.email?.[0]?.toUpperCase() ?? '?'}
            </button>
            {avatarOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-20 w-52 bg-white dark:bg-[#0a0a0a] border border-[#f4f4f5] dark:border-[#1a1a1a] rounded-lg shadow-lg py-1 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-[#f4f4f5] dark:border-[#1a1a1a]">
                  <p className="text-xs text-[#71717a] dark:text-[#555] truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setAvatarOpen(false); navigate({ to: '/settings' }); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-[#09090b] dark:text-white hover:bg-[#fafafa] dark:hover:bg-[#111] transition-colors"
                >
                  <Settings size={13} className="text-[#a1a1aa] dark:text-[#555]" />
                  Settings
                </button>
                <button
                  onClick={() => { setAvatarOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-400/80 hover:bg-[#fafafa] dark:hover:bg-[#111] transition-colors"
                >
                  <LogOut size={13} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-medium">Surveys</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} className="mr-1.5" /> New
          </Button>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-[#fafafa] dark:bg-[#0a0a0a] border border-[#f4f4f5] dark:border-[#111] rounded animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && surveys.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#d4d4d8] dark:text-[#333] text-sm">
              No surveys yet.
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="text-xs text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors mt-2"
            >
              Create your first survey →
            </button>
          </div>
        )}

        <AnimatePresence>
          {surveys.map((survey, i) => (
            <motion.div
              key={survey.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between px-4 py-3 border border-[#f4f4f5] dark:border-[#111] rounded mb-2 hover:border-[#e4e4e7] dark:hover:border-[#222] transition-colors"
            >
              {/* Left: badge + title */}
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant={survey.published ? "live" : "draft"}>
                  {survey.published ? "live" : "draft"}
                </Badge>
                <span className="text-sm truncate text-[#09090b] dark:text-white">
                  {survey.title}
                </span>
              </div>

              {/* Right: stats + date + actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Analytics stats (published only) */}
                {survey.published && (
                  <button
                    onClick={() =>
                      navigate({
                        to: "/analytics/$id",
                        params: { id: survey.id },
                      })
                    }
                    className="flex items-center gap-2.5 mr-3 px-2 py-1 rounded hover:bg-[#f4f4f5] dark:hover:bg-[#111] transition-colors group"
                    title="View analytics"
                  >
                    <span className="flex items-center gap-1 text-[11px] text-[#71717a] dark:text-[#888]">
                      <Eye size={11} /> {survey.views}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-[#71717a] dark:text-[#888]">
                      <CheckCircle2 size={11} /> {survey._count.responses}
                    </span>
                    <ArrowUpRight
                      size={10}
                      className="text-[#d4d4d8] dark:text-[#333] group-hover:text-[#a1a1aa] dark:group-hover:text-[#555] transition-colors"
                    />
                  </button>
                )}

                <span className="text-[10px] text-[#a1a1aa] dark:text-[#444] mr-2 hidden sm:block">
                  {formatDate(survey.updatedAt)}
                </span>

                <button
                  onClick={() => window.open(`/preview/${survey.id}`, "_blank")}
                  className="p-1.5 text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
                  title="Preview"
                >
                  <Play size={13} />
                </button>
                {survey.published && (
                  <>
                    <a
                      href={`/s/${survey.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
                      title="Open live survey"
                    >
                      <ExternalLink size={13} />
                    </a>
                    <button
                      onClick={() => unpublishMutation.mutate(survey.id)}
                      disabled={unpublishMutation.isPending}
                      className="p-1.5 text-[#a1a1aa] dark:text-[#555] hover:text-yellow-500 transition-colors disabled:opacity-40"
                      title="Take offline"
                    >
                      <CloudOff size={13} />
                    </button>
                  </>
                )}
                <button
                  onClick={() =>
                    navigate({ to: "/builder/$id", params: { id: survey.id } })
                  }
                  className="p-1.5 text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setDeleteId(survey.id)}
                  className="p-1.5 text-[#a1a1aa] dark:text-[#555] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New survey"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(newTitle || "Untitled Survey");
          }}
          className="flex flex-col gap-4"
        >
          <Input
            label="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Untitled Survey"
            autoFocus
          />
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create →"}
          </Button>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete survey"
      >
        <p className="text-sm text-[#71717a] dark:text-[#888] mb-6">
          This will permanently delete the survey and all its responses.
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setDeleteId(null)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
            className="flex-1"
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
