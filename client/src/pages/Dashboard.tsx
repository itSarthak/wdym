import { useCallback, useEffect, useRef, useState } from "react";
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
  ChevronLeft,
  Check,
  Layers,
  Bot,
  X,
  Sparkles,
  ArrowUp,
  Loader2,
  BarChart2,
  History,
  SquarePen,
  TrendingUp,
  Users,
  Activity,
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

interface HymnModelDef { id: string; label: string; sub: string }
interface HymnProviderDef { id: string; label: string; models: HymnModelDef[] }

const HYMN_PROVIDERS: HymnProviderDef[] = [
  {
    id: "google",
    label: "Google",
    models: [
      { id: "gemini-2.0-flash",  label: "Flash",      sub: "Fast · Default"    },
      { id: "gemini-2.5-flash",  label: "Flash 2.5",  sub: "Balanced · Latest" },
      { id: "gemini-2.5-pro",    label: "Pro",         sub: "Most capable"      },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    models: [
      { id: "claude-haiku-4-5-20251001", label: "Haiku",   sub: "Fast"          },
      { id: "claude-sonnet-4-6",         label: "Sonnet",  sub: "Balanced"      },
      { id: "claude-opus-4-7",           label: "Opus",    sub: "Most capable"  },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini", sub: "Fast"      },
      { id: "gpt-4o",      label: "GPT-4o",      sub: "Powerful"  },
    ],
  },
];

const THINKING_PHRASES = [
  "Thinking...",
  "Analyzing...",
  "Processing...",
  "Working on it...",
  "Crafting response...",
  "Reading context...",
  "Considering options...",
];

interface HymnSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface HymnMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  action?: string;
  surveyId?: string;
  surveyTitle?: string;
  stats?: {
    views: number;
    started: number;
    completed: number;
    completionRate: number;
    viewToStart: number;
    dailyResponses: { date: string; count: number }[];
  };
  loading?: boolean;
  error?: string;
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

  const [hymnOpen, setHymnOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(
    () => localStorage.getItem('wdym:hymn:provider') ?? 'google'
  )
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('wdym:hymn:model') ?? 'gemini-2.0-flash'
  )
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const hymnAutoLoadedRef = useRef(false);
  const [hymnMessages, setHymnMessages] = useState<HymnMessage[]>([]);
  const [hymnInput, setHymnInput] = useState("");
  const [hymnLoading, setHymnLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPos, setMentionPos] = useState(-1);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleAvatarEnter() {
    if (avatarLeaveTimer.current) clearTimeout(avatarLeaveTimer.current);
    setAvatarOpen(true);
  }

  function handleAvatarLeave() {
    avatarLeaveTimer.current = setTimeout(() => setAvatarOpen(false), 200);
  }

  function handleSwitchWorkspace(w: Workspace) {
    setWorkspace(w);
    setSwitcherOpen(false);
  }

  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: ["surveys", workspace?.id],
    queryFn: () => api.get("/surveys").then((r) => r.data),
    enabled: !!workspace,
  });

  const { data: hymnSessions = [] } = useQuery<HymnSession[]>({
    queryKey: ["hymn-sessions", workspace?.id],
    queryFn: () =>
      api
        .get("/hymn/sessions", { headers: { "x-workspace-id": workspace?.id ?? "" } })
        .then((r) => r.data),
    enabled: !!workspace && hymnOpen,
  });

  // Reset auto-load flag whenever the panel opens so we always restore the last session
  useEffect(() => {
    if (hymnOpen) hymnAutoLoadedRef.current = false;
  }, [hymnOpen]);

  // Auto-load most recent session when panel opens
  useEffect(() => {
    if (hymnOpen && !hymnAutoLoadedRef.current && hymnSessions.length > 0 && !activeSessionId) {
      hymnAutoLoadedRef.current = true;
      loadSession(hymnSessions[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hymnOpen, hymnSessions]);

  const loadSession = useCallback(
    async (id: string) => {
      try {
        const res = await api.get(`/hymn/sessions/${id}`, {
          headers: { "x-workspace-id": workspace?.id ?? "" },
        });
        const session = res.data as { messages: Array<{ id: string; role: string; content: string; createdAt: string; action?: string | null; metadata?: Record<string, unknown> | null }> };
        setActiveSessionId(id);
        setHymnMessages(
          session.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.createdAt).getTime(),
            action: m.action ?? undefined,
            ...((m.metadata as Record<string, unknown>) ?? {}),
          }))
        );
      } catch (e) {
        console.error("Failed to load session", e);
      }
    },
    [workspace]
  );

  function handleNewChat() {
    setActiveSessionId(null);
    setHymnMessages([]);
    hymnAutoLoadedRef.current = true; // prevent auto-reload after explicit new-chat
  }

  async function handleDeleteSession(id: string) {
    await api.delete(`/hymn/sessions/${id}`, {
      headers: { "x-workspace-id": workspace?.id ?? "" },
    });
    queryClient.invalidateQueries({ queryKey: ["hymn-sessions"] });
    if (activeSessionId === id) handleNewChat();
  }

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

  // Filtered surveys for @mention dropdown
  const mentionSurveys =
    mentionQuery !== null
      ? surveys
          .filter((s) =>
            s.title.toLowerCase().includes(mentionQuery.toLowerCase())
          )
          .slice(0, 5)
      : [];

  function handleHymnInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setHymnInput(val);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";

    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const mentionMatch = textBefore.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      const startPos = textBefore.lastIndexOf("@");
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
      mentionDebounceRef.current = setTimeout(() => {
        setMentionQuery(query);
        setMentionPos(startPos);
      }, 200);
    } else {
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
      setMentionQuery(null);
      setMentionPos(-1);
    }
  }

  function handleMentionSelect(survey: Survey) {
    const before = hymnInput.slice(0, mentionPos);
    const afterCursor = hymnInput.slice(mentionPos + 1 + (mentionQuery?.length ?? 0));
    setHymnInput(before + "@" + survey.title + afterCursor);
    setMentionQuery(null);
    setMentionPos(-1);
  }

  const handleHymnSend = useCallback(async () => {
    const input = hymnInput.trim();
    if (!input || hymnLoading) return;

    const userMsgId = `${Date.now()}-u`;
    const asstMsgId = `${Date.now()}-a`;

    setHymnInput("");
    setHymnLoading(true);
    setMentionQuery(null);
    setHymnMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: input, timestamp: Date.now() },
      { id: asstMsgId, role: "assistant", content: "", timestamp: Date.now(), loading: true },
    ]);

    try {
      const res = await api.post(
        "/hymn/chat",
        {
          message: input,
          provider: selectedProvider,
          model: selectedModel,
          sessionId: activeSessionId,
          surveys: surveys.map((s) => ({
            id: s.id,
            title: s.title,
            published: s.published,
            responses: s._count.responses,
            views: s.views,
          })),
        },
        { headers: { "x-workspace-id": workspace?.id ?? "" } }
      );

      const data = res.data as {
        action: string;
        reply: string;
        sessionId?: string | null;
        surveyId?: string;
        surveyTitle?: string;
        generatePrompt?: string;
        stats?: HymnMessage["stats"];
      };

      // Persist session ID if a new one was created
      if (data.sessionId && !activeSessionId) {
        setActiveSessionId(data.sessionId);
        queryClient.invalidateQueries({ queryKey: ["hymn-sessions"] });
      }

      if (data.action === "create_survey" && data.surveyId && data.generatePrompt) {
        sessionStorage.setItem(`hymn:${data.surveyId}`, data.generatePrompt);
        queryClient.invalidateQueries({ queryKey: ["surveys"] });
        setTimeout(() => navigate({ to: "/builder/$id", params: { id: data.surveyId! } }), 800);
      } else if (data.action === "edit_survey" && data.surveyId && data.generatePrompt) {
        sessionStorage.setItem(`hymn:${data.surveyId}`, data.generatePrompt);
        setTimeout(() => navigate({ to: "/builder/$id", params: { id: data.surveyId! } }), 800);
      } else if (data.action === "publish_survey" || data.action === "unpublish_survey") {
        queryClient.invalidateQueries({ queryKey: ["surveys"] });
      }

      setHymnMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsgId
            ? {
                ...m,
                loading: false,
                content: data.reply,
                action: data.action,
                surveyId: data.surveyId,
                surveyTitle: data.surveyTitle,
                stats: data.stats,
              }
            : m
        )
      );
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Something went wrong. Please try again.";
      setHymnMessages((prev) =>
        prev.map((m) => (m.id === asstMsgId ? { ...m, loading: false, error: msg } : m))
      );
    } finally {
      setHymnLoading(false);
    }
  }, [hymnInput, hymnLoading, surveys, workspace, queryClient, navigate, selectedProvider, selectedModel, activeSessionId]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-[#09090b] dark:text-white">
      {/* Header */}
      <header className="border-b border-[#f4f4f5] dark:border-[#111] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight">wdym</h1>
          {/* Workspace switcher */}
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white transition-colors border border-[#f4f4f5] dark:border-[#1a1a1a] rounded px-2 py-1"
            >
              <Layers size={11} />
              <span className="max-w-[120px] truncate">{workspace?.name ?? "No workspace"}</span>
              <ChevronDown size={11} />
            </button>
            {switcherOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                <div className="absolute left-0 top-full mt-1 z-20 w-52 bg-white dark:bg-[#0a0a0a] border border-[#f4f4f5] dark:border-[#1a1a1a] rounded-lg shadow-lg py-1 overflow-hidden">
                  {workspaces.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => handleSwitchWorkspace(w)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#fafafa] dark:hover:bg-[#111] transition-colors"
                    >
                      <Check size={12} className={w.id === workspace?.id ? "text-[#09090b] dark:text-white" : "opacity-0"} />
                      <span className="truncate">{w.name}</span>
                    </button>
                  ))}
                  <div className="border-t border-[#f4f4f5] dark:border-[#1a1a1a] mt-1 pt-1">
                    <button
                      onClick={() => { setSwitcherOpen(false); navigate({ to: "/create-workspace" }); }}
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
          <div className="relative" onMouseEnter={handleAvatarEnter} onMouseLeave={handleAvatarLeave}>
            <button className="w-7 h-7 rounded-full bg-[#fafafa] dark:bg-[#1a1a1a] border border-[#e4e4e7] dark:border-[#222] flex items-center justify-center text-xs font-semibold text-[#09090b] dark:text-white hover:border-[#a1a1aa] dark:hover:border-[#444] transition-colors">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </button>
            {avatarOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-20 w-52 bg-white dark:bg-[#0a0a0a] border border-[#f4f4f5] dark:border-[#1a1a1a] rounded-lg shadow-lg py-1 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-[#f4f4f5] dark:border-[#1a1a1a]">
                  <p className="text-xs text-[#71717a] dark:text-[#555] truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setAvatarOpen(false); navigate({ to: "/settings" }); }}
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
            <p className="text-[#d4d4d8] dark:text-[#333] text-sm">No surveys yet.</p>
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
                {survey.published && (
                  <button
                    onClick={() => navigate({ to: "/analytics/$id", params: { id: survey.id } })}
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
                  onClick={() => navigate({ to: "/builder/$id", params: { id: survey.id } })}
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

      {/* Hymn side panel */}
      <AnimatePresence>
        {hymnOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="fixed right-0 top-[61px] h-[calc(100vh-61px)] w-[380px] bg-[#fafafa] dark:bg-[#0a0a0a] border-l border-t border-[#e4e4e7] dark:border-[#1a1a1a] flex flex-col z-30 shadow-xl"
          >
            <HymnPanel
              messages={hymnMessages}
              input={hymnInput}
              loading={hymnLoading}
              mentionSurveys={mentionSurveys}
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              sessions={hymnSessions}
              activeSessionId={activeSessionId}
              onInputChange={handleHymnInputChange}
              onSend={handleHymnSend}
              onMentionSelect={handleMentionSelect}
              onModelChange={(provider, model) => {
                setSelectedProvider(provider)
                setSelectedModel(model)
                localStorage.setItem('wdym:hymn:provider', provider)
                localStorage.setItem('wdym:hymn:model', model)
              }}
              onNavigateAnalytics={(id) => navigate({ to: "/analytics/$id", params: { id } })}
              onClose={() => setHymnOpen(false)}
              onNewChat={handleNewChat}
              onSelectSession={loadSession}
              onDeleteSession={handleDeleteSession}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hymn collapsed tab */}
      <AnimatePresence>
        {!hymnOpen && (
          <motion.button
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            onClick={() => setHymnOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-white dark:bg-[#0a0a0a] border border-r-0 border-[#e4e4e7] dark:border-[#1a1a1a] rounded-l-lg px-2 py-3 flex flex-col items-center gap-2 text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white shadow-sm transition-colors"
          >
            <Bot size={12} />
            <span className="text-[9px] font-medium uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">
              Hymn
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New survey">
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
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete survey">
        <p className="text-sm text-[#71717a] dark:text-[#888] mb-6">
          This will permanently delete the survey and all its responses.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setDeleteId(null)} className="flex-1">
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

// ── Hymn Panel ────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(diff / 86_400_000);
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function HymnEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 py-8 text-center px-5">
      <div className="w-10 h-10 rounded-xl bg-[#f4f4f5] dark:bg-[#1a1a1a] flex items-center justify-center">
        <Sparkles size={16} className="text-[#71717a] dark:text-[#888]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#09090b] dark:text-white">Meet Hymn</p>
        <p className="text-xs text-[#71717a] dark:text-[#555] mt-1.5 leading-relaxed">
          Your AI survey assistant. Create, edit, publish, and analyze surveys. Use{" "}
          <span className="font-mono bg-[#f4f4f5] dark:bg-[#1a1a1a] px-1 rounded text-[10px]">@SurveyName</span>{" "}
          to reference a specific one.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full text-left">
        {[
          "Create a customer satisfaction survey with NPS",
          "Show me analytics for @My Survey",
          "Publish @Product Feedback",
        ].map((ex) => (
          <div key={ex} className="text-[11px] text-[#71717a] dark:text-[#555] border border-[#e4e4e7] dark:border-[#1a1a1a] rounded-lg px-3 py-2.5">
            {ex}
          </div>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % THINKING_PHRASES.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={idx}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.2 }}
        className="text-[11px] text-[#71717a] dark:text-[#555]"
      >
        {THINKING_PHRASES[idx]}
      </motion.span>
    </AnimatePresence>
  );
}

function HymnUserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-[#09090b] dark:bg-white text-white dark:text-black text-xs px-3.5 py-2.5 rounded-2xl rounded-tr-sm leading-relaxed whitespace-pre-wrap break-words">
        {content}
      </div>
    </div>
  );
}

function MiniBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div className="flex items-end gap-1 h-10 w-full">
      {data.map((d, i) => {
        const pct = d.count / max;
        const dayLabel = days[new Date(d.date + "T12:00:00").getDay()];
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className={`w-full rounded-sm transition-all ${d.count > 0 ? "bg-[#09090b] dark:bg-white" : "bg-[#e4e4e7] dark:bg-[#222]"}`}
              style={{ height: `${Math.max(pct * 28, d.count > 0 ? 4 : 2)}px` }}
              title={`${d.date}: ${d.count} response${d.count !== 1 ? "s" : ""}`}
            />
            <span className="text-[8px] text-[#a1a1aa] dark:text-[#444]">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function FunnelRow({ label, value, max, icon }: { label: string; value: number; max: number; icon: React.ReactNode }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="text-[#a1a1aa] dark:text-[#555] shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-[#71717a] dark:text-[#888]">{label}</span>
          <span className="text-[10px] font-medium text-[#09090b] dark:text-white">{value.toLocaleString()}</span>
        </div>
        <div className="h-1 bg-[#f4f4f5] dark:bg-[#222] rounded-full overflow-hidden">
          <div className="h-full bg-[#09090b] dark:bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function AnalyticsBlock({ stats, surveyId, onNavigate }: {
  stats: NonNullable<HymnMessage["stats"]>;
  surveyId?: string;
  onNavigate: (id: string) => void;
}) {
  const dropOff = stats.started - stats.completed;

  return (
    <div className="flex flex-col gap-2">
      {/* Funnel */}
      <div className="bg-white dark:bg-[#111] border border-[#e4e4e7] dark:border-[#1a1a1a] rounded-xl p-3 flex flex-col gap-2.5">
        <p className="text-[10px] font-medium text-[#71717a] dark:text-[#888] uppercase tracking-wide">Response Funnel</p>
        <FunnelRow label="Views"     value={stats.views}     max={stats.views}     icon={<Eye size={10} />} />
        <FunnelRow label="Started"   value={stats.started}   max={stats.views}     icon={<Users size={10} />} />
        <FunnelRow label="Completed" value={stats.completed} max={stats.views}     icon={<CheckCircle2 size={10} />} />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Completion", value: `${stats.completionRate}%`, icon: <TrendingUp size={10} />, good: stats.completionRate >= 50 },
          { label: "View→Start",  value: `${stats.viewToStart}%`,   icon: <ArrowUpRight size={10} />, good: stats.viewToStart >= 30 },
          { label: "Drop-off",    value: dropOff.toLocaleString(),  icon: <Activity size={10} />, good: dropOff === 0 },
        ].map(({ label, value, icon, good }) => (
          <div key={label} className="bg-white dark:bg-[#111] border border-[#e4e4e7] dark:border-[#1a1a1a] rounded-lg px-2.5 py-2">
            <div className={`mb-1 ${good ? "text-emerald-500" : "text-[#a1a1aa] dark:text-[#555]"}`}>{icon}</div>
            <div className="text-sm font-semibold text-[#09090b] dark:text-white leading-none">{value}</div>
            <div className="text-[9px] text-[#a1a1aa] dark:text-[#555] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* 7-day chart */}
      {stats.dailyResponses && stats.dailyResponses.length > 0 && (
        <div className="bg-white dark:bg-[#111] border border-[#e4e4e7] dark:border-[#1a1a1a] rounded-xl p-3">
          <p className="text-[10px] font-medium text-[#71717a] dark:text-[#888] uppercase tracking-wide mb-2">Last 7 days</p>
          <MiniBarChart data={stats.dailyResponses} />
        </div>
      )}

      {surveyId && (
        <button
          onClick={() => onNavigate(surveyId)}
          className="flex items-center gap-1.5 text-[11px] text-[#71717a] dark:text-[#888] hover:text-[#09090b] dark:hover:text-white transition-colors border border-[#e4e4e7] dark:border-[#1a1a1a] hover:border-[#a1a1aa] dark:hover:border-[#333] rounded-lg px-3 py-2"
        >
          <BarChart2 size={11} />
          View full analytics →
        </button>
      )}
    </div>
  );
}

function HymnAssistantMessage({
  message,
  onNavigateAnalytics,
}: {
  message: HymnMessage;
  onNavigateAnalytics: (id: string) => void;
}) {
  const avatar = (
    <div className="w-5 h-5 rounded-full bg-[#f4f4f5] dark:bg-[#1a1a1a] flex items-center justify-center shrink-0 mt-0.5">
      <Bot size={10} className="text-[#71717a] dark:text-[#888]" />
    </div>
  );

  if (message.loading) {
    return (
      <div className="flex items-start gap-2">
        {avatar}
        <div className="bg-[#f4f4f5] dark:bg-[#1a1a1a] rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2">
          <div className="flex gap-1 items-center">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="w-1 h-1 rounded-full bg-[#a1a1aa] dark:bg-[#555]"
                animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22 }} />
            ))}
          </div>
          <ThinkingIndicator />
        </div>
      </div>
    );
  }

  if (message.error) {
    return (
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0 mt-0.5">
          <X size={10} className="text-red-500" />
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400 leading-relaxed max-w-[85%]">
          {message.error}
        </div>
      </div>
    );
  }

  const actionPill =
    message.action === "create_survey" ? (
      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-medium">Opening builder…</span>
    ) : message.action === "edit_survey" ? (
      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-medium">Opening builder…</span>
    ) : message.action === "publish_survey" ? (
      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-medium">● Published</span>
    ) : message.action === "unpublish_survey" ? (
      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-[#e4e4e7] dark:bg-[#222] text-[#71717a] dark:text-[#888] font-medium">Unpublished</span>
    ) : null;

  return (
    <div className="flex items-start gap-2">
      {avatar}
      <div className="flex flex-col gap-2 max-w-[85%]">
        <div className="bg-[#f4f4f5] dark:bg-[#1a1a1a] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-[#09090b] dark:text-white leading-relaxed">
          {message.content}
        </div>
        {actionPill && <div className="pl-1">{actionPill}</div>}
        {message.stats && (
          <AnalyticsBlock
            stats={message.stats}
            surveyId={message.surveyId}
            onNavigate={onNavigateAnalytics}
          />
        )}
      </div>
    </div>
  );
}

function HymnSessionsList({
  sessions,
  activeId,
  onSelect,
  onDelete,
}: {
  sessions: HymnSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-[#a1a1aa] dark:text-[#444]">No past chats yet.</p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto py-1">
      {sessions.map((s) => (
        <div
          key={s.id}
          className={`group flex items-center gap-2 px-4 py-2.5 hover:bg-[#f4f4f5] dark:hover:bg-[#111] transition-colors cursor-pointer ${
            s.id === activeId ? "bg-[#f4f4f5] dark:bg-[#111]" : ""
          }`}
          onClick={() => onSelect(s.id)}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#09090b] dark:text-white truncate">{s.title}</p>
            <p className="text-[10px] text-[#a1a1aa] dark:text-[#444] mt-0.5">{relativeTime(s.updatedAt)}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
            className="shrink-0 p-1 opacity-0 group-hover:opacity-100 text-[#a1a1aa] dark:text-[#555] hover:text-red-500 transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

function HymnPanel({
  messages,
  input,
  loading,
  mentionSurveys,
  selectedProvider,
  selectedModel,
  sessions,
  activeSessionId,
  onInputChange,
  onSend,
  onMentionSelect,
  onModelChange,
  onNavigateAnalytics,
  onClose,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}: {
  messages: HymnMessage[];
  input: string;
  loading: boolean;
  mentionSurveys: Survey[];
  selectedProvider: string;
  selectedModel: string;
  sessions: HymnSession[];
  activeSessionId: string | null;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onMentionSelect: (s: Survey) => void;
  onModelChange: (provider: string, model: string) => void;
  onNavigateAnalytics: (id: string) => void;
  onClose: () => void;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const currentProvider = HYMN_PROVIDERS.find((p) => p.id === selectedProvider) ?? HYMN_PROVIDERS[0];
  const currentModel = currentProvider.models.find((m) => m.id === selectedModel) ?? currentProvider.models[0];
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  useEffect(() => {
    if (!sessionsOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sessionsOpen]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); onSend(); }
    if (e.key === "Escape" && mentionSurveys.length > 0) e.preventDefault();
  }

  const headerIconBtn = "p-1.5 text-[#a1a1aa] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors rounded";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#e4e4e7] dark:border-[#1a1a1a] shrink-0 gap-2">
        {sessionsOpen ? (
          <>
            <div className="flex items-center gap-1.5">
              <button className={headerIconBtn} onClick={() => setSessionsOpen(false)}>
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-[#09090b] dark:text-white">Chats</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button className={headerIconBtn} title="New chat" onClick={() => { onNewChat(); setSessionsOpen(false); }}>
                <SquarePen size={13} />
              </button>
              <button className={headerIconBtn} onClick={onClose}><X size={13} /></button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <button className={headerIconBtn} title="Chat history" onClick={() => setSessionsOpen(true)}>
                <History size={13} />
              </button>
              <span className="text-xs text-[#09090b] dark:text-white truncate max-w-[180px]">
                {activeSession?.title ?? "New chat"}
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button className={headerIconBtn} title="New chat" onClick={onNewChat}>
                <SquarePen size={13} />
              </button>
              <button className={headerIconBtn} onClick={onClose}><X size={13} /></button>
            </div>
          </>
        )}
      </div>

      {/* ── Body ── */}
      {sessionsOpen ? (
        <HymnSessionsList
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={(id) => { onSelectSession(id); setSessionsOpen(false); }}
          onDelete={onDeleteSession}
        />
      ) : (
        <>
          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
            {messages.length === 0 ? (
              <HymnEmptyState />
            ) : (
              messages.map((msg) =>
                msg.role === "user" ? (
                  <HymnUserMessage key={msg.id} content={msg.content} />
                ) : (
                  <HymnAssistantMessage key={msg.id} message={msg} onNavigateAnalytics={onNavigateAnalytics} />
                )
              )
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-[#e4e4e7] dark:border-[#1a1a1a] px-3 pt-3 pb-3 flex flex-col gap-2 shrink-0">
            {mentionSurveys.length > 0 && (
              <div className="border border-[#e4e4e7] dark:border-[#222] rounded-lg overflow-hidden bg-white dark:bg-[#0a0a0a] shadow-sm">
                {mentionSurveys.map((s) => (
                  <button key={s.id} onMouseDown={(e) => { e.preventDefault(); onMentionSelect(s); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[#f4f4f5] dark:hover:bg-[#111] transition-colors">
                    <span className="flex-1 truncate text-[#09090b] dark:text-white">{s.title}</span>
                    <span className={`text-[10px] ${s.published ? "text-emerald-500" : "text-[#a1a1aa] dark:text-[#555]"}`}>
                      {s.published ? "live" : "draft"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <textarea ref={textareaRef} value={input} onChange={onInputChange} onKeyDown={handleKeyDown}
                placeholder="Ask Hymn anything… (use @ to mention a survey)"
                rows={1} disabled={loading}
                className="flex-1 resize-none bg-[#f4f4f5] dark:bg-[#111] border border-[#e4e4e7] dark:border-[#222] rounded-xl text-xs text-[#09090b] dark:text-white placeholder-[#a1a1aa] dark:placeholder-[#444] px-3 py-2.5 focus:outline-none focus:border-[#a1a1aa] dark:focus:border-[#444] transition-colors disabled:opacity-50 leading-relaxed"
                style={{ minHeight: 38, maxHeight: 120 }} />
              <button onClick={onSend} disabled={!input.trim() || loading}
                className="shrink-0 w-8 h-8 flex items-center justify-center bg-[#09090b] dark:bg-white text-white dark:text-black rounded-lg disabled:opacity-25 transition-opacity active:scale-95">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <ArrowUp size={12} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              {/* Model selector */}
              <div className="relative">
                {modelOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setModelOpen(false)} />
                    <div className="absolute left-0 bottom-full mb-1.5 z-20 w-56 bg-white dark:bg-[#0a0a0a] border border-[#e4e4e7] dark:border-[#1a1a1a] rounded-xl shadow-lg overflow-hidden">
                      {HYMN_PROVIDERS.map((prov, pi) => (
                        <div key={prov.id}>
                          {pi > 0 && <div className="border-t border-[#f4f4f5] dark:border-[#111]" />}
                          <p className="px-3 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-widest text-[#a1a1aa] dark:text-[#444]">{prov.label}</p>
                          {prov.models.map((m) => (
                            <button key={m.id} onClick={() => { onModelChange(prov.id, m.id); setModelOpen(false); }}
                              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#f4f4f5] dark:hover:bg-[#111] transition-colors">
                              <div>
                                <p className="text-xs text-[#09090b] dark:text-white font-medium">{m.label}</p>
                                <p className="text-[10px] text-[#a1a1aa] dark:text-[#555]">{m.sub}</p>
                              </div>
                              {m.id === selectedModel && prov.id === selectedProvider && (
                                <Check size={12} className="text-[#09090b] dark:text-white shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <button onClick={() => setModelOpen((o) => !o)}
                  className="flex items-center gap-1 text-[10px] text-[#71717a] dark:text-[#555] hover:text-[#09090b] dark:hover:text-white transition-colors">
                  <span className="text-[#a1a1aa] dark:text-[#444]">{currentProvider.label}</span>
                  <span className="text-[#d4d4d8] dark:text-[#333]">·</span>
                  <span className="font-medium">{currentModel.label}</span>
                  <ChevronDown size={10} />
                </button>
              </div>
              <p className="text-[9px] text-[#a1a1aa] dark:text-[#444]">
                <kbd className="font-mono bg-[#f4f4f5] dark:bg-[#1a1a1a] px-1 rounded">⌘↵</kbd> to send
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
