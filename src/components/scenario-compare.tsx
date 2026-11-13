"use client";

import { ArrowLeftRight, Pin, X } from "lucide-react";
import { BUNDLES } from "@/data/baselines";
import { matchPreset } from "@/data/presets";
import { compareScenarios, explainUrbanBinding } from "@/lib/model";
import { CONTROL_BY_KEY, type ScenarioInputs } from "@/lib/schema";
import { fmtCompact, fmtInput, fmtKm2, fmtPct, fmtSigned } from "@/lib/format";
import { Card, Eyebrow, cx } from "./ui";

const ROWS: { key: "homeCount" | "towerCount" | "residentialBuildingFootprintKm2" | "residentialDistrictKm2" | "urbanAreaKm2" | "agricultureKm2" | "forestTargetKm2" | "totalAllocatedKm2"; label: string; area: boolean }[] = [
  { key: "homeCount", label: "Apartments", area: false },
  { key: "towerCount", label: "Towers", area: false },
  { key: "residentialBuildingFootprintKm2", label: "Building footprint", area: true },
  { key: "residentialDistrictKm2", label: "Residential districts", area: true },
  { key: "urbanAreaKm2", label: "Urban region", area: true },
  { key: "agricultureKm2", label: "Food land", area: true },
  { key: "forestTargetKm2", label: "Forest target", area: true },
  { key: "totalAllocatedKm2", label: "Total allocated", area: true },
];

const name = (i: ScenarioInputs) => matchPreset(i)?.name ?? "Custom scenario";

