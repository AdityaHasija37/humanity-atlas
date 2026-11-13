"use client";

import { BUNDLES } from "@/data/baselines";
import { nearestComparator } from "@/data/comparators";
import { explainUrbanBinding, type ScenarioResult } from "@/lib/model";
import { fmtCompact, fmtKm2, fmtPct, fmtRatio } from "@/lib/format";
import { InfoTip, cx } from "./ui";

interface Kpi {
  label: string;
  value: string;
  sub: string;
  info: string;
  tone?: "warn";
}

export function kpis(r: ScenarioResult): Kpi[] {
  const b = BUNDLES[r.inputs.bundle];
  const near = (a: number) => {
    const c = nearestComparator(a);
    return `≈ ${fmtRatio(a / c.areaKm2)} ${c.name}`;
  };
  return [
    { label: "Population", value: fmtCompact(r.inputs.population), sub: "scenario input", info: "Rounded scenario population (UN WPP order of magnitude), not a live census." },
    { label: "Apartments", value: fmtCompact(r.homeCount), sub: `${r.inputs.peoplePerHome} people each`, info: "ceil(population ÷ people per home). Exact geometry." },
    { label: "Towers", value: fmtCompact(r.towerCount), sub: `${r.unitCapacityPerTower} homes each`, info: "ceil(homes ÷ (floors × apartments per floor)). The ceiling is applied once, to the total." },
    { label: "Building footprint", value: fmtKm2(r.residentialBuildingFootprintKm2), sub: near(r.residentialBuildingFootprintKm2), info: "Gross apartment floor area (homes × size × common-area multiplier) ÷ floors." },
    { label: "Urban region", value: fmtKm2(r.urbanAreaKm2), sub: r.urbanBinding === "services" ? "set by city allowance" : "set by housing", info: explainUrbanBinding(r) },
    { label: "Food land", value: fmtKm2(r.agricultureKm2), sub: `crops ${fmtKm2(r.croplandKm2)} · pasture ${fmtKm2(r.pastureKm2)}`, info: `Cropland and pasture baselines from ${b.label}, scaled by demand ÷ yield factors.` },
    { label: "Forest target", value: fmtKm2(r.forestTargetKm2), sub: `${r.inputs.forestTargetFactor}× FAO ${b.forestKm2.year}`, info: "Area to keep as forest. A preservation choice, not land 'required for oxygen' and not a consequence of population." },
    {
      label: "Share of Earth's land",
      value: fmtPct(r.utilizationPct),
      sub: r.exceedsLand ? "exceeds terrestrial area" : `${fmtKm2(r.remainingKm2)} unallocated`,
      info: "Total allocated ÷ ~148.94m km² of land. Unallocated land is not implied to be habitable or buildable.",
      tone: r.exceedsLand ? "warn" : undefined,
    },
  ];
}

export function KpiStrip({ r }: { r: ScenarioResult }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-rule bg-rule xl:grid-cols-4">
      {kpis(r).map((k, i) => (
        <div key={k.label} className={cx("bg-paper p-4", k.tone === "warn" && "bg-warn-bg")}>
          <dt className="flex items-center gap-0.5 text-xs font-medium text-ink-3">
            {k.label}
            <InfoTip label={k.label} align={i % 2 === 1 ? "right" : "left"}>
              {k.info}
            </InfoTip>
          </dt>
          <dd className={cx("tnum mt-1 whitespace-nowrap font-serif text-2xl leading-tight text-ink", k.tone === "warn" && "text-warn")}>{k.value}</dd>
          <dd className="mt-1 text-xs text-ink-3">{k.sub}</dd>
        </div>
      ))}
    </dl>
  );
}
