import { useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { publicApi } from "../lib/api";
import { PublicSurveyRenderer } from "../components/survey/PublicSurveyRenderer";
import { ThemeToggle } from "../components/ui/ThemeToggle";

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
  const sessionKey = `wdym_session_${slug}`;
  const creatingRef = useRef(false);

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
    // Guard against concurrent calls creating duplicate sessions
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
    } catch {
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
      // Fire and forget — update in background, never block the UI
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

  const settings = (survey.settings as any) || {}
  const theme = settings.theme || 'system'
  const brandColor = settings.brandColor || ''
  const brandFg = getContrastColor(brandColor)
  const radius = settings.radius || 'sm'
  const radiusMap = { none: '0px', sm: '4px', full: '9999px' }
  const radiusPx = radiusMap[radius as keyof typeof radiusMap] || '4px'

  // Determine container classes
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
      <div className="absolute top-4 right-4">
        {theme === 'system' && <ThemeToggle />}
      </div>
      
      {/* Inject a tiny style block to override the hardcoded buttons inside this wrapper safely */}
      <style>{`
        /* Overrides for dynamic settings */
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

      <div className="max-w-xl mx-auto px-6 py-16 public-survey-wrapper">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-semibold mb-10 tracking-tight">
            {survey.title}
          </h1>

          {submitted ? (
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
