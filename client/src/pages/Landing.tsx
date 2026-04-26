// Register this page in client/src/router.tsx as: path: '/' → component: Landing

import { Link } from "@tanstack/react-router";
import Hero from "../components/landing/Hero";
import Marquee from "../components/landing/Marquee";
import Features from "../components/landing/Features";
import HowItWorks from "../components/landing/HowItWorks";
import Footer from "../components/landing/Footer";
import StatsBar from "../components/landing/StatsBar";
import BlockShowcase from "../components/landing/BlockShowcase";
import ShortcutStrip from "../components/landing/ShortcutStrip";
import ComparisonTable from "../components/landing/ComparisonTable";
import Testimonials from "../components/landing/Testimonials";
import { ThemeToggle } from "../components/ui/ThemeToggle";

// ── Navbar ─────────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-black/5 dark:border-white/5 backdrop-blur-sm bg-white/80 dark:bg-black/80 transition-colors">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="font-semibold tracking-tight text-black dark:text-white text-sm hover:text-black/80 dark:hover:text-white/80 transition-colors focus-visible:outline focus-visible:outline-black/50 dark:focus-visible:outline-white/50"
          aria-label="wdym home"
        >
          wdym
        </Link>

        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-1"
        >
          <Link
            to="/login"
            className="px-4 py-1.5 text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors rounded focus-visible:outline focus-visible:outline-black/50 dark:focus-visible:outline-white/50"
          >
            Log in
          </Link>
          <ThemeToggle />
          <Link
            to="/login"
            className="ml-2 px-4 py-1.5 text-sm bg-black text-white dark:bg-white dark:text-black rounded font-medium hover:bg-black/90 dark:hover:bg-white/90 transition-colors focus-visible:outline focus-visible:outline-black/50 dark:focus-visible:outline-white/50"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ── CTA ────────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section
      className="max-w-6xl mx-auto px-6 py-20"
      aria-labelledby="cta-heading"
    >
      <div className="relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-black/10 dark:bg-white/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="relative z-10 bg-[#f0f0f0] dark:bg-[#0d0d0d] border border-black/8 dark:border-white/[0.08] rounded p-12 sm:p-16 flex flex-col items-center gap-8 text-center transition-colors">
          <h2
            id="cta-heading"
            className="text-4xl tracking-tight text-black dark:text-white font-semibold"
          >
            Ready to ask better questions?
          </h2>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded text-sm font-medium hover:bg-black/90 dark:hover:bg-white/90 transition-colors focus-visible:outline focus-visible:outline-black/50 dark:focus-visible:outline-white/50"
          >
            Start building →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="bg-[#fafafa] dark:bg-black min-h-screen text-black dark:text-white font-sans transition-colors">
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <Marquee />
        <Features />
        <BlockShowcase />
        <ShortcutStrip />
        <ComparisonTable />
        <Testimonials />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
