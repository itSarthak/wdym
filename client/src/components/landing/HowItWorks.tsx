const STEPS = [
  {
    num: '01',
    title: 'Design',
    copy: 'Drag blocks onto the canvas. Logic, routing, and recall auto-save as you go.',
  },
  {
    num: '02',
    title: 'Publish',
    copy: 'One click generates a unique slug. Your survey is live immediately.',
  },
  {
    num: '03',
    title: 'Share',
    copy: 'Copy the public URL. Send it anywhere. Responses land in your dashboard.',
  },
]

export default function HowItWorks() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24" aria-labelledby="how-heading">
      <p
        id="how-heading"
        className="text-xs text-zinc-600 uppercase tracking-widest mb-16"
      >
        How it works
      </p>

      <div className="relative">
        {/* Horizontal connecting rule — desktop only */}
        <div
          className="hidden md:block absolute h-px bg-black/5 dark:bg-white/5"
          style={{ top: '2.75rem', left: '4rem', right: '4rem' }}
          aria-hidden="true"
        />

        <div className="grid md:grid-cols-3 gap-12">
          {STEPS.map((step) => (
            <div key={step.num} className="relative">
              {/* Faint large step number — decorative, behind content */}
              <div
                className="text-8xl font-bold text-black/[0.03] dark:text-white/5 leading-none mb-4 select-none pointer-events-none"
                aria-hidden="true"
              >
                {step.num}
              </div>
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-600 leading-relaxed">{step.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
