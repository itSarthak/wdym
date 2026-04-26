import { motion } from "framer-motion";
import { Type, GitBranch, Star, EyeOff, ArrowRight } from "lucide-react";

export default function AppPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
      whileHover={{ rotate: 0, y: -4, transition: { duration: 0.3 } }}
      className="w-full max-w-sm rounded-xl border border-black/10 dark:border-white/10 shadow-2xl shadow-black/50 overflow-hidden transform origin-center"
      style={{ rotate: "-0.5deg" }}
    >
      {/* Title bar */}
      <div className="h-9 bg-[#e8e8e8] dark:bg-[#1a1a1a] flex items-center px-4 gap-2 relative">
        <div className="flex gap-1.5 z-10">
          <div className="w-3 h-3 rounded-full bg-black/20 dark:bg-white/20" />
          <div className="w-3 h-3 rounded-full bg-black/15 dark:bg-white/15" />
          <div className="w-3 h-3 rounded-full bg-black/10 dark:bg-white/10" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-black/30 dark:text-white/30 font-medium tracking-wide">
            wdym — builder
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="min-h-[320px] bg-[#f5f5f5] dark:bg-[#080808] p-4 flex gap-4 relative">
        {/* Left sidebar */}
        <div className="w-16 bg-[#e0e0e0] dark:bg-[#111] rounded-lg p-2 flex flex-col gap-2 shrink-0">
          {[
            { Icon: Type, label: "Text" },
            { Icon: Star, label: "Rating" },
            { Icon: GitBranch, label: "Logic" },
            { Icon: EyeOff, label: "Hidden" },
            { Icon: ArrowRight, label: "End" },
          ].map(({ Icon, label }, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <Icon size={14} className="text-black/50 dark:text-white/50" />
              </div>
              <span className="text-[9px] text-black/40 dark:text-white/30">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Main canvas area */}
        <div className="flex-1 flex flex-col items-center pt-4 pr-2">
          <NodeBlock
            icon={<Type size={12} />}
            label="Welcome"
            text="Type your greeting"
          />
          <Line />
          <NodeBlock
            icon={<Star size={12} />}
            label="Rating 1–10"
            text="How likely are you..."
            isActive
          />
          <Line />
          <NodeBlock
            icon={<GitBranch size={12} />}
            label="If score > 7"
            text="Branch to promoter"
            isLast
          />
        </div>

        {/* Top-right "Publish" button mock */}
        <div className="absolute top-4 right-4 bg-white text-black text-[10px] font-semibold px-2 py-1 rounded shadow-sm border border-black/5">
          Publish
        </div>
      </div>
    </motion.div>
  );
}

function NodeBlock({ icon, label, text, isActive, isLast }: any) {
  return (
    <div
      className={`w-full bg-white dark:bg-[#161616] border ${isActive ? "border-black/30 dark:border-white/30" : "border-black/8 dark:border-white/8"} rounded p-3 mb-1 relative`}
    >
      <div
        className={`absolute inset-0 border ${isActive ? "border-black/20 dark:border-white/20 animate-pulse" : "border-transparent"} rounded pointer-events-none`}
      />
      <div className="flex items-center gap-1.5 mb-1.5 relative z-10">
        <span className="text-black/60 dark:text-white/60">{icon}</span>
        <span className="text-xs font-medium text-black/80 dark:text-white/80">
          {label}
        </span>
      </div>
      <div className="text-[10px] text-black/40 dark:text-white/30 leading-tight relative z-10">
        {text}
      </div>
      {isLast && (
        <div className="absolute top-2 right-2 text-[9px] border border-black/20 dark:border-white/20 rounded-sm px-1.5 py-0.5 text-black/40 dark:text-white/40">
          Publish →
        </div>
      )}
    </div>
  );
}

function Line() {
  return <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-auto" />;
}
