"use client";

import { RotateCcw } from "lucide-react";
import { BUNDLES, type BundleId } from "@/data/baselines";
import { PRESETS } from "@/data/presets";
import { CONTROLS, CONTROL_BY_KEY, DEFAULT_INPUTS, clampValue, type ControlGroup, type ControlSpec, type NumericKey, type ScenarioInputs } from "@/lib/schema";
import { fmtInput } from "@/lib/format";
import { Eyebrow, InfoTip, cx } from "./ui";

const GROUPS: { id: ControlGroup; title: string; blurb: string }[] = [
  { id: "housing", title: "Housing", blurb: "Exact geometry: homes, towers, footprints." },
  { id: "city", title: "The hidden city", blurb: "Everything a city needs beyond homes." },
  { id: "land", title: "The hidden planet", blurb: "Hypothetical multipliers on FAO baselines." },
];

export function PresetPicker({ presetId, onPick }: { presetId?: string; onPick: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Scenario presets" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {PRESETS.map((p) => {
        const on = p.id === presetId;
        const changed = Object.keys(p.overrides) as NumericKey[];
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(p.id)}
            className={cx(
              "rounded-xl border p-3 text-left transition-colors",
              on ? "border-ink bg-ink text-paper" : "border-rule bg-paper text-ink hover:border-ink-3",
            )}
          >
            <span className="block text-sm font-semibold">{p.name}</span>
            <span className={cx("mt-0.5 block text-xs", on ? "text-paper/75" : "text-ink-3")}>{p.question}</span>
            <span className="mt-2 flex flex-wrap gap-1">
              {changed.length === 0 ? (
                <Chip on={on}>baseline</Chip>
              ) : (
                changed.map((k) => (
                  <Chip key={k} on={on}>
                    {CONTROL_BY_KEY[k].label.toLowerCase()} {fmtInput(p.overrides[k]!, CONTROL_BY_KEY[k].unit, CONTROL_BY_KEY[k].displayDivisor, CONTROL_BY_KEY[k].displayUnit)}
                  </Chip>
                ))
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Chip({ children, on }: { children: React.ReactNode; on: boolean }) {
  return <span className={cx("rounded-full px-2 py-0.5 font-mono text-[10px]", on ? "bg-paper/15 text-paper" : "bg-ivory text-ink-2")}>{children}</span>;
}

export function ScenarioControls({
  inputs,
  onChange,
  onBundle,
  onReset,
}: {
  inputs: ScenarioInputs;
  onChange: (key: NumericKey, value: number) => void;
  onBundle: (b: BundleId) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-ink">Design a planet</h2>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-xs font-medium text-ink-2 hover:border-ink hover:text-ink">
          <RotateCcw size={13} aria-hidden /> Reset
        </button>
      </div>
      {GROUPS.map((g) => (
        <fieldset key={g.id} className="space-y-4">
          <legend className="mb-3">
            <Eyebrow>{g.title}</Eyebrow>
            <span className="mt-0.5 block text-xs text-ink-3">{g.blurb}</span>
          </legend>
          {CONTROLS.filter((c) => c.group === g.id).map((c) => (
            <Slider key={c.key} spec={c} value={inputs[c.key]} onChange={(v) => onChange(c.key, v)} />
          ))}
        </fieldset>
      ))}
      <fieldset>
        <legend className="mb-2">
          <Eyebrow>Data bundle</Eyebrow>
        </legend>
        <div className="space-y-2">
          {(Object.keys(BUNDLES) as BundleId[]).map((id) => (
            <label key={id} className={cx("flex cursor-pointer gap-2 rounded-lg border p-2.5 text-xs", inputs.bundle === id ? "border-ink bg-ivory" : "border-rule")}>
              <input type="radio" name="bundle" value={id} checked={inputs.bundle === id} onChange={() => onBundle(id)} className="mt-0.5 accent-[#14213d]" />
              <span>
                <span className="block font-semibold text-ink">{BUNDLES[id].label}</span>
                <span className="text-ink-3">{BUNDLES[id].caveat}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function Slider({ spec, value, onChange }: { spec: ControlSpec; value: number; onChange: (v: number) => void }) {
  const id = `ctl-${spec.key}`;
  const fill = (100 * (value - spec.min)) / (spec.max - spec.min);
  const changed = value !== DEFAULT_INPUTS[spec.key];
  const div = spec.displayDivisor ?? 1;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="flex items-center text-sm text-ink">
          {spec.label}
          <InfoTip label={spec.label}>
            {spec.help} Range {fmtInput(spec.min, spec.unit, spec.displayDivisor, spec.displayUnit)} to {fmtInput(spec.max, spec.unit, spec.displayDivisor, spec.displayUnit)}. Default {fmtInput(DEFAULT_INPUTS[spec.key], spec.unit, spec.displayDivisor, spec.displayUnit)}.
          </InfoTip>
        </label>
        <span className="flex items-center gap-1">
          {changed && <span aria-label="changed from default" className="h-1.5 w-1.5 rounded-full bg-crop" />}
          <input
            type="number"
            aria-label={`${spec.label} value`}
            className="tnum w-20 rounded-md border border-rule bg-ivory px-2 py-0.5 text-right text-sm text-ink"
            value={Number((value / div).toPrecision(6))}
            min={spec.min / div}
            max={spec.max / div}
            step={spec.step / div}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              if (Number.isFinite(n)) onChange(clampValue(spec.key, n * div));
            }}
          />
          <span className="w-12 text-xs text-ink-3">{spec.displayUnit ?? (spec.unit === "share" ? "" : spec.unit)}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        aria-valuetext={fmtInput(value, spec.unit, spec.displayDivisor, spec.displayUnit)}
        onChange={(e) => onChange(clampValue(spec.key, e.target.valueAsNumber))}
        style={{ ["--fill" as string]: `${fill}%` }}
      />
    </div>
  );
}