export function ScenarioCompare({ a, b, onPin, onClear, onSwap }: { a: ScenarioInputs | null; b: ScenarioInputs; onPin: () => void; onClear: () => void; onSwap: () => void }) {
  if (!a) {
    return (
      <Card aria-labelledby="cmp-h">
        <Eyebrow>Compare</Eyebrow>
        <h3 id="cmp-h" className="mt-1 font-serif text-2xl text-ink">
          Pin a scenario, then change one thing
        </h3>
        <p className="mt-2 max-w-prose text-sm text-ink-2">Pin the current settings as scenario A. Every change you make after that becomes scenario B, and this panel explains which inputs caused the difference.</p>
        <button type="button" onClick={onPin} className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-2">
          <Pin size={15} aria-hidden /> Pin current as A
        </button>
      </Card>
    );
  }

  const c = compareScenarios(a, b);
  const same = c.attributions.length === 0;
  const maxAbs = Math.max(1, ...c.attributions.map((x) => Math.abs(x.deltaKm2)), Math.abs(c.interactionKm2));

  return (
    <Card aria-labelledby="cmp-h">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow>Compare</Eyebrow>
          <h3 id="cmp-h" className="mt-1 font-serif text-2xl text-ink">
            A: {name(a)} <span className="text-ink-3">vs</span> B: {name(b)}
          </h3>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onSwap} className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-xs font-medium text-ink-2 hover:border-ink hover:text-ink">
            <ArrowLeftRight size={13} aria-hidden /> Load A
          </button>
          <button type="button" onClick={onPin} className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-xs font-medium text-ink-2 hover:border-ink hover:text-ink">
            <Pin size={13} aria-hidden /> Re-pin A
          </button>
          <button type="button" onClick={onClear} aria-label="Stop comparing" className="inline-flex items-center rounded-full border border-rule px-2 py-1.5 text-ink-2 hover:border-ink hover:text-ink">
            <X size={14} aria-hidden />
          </button>
        </div>
      </div>

      {same ? (
        <p className="mt-4 rounded-lg bg-ivory p-3 text-sm text-ink-2">B matches A. Change any control or preset to see the difference.</p>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">Scenario A versus B</caption>
          <thead>
            <tr className="border-b border-rule text-xs uppercase tracking-wider text-ink-3">
              <th scope="col" className="py-2 text-left font-medium">Metric</th>
              <th scope="col" className="py-2 text-right font-medium">A</th>
              <th scope="col" className="py-2 text-right font-medium">B</th>
              <th scope="col" className="py-2 text-right font-medium">Change</th>
              <th scope="col" className="py-2 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody className="tnum">
            {ROWS.map((row) => {
              const va = c.a[row.key];
              const vb = c.b[row.key];
              const d = vb - va;
              const f = row.area ? fmtKm2 : fmtCompact;
              return (
                <tr key={row.key} className={cx("border-b border-rule/70", row.key === "totalAllocatedKm2" && "font-semibold")}>
                  <th scope="row" className="py-2 text-left font-normal">{row.label}</th>
                  <td className="py-2 text-right">{f(va)}</td>
                  <td className="py-2 text-right">{f(vb)}</td>
                  <td className={cx("py-2 text-right", d === 0 && "text-ink-3")}>{d === 0 ? "no change" : fmtSigned(d, f)}</td>
                  <td className="py-2 text-right text-ink-3">{va === 0 || d === 0 ? "–" : fmtSigned((100 * d) / va, (x) => fmtPct(x))}</td>
                </tr>
              );
            })}
            <tr>
              <th scope="row" className="py-2 text-left font-normal">Share of Earth&apos;s land</th>
              <td className="py-2 text-right">{fmtPct(c.a.utilizationPct)}</td>
              <td className="py-2 text-right">{fmtPct(c.b.utilizationPct)}</td>
              <td className="py-2 text-right">{fmtSigned(c.b.utilizationPct - c.a.utilizationPct, (x) => `${x.toFixed(1)} pts`)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {!same && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-ink">Why total land differs</h4>
          <p className="mt-0.5 text-xs text-ink-3">Each bar moves only that input from A&apos;s value to B&apos;s, holding the rest of A fixed.</p>
          <ul className="mt-3 space-y-2">
            {c.attributions.map((x) => {
              const label = x.key === "bundle" ? "Data bundle" : CONTROL_BY_KEY[x.key].label;
              const fmt = (v: number | string) => (x.key === "bundle" ? BUNDLES[v as "latest"].shortLabel : fmtInput(v as number, CONTROL_BY_KEY[x.key].unit, CONTROL_BY_KEY[x.key].displayDivisor, CONTROL_BY_KEY[x.key].displayUnit));
              return (
                <AttributionRow key={x.key} label={`${label}: ${fmt(x.from)} → ${fmt(x.to)}`} delta={x.deltaKm2} maxAbs={maxAbs} />
              );
            })}
            {Math.abs(c.interactionKm2) >= 1 && <AttributionRow label="Interaction between changes" delta={c.interactionKm2} maxAbs={maxAbs} muted />}
          </ul>
          <p className="mt-4 rounded-lg bg-ivory p-3 text-xs leading-relaxed text-ink-2">
            <strong className="text-ink">Net change: {fmtSigned(c.deltaTotalKm2, fmtKm2)}</strong> ({fmtSigned(c.deltaPct, (v) => fmtPct(v))}).{" "}
            {c.deltaTotalKm2 === 0 && c.b.towerCount !== c.a.towerCount ? `Tower count changed but total land didn't. ${explainUrbanBinding(c.b)}` : ""}
            {Math.abs(c.interactionKm2) >= 1 ? " Part of the change comes from inputs interacting, for example through the max() rule that sets urban area." : ""}
          </p>
        </div>
      )}
    </Card>
  );
}

function AttributionRow({ label, delta, maxAbs, muted }: { label: string; delta: number; maxAbs: number; muted?: boolean }) {
  const w = (50 * Math.abs(delta)) / maxAbs;
  return (
    <li className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem] sm:items-center sm:gap-3">
      <span className={cx("text-ink", muted && "italic text-ink-3")}>{label}</span>
      <span className="relative h-4">
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-ink-3" />
        <span aria-hidden className="absolute inset-y-0.5 rounded-[3px]" style={{ left: delta < 0 ? `${50 - w}%` : "50%", width: `max(${w}%, ${delta === 0 ? 0 : 2}px)`, background: delta < 0 ? "var(--c-forest)" : "var(--c-pasture)" }} />
      </span>
      <span className="tnum text-ink-2 sm:text-right">{delta === 0 ? "no effect" : fmtSigned(delta, fmtKm2)}</span>
    </li>
  );
}
