"use client";

import { useMemo, useState } from "react";
import { computeScenario, sensitivity, type ScenarioResult } from "@/lib/model";
import { CONTROL_BY_KEY, type NumericKey, type ScenarioInputs } from "@/lib/schema";
import { fmtInput, fmtKm2, fmtSigned } from "@/lib/format";
import { Card, Eyebrow, SEGMENT_COLOR, Swatch } from "./ui";

const LEVER_COLOR: Record<NumericKey, string> = {
  population: SEGMENT_COLOR.residential,
  peoplePerHome: SEGMENT_COLOR.residential,
  unitsPerFloor: SEGMENT_COLOR.residential,
  floors: SEGMENT_COLOR.residential,
  homeAreaM2: SEGMENT_COLOR.residential,
  commonSpaceMultiplier: SEGMENT_COLOR.residential,
  siteMultiplier: SEGMENT_COLOR.residential,
  urbanM2PerPerson: SEGMENT_COLOR.urbanOther,
  urbanForestShare: SEGMENT_COLOR.urbanOther,
  croplandDemandFactor: SEGMENT_COLOR.cropland,
  cropYieldFactor: SEGMENT_COLOR.cropland,
  pastureDemandFactor: SEGMENT_COLOR.pasture,
  pastureProductivityFactor: SEGMENT_COLOR.pasture,
  forestTargetFactor: SEGMENT_COLOR.forest,
};

/**
 * Tornado chart: sweep each lever across its full safe range, holding the
 * rest of the current scenario fixed, and show how far total land moves.
 */
export function SensitivityChart({ inputs, compact = false }: { inputs: ScenarioInputs; compact?: boolean }) {
  const [all, setAll] = useState(false);
  const base = useMemo(() => computeScenario(inputs).totalAllocatedKm2, [inputs]);
  const rows = useMemo(() => sensitivity(inputs), [inputs]);
  const shown = all || compact ? rows : rows.slice(0, 8);
  const maxAbs = Math.max(1, ...rows.flatMap((r) => [Math.abs(r.lowTotal - base), Math.abs(r.highTotal - base)]));

  return (
    <div>
      <ul className="space-y-2.5" aria-label="Change in total allocated land when each lever moves across its full range">
        {shown.map((r) => {
          const c = CONTROL_BY_KEY[r.key];
          const lo = r.lowTotal - base;
          const hi = r.highTotal - base;
          const left = Math.min(lo, hi, 0);
          const right = Math.max(lo, hi, 0);
          const pctL = 50 + (50 * left) / maxAbs;
          const pctR = 50 + (50 * right) / maxAbs;
          const zero = r.swingKm2 < 1;
          return (
            <li key={r.key} className="grid grid-cols-[minmax(0,9.5rem)_1fr] items-center gap-3 sm:grid-cols-[12rem_1fr_9rem]">
              <span className="truncate text-xs text-ink" title={c.label}>
                {c.label}
              </span>
              <span className="relative h-5" title={`${c.label}: ${fmtInput(r.lowValue, c.unit, c.displayDivisor, c.displayUnit)} → ${fmtSigned(lo, fmtKm2)}; ${fmtInput(r.highValue, c.unit, c.displayDivisor, c.displayUnit)} → ${fmtSigned(hi, fmtKm2)}`}>
                <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-ink-3" />
                {zero ? (
                  <span aria-hidden className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink-3 bg-paper" />
                ) : (
                  <span aria-hidden className="absolute inset-y-0.5 rounded-[4px] transition-all duration-500" style={{ left: `${pctL}%`, width: `max(${pctR - pctL}%, 2px)`, background: LEVER_COLOR[r.key] }} />
                )}
              </span>
              <span className="tnum col-span-2 -mt-1 text-[11px] text-ink-3 sm:col-span-1 sm:mt-0 sm:text-right">
                {zero ? "no effect here" : `${fmtSigned(Math.min(lo, hi), fmtKm2)} … ${fmtSigned(Math.max(lo, hi), fmtKm2)}`}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-3">
        <span className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1"><Swatch color={SEGMENT_COLOR.residential} />housing</span>
          <span className="flex items-center gap-1"><Swatch color={SEGMENT_COLOR.urbanOther} />city</span>
          <span className="flex items-center gap-1"><Swatch color={SEGMENT_COLOR.cropland} />crops</span>
          <span className="flex items-center gap-1"><Swatch color={SEGMENT_COLOR.pasture} />pasture</span>
          <span className="flex items-center gap-1"><Swatch color={SEGMENT_COLOR.forest} />forest</span>
        </span>
        {!compact && rows.length > 8 && (
          <button type="button" className="font-medium text-ink underline underline-offset-2" onClick={() => setAll((a) => !a)}>
            {all ? "Show top 8" : `Show all ${rows.length}`}
          </button>
        )}
      </div>
    </div>
  );
}

export function SensitivityCard({ r }: { r: ScenarioResult }) {
  return (
    <Card aria-labelledby="sens-h">
      <Eyebrow>Which levers matter?</Eyebrow>
      <h3 id="sens-h" className="mt-1 font-serif text-2xl text-ink">
        Change in total land when one lever spans its range
      </h3>
      <p className="mt-1 mb-5 text-sm text-ink-2">
        Centre line is your current scenario ({fmtKm2(r.totalAllocatedKm2)}). Each bar sweeps one lever from its minimum to maximum while everything else stays put.
      </p>
      <SensitivityChart inputs={r.inputs} />
    </Card>
  );
}
