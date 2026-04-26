import { Check, X } from "lucide-react";

const features = [
  { name: "Logic blocks (if/else, switch)", wdym: true, gf: false, tf: true },
  { name: "One-click publish", wdym: true, gf: false, tf: false },
  { name: "Hidden fields", wdym: true, gf: false, tf: true },
  { name: "Recall (answer piping)", wdym: true, gf: false, tf: true },
  { name: "Monochrome design system", wdym: true, gf: false, tf: false },
  { name: "Free public links", wdym: true, gf: true, tf: true },
  { name: "Custom slug", wdym: true, gf: false, tf: false },
];

export default function ComparisonTable() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl tracking-tight font-bold text-black dark:text-white mb-4">
          Why wdym?
        </h2>
        <p className="text-zinc-500 max-w-xl mx-auto">
          We built the features you actually need, without the clutter of a
          generic web builder.
        </p>
      </div>

      <div className="w-full overflow-x-auto border border-black/8 dark:border-white/8 rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="p-4 sm:p-6 text-xs uppercase tracking-widest text-zinc-500 font-medium border-b border-black/8 dark:border-white/8 w-2/5">
                Feature
              </th>
              <th className="p-4 sm:p-6 text-xs uppercase tracking-widest text-black dark:text-white font-semibold border-b border-l border-black/8 dark:border-white/8 bg-black/5 dark:bg-white/5 w-1/5 text-center">
                wdym
              </th>
              <th className="p-4 sm:p-6 text-xs uppercase tracking-widest text-zinc-500 font-medium border-b border-l border-black/8 dark:border-white/8 w-1/5 text-center">
                Google Forms
              </th>
              <th className="p-4 sm:p-6 text-xs uppercase tracking-widest text-zinc-500 font-medium border-b border-l border-black/8 dark:border-white/8 w-1/5 text-center">
                Typeform
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr
                key={f.name}
                className={
                  i % 2 === 0
                    ? "bg-black/[0.02] dark:bg-white/[0.02]"
                    : "bg-transparent"
                }
              >
                <td className="p-4 sm:p-6 text-sm text-black dark:text-white font-medium border-b border-black/8 dark:border-white/8">
                  {f.name}
                </td>
                <td className="p-4 sm:p-6 border-b border-l border-black/8 dark:border-white/8 bg-black/5 dark:bg-white/5 text-center">
                  <div className="flex justify-center">
                    <Check size={18} className="text-black dark:text-white" />
                  </div>
                </td>
                <td className="p-4 sm:p-6 border-b border-l border-black/8 dark:border-white/8 text-center">
                  <div className="flex justify-center">
                    {f.gf ? (
                      <Check size={18} className="text-zinc-400" />
                    ) : (
                      <X
                        size={18}
                        className="text-zinc-600 dark:text-zinc-600"
                      />
                    )}
                  </div>
                </td>
                <td className="p-4 sm:p-6 border-b border-l border-black/8 dark:border-white/8 text-center">
                  <div className="flex justify-center">
                    {f.tf ? (
                      <Check size={18} className="text-zinc-400" />
                    ) : (
                      <X
                        size={18}
                        className="text-zinc-600 dark:text-zinc-600"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
