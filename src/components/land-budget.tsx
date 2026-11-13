"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { BUNDLES } from "@/data/baselines";
import { landSegments, type ScenarioResult, type SegmentId } from "@/lib/model";
import { fmtInt, fmtKm2, fmtPct, sig } from "@/lib/format";
import { Card, Eyebrow, IllustrativeLabel, InfoTip, SEGMENT_COLOR, Swatch, cx } from "./ui";

interface BarSegment {
  id: SegmentId | "free" | "other";
  label: string;
  km2: number;
  color: string;
  detail?: string;
}

const HATCH = "repeating-linear-gradient(135deg, var(--c-free) 0 6px, #ddd4c0 6px 7px)";

/**
 * Horizontal stacked bar at Earth's land scale. When the allocation exceeds
 * Earth's land, the scale grows to fit and a marker shows where Earth ends,
 * so nothing is ever clipped.
 */
export function LandBar({
  segments,
  earthKm2,
  scaleKm2,
  label,
  height = 44,
  showFree = true,
}: {
  segments: BarSegment[];
  earthKm2: number;
  scaleKm2?: number;
  label: string;
  height?: number;
  showFree?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  const total = segments.reduce((s, x) => s + x.km2, 0);
  const scale = Math.max(scaleKm2 ?? 0, earthKm2, total);
  const free = Math.max(0, earthKm2 - total);
  const all: BarSegment[] = showFree && free > 0 ? [...segments, { id: "free", label: "Not allocated in this scenario", km2: free, color: HATCH, detail: "Includes deserts, ice, mountains and other land. Not implied to be habitable or buildable." }] : segments;
  const act = all.find((s) => s.id === active);
  const earthPct = (100 * earthKm2) / scale;

  return (
    <div className="relative">
      <div role="img" aria-label={`${label}: ${segments.map((s) => `${s.label} ${fmtKm2(s.km2)}`).join(", ")}`} className="relative flex w-full overflow-visible rounded-md" style={{ height }}>
        {all.map((s) => {
          const pct = (100 * s.km2) / scale;
          if (pct <= 0) return null;
          return (
            <button
              key={s.id}
              type="button"
              aria-label={`${s.label}: ${fmtKm2(s.km2, false)}, ${fmtPct((100 * s.km2) / earthKm2)} of Earth's land`}
              onMouseEnter={() => setActive(s.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(s.id)}
              onBlur={() => setActive(null)}
              onClick={() => setActive((a) => (a === s.id ? null : s.id))}
              className={cx("h-full shrink-0 border-r-2 border-paper transition-[width,opacity] duration-700 ease-out first:rounded-l-md last:rounded-r-md last:border-r-0", active && active !== s.id && "opacity-60")}
              style={{ width: `max(${pct}%, ${s.id === "free" ? 0 : 3}px)`, background: s.color }}
            />
          );
        })}
        {total > earthKm2 && (
          <div aria-hidden className="pointer-events-none absolute -top-2 -bottom-2 border-l-2 border-dashed border-warn" style={{ left: `${earthPct}%` }}>
            <span className="absolute top-full mt-1 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-semibold text-warn">Earth&apos;s land</span>
          </div>
        )}
      </div>
      <div aria-live="polite" className={cx("min-h-[2.5rem] text-xs text-ink-2", total > earthKm2 ? "mt-7" : "mt-2")}>
        {act ? (
          <p>
            <span className="font-semibold text-ink">{act.label}</span> · <span className="tnum">{fmtKm2(act.km2, false)}</span> · <span className="tnum">{fmtPct((100 * act.km2) / earthKm2)}</span> of Earth&apos;s land
            {act.detail && <span className="block text-ink-3">{act.detail}</span>}
          </p>
        ) : (
          <p className="text-ink-3">Hover, tap or tab through the bar for details.</p>
        )}
      </div>
    </div>
  );
}

export function scenarioSegments(r: ScenarioResult): BarSegment[] {
  return landSegments(r).map((s) => ({
    ...s,
    color: SEGMENT_COLOR[s.id],
    detail:
      s.id === "forest"
        ? `Preservation target of ${fmtKm2(r.forestTargetKm2)}, minus ${fmtKm2(r.overlapKm2)} already counted as urban tree cover.`
        : s.id === "urbanOther"
          ? "Transport, hospitals, schools, offices, factories, power, water and parks, set by the per-person urban allowance."
          : s.id === "residential"
            ? "Tower footprints plus their grounds, setbacks and lanes."
            : undefined,
  }));
}

export function LandBudget({ r }: { r: ScenarioResult }) {
  const bundle = BUNDLES[r.inputs.bundle];
  const segs = scenarioSegments(r);
  const scale = Math.max(r.earthLandKm2, r.totalAllocatedKm2);
  const refSegs: BarSegment[] = [
    { id: "cropland", label: `Cropland (${bundle.croplandKm2.year})`, km2: bundle.croplandKm2.value, color: SEGMENT_COLOR.cropland },
    { id: "pasture", label: `Pasture (${bundle.pastureKm2.year})`, km2: bundle.pastureKm2.value, color: SEGMENT_COLOR.pasture },
    { id: "forest", label: `Forest (${bundle.forestKm2.year})`, km2: bundle.forestKm2.value, color: SEGMENT_COLOR.forest },
  ];

  return (
    <Card id="land-budget" aria-labelledby="land-budget-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>Land budget</Eyebrow>
          <h3 id="land-budget-h" className="mt-1 font-serif text-2xl text-ink">
            Where {sig(r.inputs.population / 1e9, 3)} billion people&apos;s land goes
          </h3>
        </div>
        <IllustrativeLabel />
      </div>

      {r.exceedsLand && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            <strong>Exceeds terrestrial area.</strong> This scenario allocates {fmtKm2(r.totalAllocatedKm2)}, which is {fmtKm2(-r.remainingKm2)} more than Earth&apos;s land ({fmtPct(r.utilizationPct)}). The chart extends past the dashed line instead of clipping.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-ink">This scenario</span>
            <span className="tnum text-ink-2">
              {fmtKm2(r.totalAllocatedKm2)} · <strong className="text-ink">{fmtPct(r.utilizationPct)}</strong> of land
            </span>
          </div>
          <LandBar segments={segs} earthKm2={r.earthLandKm2} scaleKm2={scale} label="Scenario land allocation" />
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-ink">
              FAO reference, observed
              <InfoTip label="Reference bar">
                Observed agriculture and forest only, from the selected data bundle. FAO doesn&apos;t give a matching global urban figure here, so urban land is left out rather than guessed. {bundle.mixedVintage && bundle.caveat}
              </InfoTip>
            </span>
            <span className="tnum text-ink-2">{fmtKm2(refSegs.reduce((s, x) => s + x.km2, 0))}</span>
          </div>
          <LandBar segments={refSegs} earthKm2={r.earthLandKm2} scaleKm2={scale} label="Observed reference land use" height={20} />
        </div>
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-2" aria-label="Legend">
        {segs.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <Swatch color={s.color} />
            {s.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <Swatch color={HATCH} />
          Not allocated
        </li>
      </ul>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <caption className="sr-only">Land allocation breakdown</caption>
          <thead>
            <tr className="border-b border-rule text-xs uppercase tracking-wider text-ink-3">
              <th scope="col" className="py-2 font-medium">Layer</th>
              <th scope="col" className="py-2 text-right font-medium">Area</th>
              <th scope="col" className="py-2 text-right font-medium">Share of land</th>
              <th scope="col" className="py-2 pl-4 font-medium">How it&apos;s set</th>
            </tr>
          </thead>
          <tbody className="tnum">
            <Row color={SEGMENT_COLOR.residential} label="Residential districts" km2={r.residentialDistrictKm2} earth={r.earthLandKm2} how="Tower footprint × site multiplier" />
            <Row color={SEGMENT_COLOR.urbanOther} label="Rest of the city" km2={r.urbanNonResidentialKm2} earth={r.earthLandKm2} how={r.urbanBinding === "services" ? "Urban allowance minus housing" : "0 (housing sets urban area)"} />
            <Row color={SEGMENT_COLOR.cropland} label="Cropland" km2={r.croplandKm2} earth={r.earthLandKm2} how={`${sig(r.baselineCroplandKm2 / 1e6)}m × ${r.inputs.croplandDemandFactor} demand ÷ ${r.inputs.cropYieldFactor} yield`} />
            <Row color={SEGMENT_COLOR.pasture} label="Pasture" km2={r.pastureKm2} earth={r.earthLandKm2} how={`${sig(r.baselinePastureKm2 / 1e6)}m × ${r.inputs.pastureDemandFactor} demand ÷ ${r.inputs.pastureProductivityFactor} productivity`} />
            <Row color={SEGMENT_COLOR.forest} label="Forest target" km2={r.forestTargetKm2} earth={r.earthLandKm2} how={`${sig(r.baselineForestKm2 / 1e6)}m × ${r.inputs.forestTargetFactor} target`} />
            <Row label="Urban–forest overlap" km2={-r.overlapKm2} earth={r.earthLandKm2} how={`${fmtPct(r.inputs.urbanForestShare * 100, 0)} of urban land, counted once`} />
            <tr className="border-t-2 border-ink font-semibold">
              <td className="py-2">Total allocated</td>
              <td className="whitespace-nowrap py-2 text-right">{fmtInt(r.totalAllocatedKm2)} km²</td>
              <td className="py-2 text-right">{fmtPct(r.utilizationPct)}</td>
              <td className="py-2 pl-4 text-xs font-normal text-ink-3">Urban + agriculture + forest − overlap</td>
            </tr>
            <tr className={cx(r.exceedsLand && "text-warn")}>
              <td className="py-2">{r.exceedsLand ? "Exceeds land available" : "Remaining land"}</td>
              <td className="whitespace-nowrap py-2 text-right">{fmtInt(r.remainingKm2)} km²</td>
              <td className="py-2 text-right">{fmtPct((100 * r.remainingKm2) / r.earthLandKm2)}</td>
              <td className="py-2 pl-4 text-xs text-ink-3">Not implied to be habitable, contiguous or buildable</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Row({ color, label, km2, earth, how }: { color?: string; label: string; km2: number; earth: number; how: string }) {
  return (
    <tr className="border-b border-rule/70">
      <td className="py-2">
        <span className="flex items-center gap-2">
          {color ? <Swatch color={color} /> : <span className="inline-block w-3" />}
          {label}
        </span>
      </td>
      <td className="whitespace-nowrap py-2 text-right">{fmtInt(km2)} km²</td>
      <td className="py-2 text-right">{fmtPct((100 * km2) / earth, 2)}</td>
      <td className="py-2 pl-4 text-xs text-ink-3">{how}</td>
    </tr>
  );
}
