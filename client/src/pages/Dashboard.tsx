import { useState } from "react";
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
} from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
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
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: ["surveys"],
    queryFn: () => api.get("/surveys").then((r) => r.data),
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
        <h1 className="text-sm font-semibold tracking-tight">wdym</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#a1a1aa] dark:text-[#555] mr-2">
            {user?.email}
          </span>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="p-1.5 text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white transition-colors"
          >
            <LogOut size={14} />
          </button>
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
