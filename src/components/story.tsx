"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BUNDLES } from "@/data/baselines";
import { nearestComparator } from "@/data/comparators";
import { PRESETS, presetInputs } from "@/data/presets";
import { computeScenario, type ScenarioResult } from "@/lib/model";
import { DEFAULT_INPUTS } from "@/lib/schema";
import { fmtCompact, fmtInt, fmtKm2, fmtPct, fmtRatio, sig } from "@/lib/format";
import { LandBar, scenarioSegments } from "./land-budget";
import { SensitivityChart } from "./sensitivity-chart";
import { Eyebrow, IllustrativeLabel, Reveal, SEGMENT_COLOR, Swatch, cx, useCountUp, useInView } from "./ui";

const compareTo = (a: number) => {
  const c = nearestComparator(a);
  const ratio = a / c.areaKm2;
  return { c, phrase: ratio > 0.8 && ratio < 1.25 ? `about the size of ${c.name}` : `about ${fmtRatio(ratio)} the size of ${c.name}` };
};

export function Hero({ r }: { r: ScenarioResult }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const n = useCountUp(r.residentialBuildingFootprintKm2, inView);
  const cmp = compareTo(r.residentialBuildingFootprintKm2);
  return (
    <section className="relative overflow-hidden border-b border-rule">
      <div ref={ref} className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-16 sm:px-6 md:pt-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pb-24">
        <div>
          <Eyebrow>A thought experiment in land</Eyebrow>
          <h1 className="mt-4 font-serif text-[44px] leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Could everyone on Earth fit in one city?
          </h1>
          <p className="mt-8 text-lg text-ink-2">
            Stack {fmtCompact(r.inputs.population)} people into 20-storey family towers and the buildings stand on
          </p>
          <p className="tnum mt-2 font-serif text-6xl text-ink sm:text-7xl" aria-label={`${fmtInt(r.residentialBuildingFootprintKm2)} square kilometres`}>
            {fmtInt(n)} <span className="text-3xl text-ink-3 sm:text-4xl">km²</span>
          </p>
          <p className="mt-2 text-lg text-ink-2">{cmp.phrase}.</p>
          <p className="mt-8 max-w-xl text-sm leading-relaxed text-ink-3">
            That&apos;s only the buildings. A working city, the farms that feed it and the forests we choose to keep take about {fmtInt(r.totalAllocatedKm2 / r.residentialBuildingFootprintKm2)}× more land. Everything here is arithmetic on stated assumptions, not a forecast or a relocation plan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#lab" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-ink-2">
              Explore scenarios <ArrowRight size={16} aria-hidden />
            </a>
            <a href="#story" className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-3 text-sm font-medium text-ink hover:border-ink">
              Read the story <ArrowDown size={16} aria-hidden />
            </a>
          </div>
        </div>
        <HeroSquares r={r} run={inView} />
      </div>
    </section>
  );
}

/** Nested, area-proportional squares: Earth's land, the full allocation, the city, the buildings. */
function HeroSquares({ r, run }: { r: ScenarioResult; run: boolean }) {
  const S = 420;
  const edge = (a: number) => Math.sqrt(a / r.earthLandKm2) * S;
  const layers = [
    { label: "Earth's land", km2: r.earthLandKm2, fill: "var(--c-free)", stroke: "var(--rule-strong)" },
    { label: "Cities + food + forest", km2: r.totalAllocatedKm2, fill: "color-mix(in oklab, var(--c-forest) 22%, var(--paper))", stroke: "var(--c-forest)" },
    { label: "Urban region", km2: r.urbanAreaKm2, fill: "color-mix(in oklab, var(--c-urban) 40%, var(--paper))", stroke: "#7a5fc0" },
    { label: "Tower footprints", km2: r.residentialBuildingFootprintKm2, fill: "var(--c-residential)", stroke: "var(--c-residential)" },
  ];
  return (
    <figure className="mx-auto w-full max-w-[460px]">
      <svg viewBox={`-4 -4 ${S + 8} ${S + 8}`} className="w-full" role="img" aria-label={`Nested squares to scale: ${layers.map((l) => `${l.label} ${fmtKm2(l.km2)}`).join("; ")}`}>
        {layers.map((l, i) => {
          const e = Math.max(2.5, edge(l.km2));
          return (
            <rect
              key={l.label}
              x={0}
              y={S - e}
              width={e}
              height={e}
              fill={l.fill}
              stroke={l.stroke}
              strokeWidth={1.5}
              rx={2}
              style={{
                transformOrigin: `0px ${S}px`,
                transform: run ? "scale(1)" : "scale(0)",
                transition: `transform 900ms cubic-bezier(.2,.7,.2,1) ${i * 350}ms`,
              }}
            />
          );
        })}
      </svg>
      <figcaption className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink-2">
        {layers.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-3 rounded-[3px] border" style={{ background: l.fill, borderColor: l.stroke }} />
            {l.label} <span className="tnum text-ink-3">{fmtKm2(l.km2)}</span>
          </span>
        ))}
        <span className="col-span-2 mt-1 text-[11px] text-ink-3">Square areas to scale. The blue speck in the corner is every apartment building.</span>
      </figcaption>
    </figure>
  );
}

