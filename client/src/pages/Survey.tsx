import { useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { publicApi, api } from "../lib/api";
import { PublicSurveyRenderer } from "../components/survey/PublicSurveyRenderer";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { useAuthStore } from "../store/auth";

function getContrastColor(hexColor: string): string {
  if (!hexColor) return 'white';
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return 'white';
  const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
  const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
  const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? 'black' : 'white';
}

export default function Survey() {
  const { slug } = useParams({ from: "/s/$slug" });
  const [submitted, setSubmitted] = useState(false);
  const [closedByLimit, setClosedByLimit] = useState(false);
  const [wdymAuthLoading, setWdymAuthLoading] = useState(false);
  const [wdymAuthError, setWdymAuthError] = useState('');
  const isEmbed = typeof window !== 'undefined' && window.location.search.includes('embed=1');
  const isBlocked = typeof window !== 'undefined' && window.location.search.includes('blocked=1');
  const sessionKey = `wdym_session_${slug}`;
  const creatingRef = useRef(false);
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  const {
    data: survey,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-survey", slug],
    queryFn: () => publicApi.get(`/s/${slug}`).then((r) => r.data),
  });

  async function getOrCreateSession(
    answers: Record<string, unknown>,
    lastBlockId: string,
  ): Promise<string | null> {
    const existing = sessionStorage.getItem(sessionKey);
    if (existing) return existing;
    if (creatingRef.current) return null;
    creatingRef.current = true;
    try {
      const res = await publicApi.post(`/s/${slug}/response`, {
        answers,
        lastBlockId,
      });
      const id: string = res.data.id;
      sessionStorage.setItem(sessionKey, id);
      return id;
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409) setClosedByLimit(true);
      return null;
    } finally {
      creatingRef.current = false;
    }
  }

  function handleProgress(
    answers: Record<string, unknown>,
    lastBlockId: string,
  ) {
    getOrCreateSession(answers, lastBlockId).then((id) => {
      if (!id) return;
      publicApi
        .patch(`/s/${slug}/response/${id}`, { answers, lastBlockId })
        .catch(() => {});
    });
  }

  async function handleSubmit(answers: Record<string, unknown>) {
    try {
      const sessionId = sessionStorage.getItem(sessionKey);
      if (sessionId) {
        await publicApi.patch(`/s/${slug}/response/${sessionId}`, {
          answers,
          lastBlockId: null,
          completed: true,
        });
      } else {
        await publicApi.post(`/s/${slug}/response`, {
          answers,
          completed: true,
        });
      }
      sessionStorage.removeItem(sessionKey);
    } catch {
      // Non-critical — don't block the thank-you screen
    }
    setSubmitted(true);
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'wdym:submitted' }, '*');
    }
  }

  async function handleWdymAuth() {
    if (!accessToken) {
      window.location.href = `/login?redirect=/s/${slug}`;
      return;
    }
    setWdymAuthLoading(true);
    setWdymAuthError('');
    try {
      const res = await api.get(`/s/${slug}/auth/wdym`);
      if (res.data.blocked) {
        setWdymAuthError(res.data.message || 'You are not allowed to access this survey.');
      } else if (res.data.ok) {
        await queryClient.invalidateQueries({ queryKey: ['public-survey', slug] });
      }
    } catch {
      setWdymAuthError('Authentication failed. Please try again.');
    } finally {
      setWdymAuthLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <Loader2
          size={16}
          className="text-[#d4d4d8] dark:text-[#444] animate-spin"
        />
      </div>
    );
  }

  if (isError || !survey) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <p className="text-[#a1a1aa] dark:text-[#555] text-sm">
          Survey not found.
        </p>
      </div>
    );
  }

  // Blocked by allowlist (from URL param or server response)
  if (isBlocked || survey.blocked) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <p className="text-sm text-[#71717a] dark:text-[#888]">
            {survey.message || 'You are not allowed to access this survey.'}
          </p>
        </div>
      </div>
    );
  }

  // Auth wall — respondent needs to authenticate
  if (survey.authRequired) {
    const provider = survey.provider ?? 'wdym';
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-sm w-full"
        >
          <h1 className="text-xl font-semibold mb-2 tracking-tight text-[#09090b] dark:text-white">
            {survey.title}
          </h1>
          <p className="text-sm text-[#71717a] dark:text-[#888] mb-8">
            Sign in to continue to this survey.
          </p>

          {provider === 'google' ? (
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/s/${slug}/auth/google`}
              className="flex items-center justify-center gap-3 w-full border border-[#e4e4e7] dark:border-[#333] rounded-lg px-4 py-3 text-sm text-[#09090b] dark:text-white hover:bg-[#f4f4f5] dark:hover:bg-[#1a1a1a] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </a>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={handleWdymAuth}
                disabled={wdymAuthLoading}
                className="flex items-center justify-center gap-2 w-full bg-[#09090b] dark:bg-white text-white dark:text-[#09090b] rounded-lg px-4 py-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {wdymAuthLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                {accessToken ? 'Continue with my account' : 'Sign in to continue'}
              </button>
              {wdymAuthError && (
                <p className="text-xs text-red-500 text-center">{wdymAuthError}</p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const settings = (survey.settings as Record<string, unknown>) || {}
  const theme = settings.theme || 'system'
  const brandColor = settings.brandColor as string || ''
  const brandFg = getContrastColor(brandColor)
  const radius = settings.radius || 'sm'
  const radiusMap = { none: '0px', sm: '4px', full: '9999px' }
  const radiusPx = radiusMap[radius as keyof typeof radiusMap] || '4px'

  let containerClass = "min-h-screen transition-colors "
  if (theme === 'dark') containerClass += "dark bg-black text-white"
  else if (theme === 'light') containerClass += "light bg-white text-[#09090b]"
  else containerClass += "bg-white dark:bg-black text-[#09090b] dark:text-white"

  return (
    <div
      className={containerClass}
      style={{
        '--brand': brandColor || undefined,
        '--brand-fg': brandColor ? brandFg : undefined,
        '--radius': radiusPx,
      } as React.CSSProperties}
    >
      {!isEmbed && (
        <div className="absolute top-4 right-4">
          {theme === 'system' && <ThemeToggle />}
        </div>
      )}

      <style>{`
        .public-survey-wrapper button {
          border-radius: var(--radius) !important;
        }
        .public-survey-wrapper input, .public-survey-wrapper textarea, .public-survey-wrapper select {
          border-radius: var(--radius) !important;
        }
        ${brandColor ? `
          .public-survey-wrapper button.bg-\\[\\#09090b\\],
          .public-survey-wrapper button.dark\\:bg-white {
            background-color: var(--brand) !important;
            color: var(--brand-fg) !important;
          }
          .public-survey-wrapper div.bg-black {
            background-color: var(--brand) !important;
          }
           .public-survey-wrapper div.dark\\:bg-white {
            background-color: var(--brand) !important;
          }
        ` : ''}
      `}</style>

      <div className={`max-w-xl mx-auto px-6 public-survey-wrapper ${isEmbed ? 'py-8' : 'py-16'}`}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-semibold mb-10 tracking-tight">
            {survey.title}
          </h1>

          {(survey.closed || closedByLimit) ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-[#71717a] dark:text-[#888]"
            >
              {survey.closedMessage || 'This survey is no longer accepting responses.'}
            </motion.div>
          ) : submitted ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-[#71717a] dark:text-[#888]"
            >
              Response submitted.
            </motion.div>
          ) : (
            <PublicSurveyRenderer
              survey={survey as any}
              onProgress={handleProgress}
              onSubmit={handleSubmit}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
