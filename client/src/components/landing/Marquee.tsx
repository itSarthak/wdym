const ITEMS = [
  "Rating",
  "Matrix",
  "If / Else",
  "Hidden Field",
  "Recall",
  "Statement",
  "Switch",
  "Redirect",
  "Score",
  "Consent",
];

export default function Marquee() {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div
      className="bg-[#fafafa] dark:bg-[#111] border-y border-[#e4e4e7] dark:border-[#222] py-3 overflow-hidden"
      aria-hidden="true"
    >
      {/* Keyframes injected once per mount — no JS scroll logic */}
      <style>{`
        @keyframes wdym-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .wdym-marquee-track {
          display: flex;
          width: max-content;
          animation: wdym-marquee 28s linear infinite;
        }
      `}</style>

      <div className="wdym-marquee-track">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="font-mono text-xs text-[#71717a] dark:text-[#555] px-5 shrink-0 select-none"
          >
            {item} ·
          </span>
        ))}
      </div>
    </div>
  );
}