function Chapter({ id, n, title, children, visual }: { id?: string; n: string; title: string; children: React.ReactNode; visual: React.ReactNode }) {
  return (
    <section id={id} className="border-b border-rule">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-28">
        <Reveal>
          <Eyebrow>{n}</Eyebrow>
          <h2 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">{title}</h2>
          <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink-2">{children}</div>
        </Reveal>
        <Reveal delay={150} className="lg:pt-10">
          {visual}
        </Reveal>
      </div>
    </section>
  );
}

export function Story({ r }: { r: ScenarioResult }) {
  const [alone, setAlone] = useState(false);
  const studio = useMemo(() => computeScenario({ ...DEFAULT_INPUTS, peoplePerHome: 1, unitsPerFloor: 3 }), []);
  const lowPasture = useMemo(() => computeScenario(presetInputs(PRESETS.find((p) => p.id === "lower-pasture")!)), []);
  const h = alone ? studio : r;
  const cityCmp = compareTo(r.urbanAreaKm2);
  const bundle = BUNDLES[r.inputs.bundle];

  return (
    <div id="story">
      <Chapter
        n="01 · Housing"
        title="Sharing a home is the biggest housing lever."
        visual={
          <div className="rounded-2xl border border-rule bg-paper p-6">
            <div role="radiogroup" aria-label="Household size" className="inline-flex rounded-full border border-rule bg-ivory p-1 text-sm">
              {[
                { v: false, l: "Families share (3.5 per home)" },
                { v: true, l: "Everyone alone (1 per home)" },
              ].map((o) => (
                <button key={o.l} type="button" role="radio" aria-checked={alone === o.v} onClick={() => setAlone(o.v)} className={cx("rounded-full px-3 py-1.5 text-xs font-medium sm:text-sm", alone === o.v ? "bg-ink text-paper" : "text-ink-2")}>
                  {o.l}
                </button>
              ))}
            </div>
            <dl className="mt-6 grid grid-cols-3 gap-4">
              {[
                ["Apartments", fmtCompact(h.homeCount)],
                ["Towers", fmtCompact(h.towerCount)],
                ["Footprint", fmtKm2(h.residentialBuildingFootprintKm2)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-ink-3">{k}</dt>
                  <dd className="tnum font-serif text-2xl text-ink sm:text-3xl">{v}</dd>
                </div>
              ))}
            </dl>
            <TowerField count={h.towerCount} max={studio.towerCount} />
            <p className="mt-3 text-xs text-ink-3">Each block is about {fmtCompact(Math.ceil(studio.towerCount / 100), 2)} towers. 60 m² homes, 20 floors, {h.inputs.unitsPerFloor} apartments per floor.</p>
          </div>
        }
      >
        <p>
          Give every person their own 60 m² apartment and the world needs <strong className="text-ink">{fmtCompact(studio.homeCount)}</strong> homes in{" "}
          <strong className="text-ink">{fmtCompact(studio.towerCount)}</strong> towers. Share homes at 3.5 people each and that drops to {fmtCompact(r.towerCount)} towers, {fmtPct(100 * (1 - r.towerCount / studio.towerCount), 0)} fewer.
        </p>
        <p>
          This part is exact geometry. Doubling the floors halves the footprint. Packing more apartments onto a floor means fewer, fatter towers, but the same total floor area.
        </p>
      </Chapter>

      <Chapter
        n="02 · The hidden city"
        title="Homes are not a city."
        visual={
          <div className="rounded-2xl border border-rule bg-paper p-6">
            <CityVsHousing r={r} />
          </div>
        }
      >
        <p>
          People also need streets, rail, hospitals, schools, offices, factories, stadiums, power plants, water works and parks. We give each resident a generous {r.inputs.urbanM2PerPerson} m² of city-region land for all of it.
        </p>
        <p>
          That&apos;s <strong className="text-ink">{fmtKm2(r.urbanAreaKm2)}</strong>, {cityCmp.phrase}, and {fmtInt(r.urbanAreaKm2 / r.residentialDistrictKm2)}× the land the residential districts need.
        </p>
        <p className="rounded-xl border-l-4 border-urban bg-paper p-4 text-base">
          <strong className="text-ink">A modeling choice worth seeing:</strong> the city is the <em>larger</em> of housing land or the per-person allowance, never the two added together. So with this allowance, living alone means {fmtCompact(studio.towerCount)} towers but the same {fmtKm2(studio.urbanAreaKm2)} city.
        </p>
      </Chapter>

      <Chapter
        n="03 · The hidden planet"
        title="Food and forests dwarf the city."
        visual={
          <div className="rounded-2xl border border-rule bg-paper p-6">
            <p className="mb-3 text-sm font-medium text-ink">Earth&apos;s land, ~{sig(r.earthLandKm2 / 1e6, 4)}m km²</p>
            <LandBar segments={scenarioSegments(r)} earthKm2={r.earthLandKm2} label="Default scenario land allocation" height={56} />
            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink-2">
              {scenarioSegments(r).map((s) => (
                <li key={s.id} className="flex items-center gap-1.5">
                  <Swatch color={s.color} /> {s.label} <span className="tnum text-ink-3">{fmtKm2(s.km2)}</span>
                </li>
              ))}
            </ul>
            {bundle.mixedVintage && <p className="mt-4 rounded-md bg-warn-bg p-2 text-[11px] text-warn">Mixed years: agriculture is FAO 2024, forest is FAO 2025. You can switch to a single-year 2023 bundle in the lab.</p>}
          </div>
        }
      >
        <p>
          Today&apos;s farms use about <strong className="text-ink">{fmtKm2(r.agricultureKm2)}</strong>: {fmtKm2(r.croplandKm2)} of cropland and {fmtKm2(r.pastureKm2)} of pasture. Keeping today&apos;s forest area adds <strong className="text-ink">{fmtKm2(r.forestTargetKm2)}</strong>.
        </p>
        <p>
          Some city trees already count as forest, so {fmtKm2(r.overlapKm2)} is subtracted once. The total comes to <strong className="text-ink">{fmtKm2(r.totalAllocatedKm2)}</strong>, or <strong className="text-ink">{fmtPct(r.utilizationPct)}</strong> of all land on Earth, including deserts, ice and mountains.
        </p>
        <p className="text-base text-ink-3">Forest here is a preservation choice, not land &quot;needed for oxygen&quot;. The rest of the land isn&apos;t implied to be empty, habitable or farmable.</p>
      </Chapter>

      <Chapter
        n="04 · Trade-offs"
        title="Which levers actually move the total?"
        visual={
          <div className="rounded-2xl border border-rule bg-paper p-6">
            <p className="mb-4 text-sm font-medium text-ink">Change in total land, each lever swept across its full range</p>
            <SensitivityChart inputs={r.inputs} compact />
          </div>
        }
      >
        <p>
          Sweep each assumption from its minimum to its maximum and the housing levers barely register. With the city allowance in place, floors and household size don&apos;t change total land at all.
        </p>
        <p>
          Pasture is the giant. A hypothetical 50% cut in grazing demand frees <strong className="text-ink">{fmtKm2(r.totalAllocatedKm2 - lowPasture.totalAllocatedKm2)}</strong>, roughly {fmtRatio((r.totalAllocatedKm2 - lowPasture.totalAllocatedKm2) / r.urbanAreaKm2)} the entire urban region. That&apos;s a land-area fact about the model, not a claim about any particular diet.
        </p>
      </Chapter>

      <section className="border-b border-rule bg-ink text-paper">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper/60">05 · Takeaway</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">A small built footprint doesn&apos;t mean a small ecological footprint.</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-paper/75">
              Everyone&apos;s homes fit on {fmtKm2(r.residentialBuildingFootprintKm2)}. Everything else we rely on takes {fmtPct(r.utilizationPct, 0)} of the planet&apos;s land. Now design your own planet.
            </p>
            <a href="#lab" className="mt-10 inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3 text-sm font-semibold text-ink hover:bg-ivory">
              Open the lab <ArrowRight size={16} aria-hidden />
            </a>
            <div className="mt-6">
              <IllustrativeLabel className="border-paper/20 bg-transparent text-paper/70" />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/** A field of blocks, each representing a fixed number of towers. */
function TowerField({ count, max }: { count: number; max: number }) {
  const per = Math.ceil(max / 100);
  const blocks = Math.ceil(count / per);
  return (
    <div aria-hidden className="mt-6 grid grid-cols-20 gap-1" style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}>
      {Array.from({ length: 100 }, (_, i) => (
        <span key={i} className="aspect-square rounded-[2px] transition-colors duration-500" style={{ background: i < blocks ? SEGMENT_COLOR.residential : "var(--c-free)" }} />
      ))}
    </div>
  );
}

function CityVsHousing({ r }: { r: ScenarioResult }) {
  const S = 320;
  const eU = S;
  const eR = Math.max(3, Math.sqrt(r.residentialDistrictKm2 / r.urbanAreaKm2) * S);
  const eF = Math.max(2, Math.sqrt(r.residentialBuildingFootprintKm2 / r.urbanAreaKm2) * S);
  return (
    <figure>
      <svg viewBox={`-2 -2 ${S + 4} ${S + 4}`} className="mx-auto w-full max-w-[340px]" role="img" aria-label={`Urban region ${fmtKm2(r.urbanAreaKm2)} compared with residential districts ${fmtKm2(r.residentialDistrictKm2)} and tower footprints ${fmtKm2(r.residentialBuildingFootprintKm2)}`}>
        <rect x={0} y={0} width={eU} height={eU} rx={3} fill="color-mix(in oklab, var(--c-urban) 35%, var(--paper))" stroke="#7a5fc0" strokeWidth={1.5} />
        <rect x={0} y={S - eR} width={eR} height={eR} rx={2} fill="color-mix(in oklab, var(--c-residential) 45%, var(--paper))" stroke="var(--c-residential)" strokeWidth={1.5} />
        <rect x={0} y={S - eF} width={eF} height={eF} fill="var(--c-residential)" />
      </svg>
      <figcaption className="mt-4 space-y-1.5 text-xs text-ink-2">
        <span className="flex items-center gap-1.5"><Swatch color="color-mix(in oklab, var(--c-urban) 35%, var(--paper))" /> Urban region <span className="tnum text-ink-3">{fmtKm2(r.urbanAreaKm2)}</span></span>
        <span className="flex items-center gap-1.5"><Swatch color="color-mix(in oklab, var(--c-residential) 45%, var(--paper))" /> Residential districts <span className="tnum text-ink-3">{fmtKm2(r.residentialDistrictKm2)}</span></span>
        <span className="flex items-center gap-1.5"><Swatch color="var(--c-residential)" /> Tower footprints <span className="tnum text-ink-3">{fmtKm2(r.residentialBuildingFootprintKm2)}</span></span>
      </figcaption>
    </figure>
  );
}
