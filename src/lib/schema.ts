import { z } from "zod";
import type { BundleId } from "@/data/baselines";

export type NumericKey =
  | "population"
  | "peoplePerHome"
  | "unitsPerFloor"
  | "floors"
  | "homeAreaM2"
  | "commonSpaceMultiplier"
  | "siteMultiplier"
  | "urbanM2PerPerson"
  | "croplandDemandFactor"
  | "pastureDemandFactor"
  | "cropYieldFactor"
  | "pastureProductivityFactor"
  | "forestTargetFactor"
  | "urbanForestShare";

export type ScenarioInputs = Record<NumericKey, number> & { bundle: BundleId };

export type ControlGroup = "housing" | "city" | "land";

export interface ControlSpec {
  key: NumericKey;
  label: string;
  short: string; // URL param
  min: number;
  max: number;
  step: number;
  unit: string;
  group: ControlGroup;
  help: string;
  /** Display scale (e.g. population shown in billions). */
  displayDivisor?: number;
  displayUnit?: string;
  integer?: boolean;
}

/** Safe ranges from the technical spec, §06. */
export const CONTROLS: ControlSpec[] = [
  { key: "population", label: "Population", short: "pop", min: 1e9, max: 12e9, step: 1e8, unit: "people", group: "housing", displayDivisor: 1e9, displayUnit: "billion", help: "Rounded scenario population. 8.3 billion is close to the UN estimate for the mid-2020s." },
  { key: "peoplePerHome", label: "People per home", short: "pph", min: 1, max: 6, step: 0.5, unit: "people", group: "housing", help: "Average household size. 1 means everyone lives alone; 3.5 is a shared-family average." },
  { key: "unitsPerFloor", label: "Apartments per floor", short: "upf", min: 1, max: 12, step: 0.5, unit: "homes", group: "housing", help: "Average across towers. Changes how many towers you need, but not total floor area." },
  { key: "floors", label: "Floors per tower", short: "fl", min: 1, max: 100, step: 1, unit: "floors", group: "housing", integer: true, help: "Stacking more floors shrinks the building footprint proportionally." },
  { key: "homeAreaM2", label: "Apartment size", short: "ha", min: 30, max: 150, step: 5, unit: "m²", group: "housing", help: "Usable floor area of one home. 60 m² is roughly a compact 1BHK." },
  { key: "commonSpaceMultiplier", label: "Common-area multiplier", short: "cs", min: 1.1, max: 1.6, step: 0.05, unit: "×", group: "housing", help: "Corridors, lifts and stairwells as a multiple of apartment area." },
  { key: "siteMultiplier", label: "Residential site multiplier", short: "sm", min: 2, max: 8, step: 0.5, unit: "×", group: "housing", help: "Grounds, setbacks and internal lanes as a multiple of the tower footprint." },
  { key: "urbanM2PerPerson", label: "Urban land per resident", short: "u", min: 30, max: 500, step: 10, unit: "m²", group: "city", help: "Land for the whole city: transport, hospitals, offices, factories, schools, power, water, parks. Acts as a minimum, not an add-on." },
  { key: "urbanForestShare", label: "Urban forest share", short: "uf", min: 0, max: 0.3, step: 0.01, unit: "share", group: "city", help: "Share of urban land that also counts as forest. Counted once." },
  { key: "croplandDemandFactor", label: "Cropland demand", short: "cd", min: 0.5, max: 1.5, step: 0.05, unit: "×", group: "land", help: "Hypothetical multiplier on today's crop demand. Not a diet model." },
  { key: "cropYieldFactor", label: "Crop yield", short: "cy", min: 0.7, max: 2, step: 0.05, unit: "×", group: "land", help: "Output per hectare relative to today. Higher yield needs less land." },
  { key: "pastureDemandFactor", label: "Pasture demand", short: "pd", min: 0, max: 1.5, step: 0.05, unit: "×", group: "land", help: "Hypothetical multiplier on grazing demand. 0.5 halves pasture; it is not a forecast of any diet." },
  { key: "pastureProductivityFactor", label: "Pasture productivity", short: "pp", min: 0.7, max: 2, step: 0.05, unit: "×", group: "land", help: "Output per hectare of grazing land relative to today." },
  { key: "forestTargetFactor", label: "Forest preservation target", short: "ft", min: 0.5, max: 1.5, step: 0.05, unit: "×", group: "land", help: "Forest area to keep, relative to the FAO baseline. A policy choice, not a biological requirement." },
];

export const CONTROL_BY_KEY = Object.fromEntries(CONTROLS.map((c) => [c.key, c])) as Record<NumericKey, ControlSpec>;

export const DEFAULT_INPUTS: ScenarioInputs = {
  population: 8_300_000_000,
  peoplePerHome: 3.5,
  unitsPerFloor: 3.5,
  floors: 20,
  homeAreaM2: 60,
  commonSpaceMultiplier: 1.25,
  siteMultiplier: 4,
  urbanM2PerPerson: 150,
  croplandDemandFactor: 1,
  pastureDemandFactor: 1,
  cropYieldFactor: 1,
  pastureProductivityFactor: 1,
  forestTargetFactor: 1,
  urbanForestShare: 0.1,
  bundle: "latest",
};

const ranged = (c: ControlSpec) => {
  const base = z.number().finite().min(c.min).max(c.max);
  return c.integer ? base.int() : base;
};

export const ScenarioSchema = z.object({
  ...(Object.fromEntries(CONTROLS.map((c) => [c.key, ranged(c)])) as Record<NumericKey, z.ZodNumber>),
  bundle: z.enum(["latest", "fao2023"]),
});

export function validateInputs(input: unknown) {
  return ScenarioSchema.safeParse(input);
}

/** Clamp to the safe range and snap integers. Used for user input; NaN falls back to default. */
export function clampValue(key: NumericKey, value: number): number {
  const c = CONTROL_BY_KEY[key];
  if (!Number.isFinite(value)) return DEFAULT_INPUTS[key];
  let v = Math.min(c.max, Math.max(c.min, value));
  if (c.integer) v = Math.round(v);
  return v;
}

export const URL_VERSION = "1";

/** Encode only non-default values so links stay short. */
export function encodeInputs(inputs: ScenarioInputs, presetId?: string): URLSearchParams {
  const p = new URLSearchParams();
  p.set("v", URL_VERSION);
  if (presetId) p.set("preset", presetId);
  for (const c of CONTROLS) {
    if (inputs[c.key] !== DEFAULT_INPUTS[c.key]) p.set(c.short, String(inputs[c.key]));
  }
  if (inputs.bundle !== DEFAULT_INPUTS.bundle) p.set("b", inputs.bundle);
  return p;
}

/**
 * Decode URL state. Unknown or invalid params fall back to defaults field by
 * field so that one bad value never discards a whole shared scenario.
 */
export function decodeInputs(params: URLSearchParams, base: ScenarioInputs = DEFAULT_INPUTS): ScenarioInputs {
  const out: ScenarioInputs = { ...base };
  for (const c of CONTROLS) {
    const raw = params.get(c.short);
    if (raw === null || raw.trim() === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n)) out[c.key] = clampValue(c.key, n);
  }
  const b = params.get("b");
  if (b === "latest" || b === "fao2023") out.bundle = b;
  return out;
}

/** Compact string for embedding a second scenario (compare A) in the URL. */
export function serializeCompact(inputs: ScenarioInputs): string {
  return encodeInputs(inputs).toString();
}

export function deserializeCompact(s: string): ScenarioInputs {
  return decodeInputs(new URLSearchParams(s));
}
