import type { ScenarioResult } from "@/lib/model";
import { fmtKm2, fmtPct } from "@/lib/format";
import { Eyebrow } from "./ui";

export function CaseStudy({ r, onSources }: { r: ScenarioResult; onSources: () => void }) {
  const steps: [string, React.ReactNode][] = [
    ["Problem", "\"Could everyone fit in one city?\" mixes three questions: how much space housing takes, what a working city needs, and what feeding people and keeping forests takes. Answers online usually blur them, so a striking number ends up implying the wrong thing."],
    ["Insight", `Housing is tiny (${fmtKm2(r.residentialBuildingFootprintKm2)} of footprints), cities are moderate (${fmtKm2(r.urbanAreaKm2)}), and food plus forest is enormous (${fmtKm2(r.agricultureKm2 + r.forestTargetKm2)}). The surprise isn't any single number; it's the four-orders-of-magnitude gap between them.`],
    ["Product hypothesis", "If each layer stays separately visible and adjustable, people will trust the headline more and reach the real takeaway on their own: a small built footprint isn't a small ecological footprint."],
    ["Modeling decisions", "The central call was separating exact residential geometry from uncertain system assumptions. Towers and footprints are deterministic arithmetic. The city is max(housing land, per-person allowance), a floor rather than a sum, which is why sharing homes cuts towers but not city area. Forest is a preservation target, and urban tree cover is subtracted once to avoid double counting."],
    ["Data provenance", "Every constant carries a unit, year, source URL and a label: observed, assumption or derived. The default bundle mixes FAO 2024 agriculture with FAO 2025 forest and says so on screen; a single-year FAO 2023 bundle is one click away."],
    ["UX flows", "Story first (hook → housing → city → planet → trade-offs → takeaway), then a lab: presets that show which inputs they change, live KPIs, a stacked land bar with an accessible table, A/B compare with per-input attribution, an area-true map, and shareable URLs."],
    ["Trade-offs", "Custom SVG charts over a charting library for full control of honesty rules, like never clipping a bar past 100% of land. No live data fetch, so the demo works offline and never shows numbers that didn't come from cited baselines. No climate, water or cost outputs, because they aren't independently modeled."],
    ["Validation", `Unit tests cover every displayed derived metric, including the spec's audit table (${fmtPct(r.utilizationPct)} of land by default), boundary validation, URL round-trips and oversubscription. The audit caught that the spec's tower count (33,877,551) contradicted its own ceiling rule; the app uses 33,877,552. Playwright smoke tests check presets, URL state and the exceeds-land warning.`],
    ["Reflection", "The most useful feature turned out to be explaining non-changes. When a user switches to studios and total land doesn't move, the compare panel says why. Next I'd add an independently sourced diet-to-land model rather than leave pasture as a bare multiplier."],
  ];
  return (
    <section id="case-study" aria-labelledby="cs-h" className="border-t border-rule bg-paper">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <Eyebrow>Case study</Eyebrow>
        <h2 id="cs-h" className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
          How this was built, and why
        </h2>
        <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
          {steps.map(([t, body], i) => (
            <li key={t} className="border-t border-rule pt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
                {String(i + 1).padStart(2, "0")} · {t}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{body}</p>
            </li>
          ))}
        </ol>
        <button type="button" onClick={onSources} className="mt-10 rounded-full border border-ink px-5 py-2.5 text-sm font-medium text-ink hover:bg-ink hover:text-paper">
          Read every source and assumption
        </button>
      </div>
    </section>
  );
}
