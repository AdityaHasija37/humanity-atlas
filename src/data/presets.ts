import { DEFAULT_INPUTS, type NumericKey, type ScenarioInputs } from "@/lib/schema";

export interface Preset {
  id: string;
  name: string;
  question: string;
  description: string;
  /** Only the values that differ from the Family Tower baseline. */
  overrides: Partial<Record<NumericKey, number>>;
}

/** Mirrors scenario_presets.json from the starter kit. */
export const PRESETS: Preset[] = [
  {
    id: "family-tower",
    name: "Family Tower World",
    question: "What if homes are shared?",
    description: "Baseline: 3.5 people per home, 20-storey towers, today's land-use reference.",
    overrides: {},
  },
  {
    id: "private-studio",
    name: "Private Studio Planet",
    question: "What does everyone living alone cost?",
    description: "One apartment for every person, 3 apartments per floor.",
    overrides: { peoplePerHome: 1, unitsPerFloor: 3 },
  },
  {
    id: "vertical-megacity",
    name: "Vertical Megacity",
    question: "How far does stacking take us?",
    description: "50-storey towers and a tighter 60 m² urban allowance per person.",
    overrides: { floors: 50, urbanM2PerPerson: 60 },
  },
  {
    id: "garden-city",
    name: "Garden City Network",
    question: "What does spacious infrastructure change?",
    description: "10-storey towers spread across cities with 250 m² per person.",
    overrides: { floors: 10, urbanM2PerPerson: 250 },
  },
  {
    id: "lower-pasture",
    name: "Lower Pasture Demand",
    question: "Where would a diet shift matter most?",
    description: "Family Tower with hypothetically 50% lower grazing demand. Not a diet forecast.",
    overrides: { pastureDemandFactor: 0.5 },
  },
  {
    id: "forest-recovery",
    name: "Forest Recovery",
    question: "What does restoration trade off?",
    description: "Keep or restore 20% more forest area than the FAO reference.",
    overrides: { forestTargetFactor: 1.2 },
  },
];

export function presetInputs(preset: Preset, bundle = DEFAULT_INPUTS.bundle): ScenarioInputs {
  return { ...DEFAULT_INPUTS, ...preset.overrides, bundle };
}

export function presetById(id: string | null | undefined): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Which preset (if any) exactly matches these inputs, ignoring the data bundle. */
export function matchPreset(inputs: ScenarioInputs): Preset | undefined {
  return PRESETS.find((p) => {
    const target = presetInputs(p, inputs.bundle);
    return (Object.keys(DEFAULT_INPUTS) as (keyof ScenarioInputs)[]).every((k) => target[k] === inputs[k]);
  });
}
