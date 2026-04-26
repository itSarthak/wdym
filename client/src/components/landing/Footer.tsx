const LINKS = [
  { label: "Privacy", href: "#" },
  { label: "Docs", href: "#" },
  { label: "GitHub", href: "https://github.com", external: true },
];

export default function Footer() {
  return (
    <footer className="border-t border-black/5 dark:border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight text-black dark:text-white text-sm">
            wdym
          </span>
          <span className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} wdym. All rights reserved.
          </span>
        </div>

        {/* Right */}
        <nav aria-label="Footer navigation" className="flex items-center gap-5">
          {LINKS.map(({ label, href, external }) => (
            <a
              key={label}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="text-sm text-zinc-500 hover:text-black dark:hover:text-white transition-colors focus-visible:outline focus-visible:outline-black/50 dark:focus-visible:outline-white/50"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
