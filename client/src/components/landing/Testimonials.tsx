import { Quote } from "lucide-react";
import { motion } from "framer-motion";

const testimonials = [
  {
    quote:
      "wdym completely changed how we collect user feedback. The logic blocks are so intuitive we rebuilt all our onboarding surveys in ten minutes.",
    author: "— Alex R., Product Lead at Kern",
  },
  {
    quote:
      "Finally, a survey builder that doesn't look like it's from 2012. The pure monochrome aesthetic fits seamlessly into our stealth startup's branding.",
    author: "— Sarah T., Founder at Stealth",
  },
  {
    quote:
      "The one-click publish and instant public URL means we can prototype questions during user interviews and share them live instantly. It's so fast.",
    author: "— Jordan L., Head of Research at Line",
  },
];

export default function Testimonials() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl tracking-tight font-bold text-black dark:text-white">
          What teams say.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="bg-[#f0f0f0] dark:bg-[#0d0d0d] border border-black/8 dark:border-white/8 rounded-xl p-8 flex flex-col gap-6 relative"
          >
            <Quote className="text-black/10 dark:text-white/20 w-8 h-8 absolute top-6 left-6" />
            <div className="pt-8">
              <p className="text-sm leading-relaxed text-black/80 dark:text-white/80 mb-6">
                “{t.quote}”
              </p>
              <div className="text-xs text-zinc-500 font-medium">
                {t.author}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
