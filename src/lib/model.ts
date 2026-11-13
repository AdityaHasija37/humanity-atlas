/**
 * Humanity Atlas scenario model. Pure functions only, no rounding for display.
 * Formulas follow the technical spec §03–§04.
 */
import { BUNDLES, EARTH_LAND, EARTH_RADIUS_KM } from "@/data/baselines";
import { CONTROLS, type NumericKey, type ScenarioInputs } from "./schema";

export interface ScenarioResult {
  inputs: ScenarioInputs;
  // Housing
  homeCount: number;
  unitCapacityPerTower: number;
  towerCount: number;
  grossApartmentAreaM2: number;
  residentialBuildingFootprintKm2: number;
  residentialDistrictKm2: number;
  // City
  urbanServiceFloorKm2: number;
  urbanAreaKm2: number;
  /** Which term sets the urban area: housing site needs, or the per-person allowance. */
  urbanBinding: "housing" | "services";
  /** Urban land beyond residential districts (transport, services, parks…). */
  urbanNonResidentialKm2: number;
  // Land
  baselineCroplandKm2: number;
  baselinePastureKm2: number;
  baselineForestKm2: number;
  croplandKm2: number;
  pastureKm2: number;
  agricultureKm2: number;
  forestTargetKm2: number;
  urbanForestKm2: number;
  overlapKm2: number;
  /** Forest target net of the part already inside urban land. */
  forestOutsideUrbanKm2: number;
  totalAllocatedKm2: number;
  earthLandKm2: number;
  remainingKm2: number;
  utilizationPct: number;
  exceedsLand: boolean;
}

const M2_PER_KM2 = 1_000_000;

export function assertValid(inputs: ScenarioInputs) {
  if (!(inputs.peoplePerHome > 0)) throw new RangeError("peoplePerHome must be > 0");
  if (!(inputs.floors > 0)) throw new RangeError("floors must be > 0");
  if (!(inputs.unitsPerFloor > 0)) throw new RangeError("unitsPerFloor must be > 0");
  if (!(inputs.cropYieldFactor > 0)) throw new RangeError("cropYieldFactor must be > 0");
  if (!(inputs.pastureProductivityFactor > 0)) throw new RangeError("pastureProductivityFactor must be > 0");
  for (const c of CONTROLS) {
    if (!Number.isFinite(inputs[c.key])) throw new RangeError(`${c.key} must be a finite number`);
  }
}

export function computeScenario(inputs: ScenarioInputs): ScenarioResult {
  assertValid(inputs);
  const bundle = BUNDLES[inputs.bundle];

  // §03 Housing
  const homeCount = Math.ceil(inputs.population / inputs.peoplePerHome);
  const unitCapacityPerTower = inputs.floors * inputs.unitsPerFloor;
  // Ceiling applies to the aggregate only; fractional per-floor averages are fine.
  const towerCount = Math.ceil(homeCount / unitCapacityPerTower);
  const grossApartmentAreaM2 = homeCount * inputs.homeAreaM2 * inputs.commonSpaceMultiplier;
  const residentialBuildingFootprintKm2 = grossApartmentAreaM2 / inputs.floors / M2_PER_KM2;
  const residentialDistrictKm2 = residentialBuildingFootprintKm2 * inputs.siteMultiplier;

  // Urban area is a feasibility floor: the larger of the two, never their sum.
  const urbanServiceFloorKm2 = (inputs.population * inputs.urbanM2PerPerson) / M2_PER_KM2;
  const urbanAreaKm2 = Math.max(residentialDistrictKm2, urbanServiceFloorKm2);
  const urbanBinding = residentialDistrictKm2 >= urbanServiceFloorKm2 ? "housing" : "services";
  const urbanNonResidentialKm2 = urbanAreaKm2 - residentialDistrictKm2;

  // §04 Land budget
  const baselineCroplandKm2 = bundle.croplandKm2.value;
  const baselinePastureKm2 = bundle.pastureKm2.value;
  const baselineForestKm2 = bundle.forestKm2.value;
  const croplandKm2 = (baselineCroplandKm2 * inputs.croplandDemandFactor) / inputs.cropYieldFactor;
  const pastureKm2 = (baselinePastureKm2 * inputs.pastureDemandFactor) / inputs.pastureProductivityFactor;
  const agricultureKm2 = croplandKm2 + pastureKm2;
  const forestTargetKm2 = baselineForestKm2 * inputs.forestTargetFactor;
  const urbanForestKm2 = urbanAreaKm2 * inputs.urbanForestShare;
  const overlapKm2 = Math.min(urbanForestKm2, forestTargetKm2);
  const forestOutsideUrbanKm2 = forestTargetKm2 - overlapKm2;
  const totalAllocatedKm2 = urbanAreaKm2 + agricultureKm2 + forestTargetKm2 - overlapKm2;
  const earthLandKm2 = EARTH_LAND.value;
  const remainingKm2 = earthLandKm2 - totalAllocatedKm2;
  const utilizationPct = (100 * totalAllocatedKm2) / earthLandKm2;

  return {
    inputs,
    homeCount,
    unitCapacityPerTower,
    towerCount,
    grossApartmentAreaM2,
    residentialBuildingFootprintKm2,
    residentialDistrictKm2,
    urbanServiceFloorKm2,
    urbanAreaKm2,
    urbanBinding,
    urbanNonResidentialKm2,
    baselineCroplandKm2,
    baselinePastureKm2,
    baselineForestKm2,
    croplandKm2,
    pastureKm2,
    agricultureKm2,
    forestTargetKm2,
    urbanForestKm2,
    overlapKm2,
    forestOutsideUrbanKm2,
    totalAllocatedKm2,
    earthLandKm2,
    remainingKm2,
    utilizationPct,
    exceedsLand: remainingKm2 < 0,
  };
}

/* ---------- Land segments for the stacked chart ---------- */

export type SegmentId = "residential" | "urbanOther" | "cropland" | "pasture" | "forest";

export interface Segment {
  id: SegmentId;
  label: string;
  km2: number;
}

/** Segments sum exactly to totalAllocatedKm2 (forest is shown net of urban overlap). */
export function landSegments(r: ScenarioResult): Segment[] {
  return [
    { id: "residential", label: "Residential districts", km2: r.residentialDistrictKm2 },
    { id: "urbanOther", label: "Rest of the city", km2: r.urbanNonResidentialKm2 },
    { id: "cropland", label: "Cropland", km2: r.croplandKm2 },
    { id: "pasture", label: "Pasture", km2: r.pastureKm2 },
    { id: "forest", label: "Forest (outside cities)", km2: r.forestOutsideUrbanKm2 },
  ];
}

/* ---------- Geometry for honest area comparisons ---------- */

/** Flat-plane equivalents from the spec: circle radius √(A/π), square edge √A. */
export function circleRadiusKm(areaKm2: number) {
  return Math.sqrt(Math.max(0, areaKm2) / Math.PI);
}
export function squareEdgeKm(areaKm2: number) {
  return Math.sqrt(Math.max(0, areaKm2));
}

/**
 * Angular radius (degrees) of a spherical cap with the given area.
 * Cap area = 2πR²(1 − cos θ). Used to draw an area-true circle on the globe.
 * Returns null if the area exceeds the whole sphere.
 */
export function capAngularRadiusDeg(areaKm2: number, radiusKm = EARTH_RADIUS_KM): number | null {
  const sphere = 4 * Math.PI * radiusKm * radiusKm;
  if (areaKm2 <= 0) return 0;
  if (areaKm2 > sphere) return null;
  const cos = 1 - areaKm2 / (2 * Math.PI * radiusKm * radiusKm);
  return (Math.acos(cos) * 180) / Math.PI;
}

/* ---------- Sensitivity: which lever moves the total most? ---------- */

export interface Sensitivity {
  key: NumericKey;
  lowValue: number;
  highValue: number;
  lowTotal: number;
  highTotal: number;
  /** Largest absolute change across the safe range, km². */
  swingKm2: number;
}

/**
 * One-at-a-time sweep of each control across its full safe range while holding
 * everything else at the current scenario. Population is excluded because it is
 * the subject of the question, not a design lever.
 */
export function sensitivity(inputs: ScenarioInputs, metric: (r: ScenarioResult) => number = (r) => r.totalAllocatedKm2): Sensitivity[] {
  return CONTROLS.filter((c) => c.key !== "population")
    .map((c) => {
      const lowTotal = metric(computeScenario({ ...inputs, [c.key]: c.min }));
      const highTotal = metric(computeScenario({ ...inputs, [c.key]: c.max }));
      return {
        key: c.key,
        lowValue: c.min,
        highValue: c.max,
        lowTotal,
        highTotal,
        swingKm2: Math.abs(highTotal - lowTotal),
      };
    })
    .sort((a, b) => b.swingKm2 - a.swingKm2);
}

/* ---------- A/B comparison with attribution ---------- */

export interface Attribution {
  key: NumericKey | "bundle";
  from: number | string;
  to: number | string;
  /** Change in the metric when only this input moves from A to B. */
  deltaKm2: number;
}

export interface Comparison {
  a: ScenarioResult;
  b: ScenarioResult;
  deltaTotalKm2: number;
  deltaPct: number;
  attributions: Attribution[];
  /** Part of the change not explained by single-input moves (interaction effects, e.g. the max() floor). */
  interactionKm2: number;
}

export function compareScenarios(aIn: ScenarioInputs, bIn: ScenarioInputs, metric: (r: ScenarioResult) => number = (r) => r.totalAllocatedKm2): Comparison {
  const a = computeScenario(aIn);
  const b = computeScenario(bIn);
  const base = metric(a);
  const attributions: Attribution[] = [];
  for (const c of CONTROLS) {
    if (aIn[c.key] === bIn[c.key]) continue;
    const moved = metric(computeScenario({ ...aIn, [c.key]: bIn[c.key] }));
    attributions.push({ key: c.key, from: aIn[c.key], to: bIn[c.key], deltaKm2: moved - base });
  }
  if (aIn.bundle !== bIn.bundle) {
    const moved = metric(computeScenario({ ...aIn, bundle: bIn.bundle }));
    attributions.push({ key: "bundle", from: aIn.bundle, to: bIn.bundle, deltaKm2: moved - base });
  }
  attributions.sort((x, y) => Math.abs(y.deltaKm2) - Math.abs(x.deltaKm2));
  const deltaTotalKm2 = metric(b) - base;
  const explained = attributions.reduce((s, x) => s + x.deltaKm2, 0);
  return {
    a,
    b,
    deltaTotalKm2,
    deltaPct: base === 0 ? 0 : (100 * deltaTotalKm2) / base,
    attributions,
    interactionKm2: deltaTotalKm2 - explained,
  };
}

/* ---------- Plain-language explanation of non-obvious results ---------- */

export function explainUrbanBinding(r: ScenarioResult): string {
  if (r.urbanBinding === "services") {
    return `The city-wide allowance (${r.inputs.urbanM2PerPerson} m² per person) is larger than what housing alone needs, so it sets urban area. Changing household size or floors changes towers and housing footprint, but not the city total.`;
  }
  return "Residential districts need more land than the per-person city allowance, so housing sets urban area. Here, denser housing does shrink the city.";
}

export const METRICS: { key: keyof ScenarioResult; label: string; unit: string }[] = [
  { key: "homeCount", label: "Homes", unit: "homes" },
  { key: "unitCapacityPerTower", label: "Homes per tower", unit: "homes" },
  { key: "towerCount", label: "Towers", unit: "towers" },
  { key: "grossApartmentAreaM2", label: "Gross apartment floor area", unit: "m²" },
  { key: "residentialBuildingFootprintKm2", label: "Building footprint", unit: "km²" },
  { key: "residentialDistrictKm2", label: "Residential districts", unit: "km²" },
  { key: "urbanServiceFloorKm2", label: "Urban allowance floor", unit: "km²" },
  { key: "urbanAreaKm2", label: "Urban region", unit: "km²" },
  { key: "croplandKm2", label: "Cropland", unit: "km²" },
  { key: "pastureKm2", label: "Pasture", unit: "km²" },
  { key: "agricultureKm2", label: "Agriculture total", unit: "km²" },
  { key: "forestTargetKm2", label: "Forest target", unit: "km²" },
  { key: "overlapKm2", label: "Urban–forest overlap", unit: "km²" },
  { key: "totalAllocatedKm2", label: "Total allocated land", unit: "km²" },
  { key: "remainingKm2", label: "Remaining land", unit: "km²" },
  { key: "utilizationPct", label: "Share of Earth's land", unit: "%" },
];

export function toCsv(r: ScenarioResult): string {
  const rows: string[][] = [["section", "key", "value", "unit"]];
  for (const c of CONTROLS) rows.push(["input", c.key, String(r.inputs[c.key]), c.unit]);
  rows.push(["input", "bundle", r.inputs.bundle, ""]);
  for (const m of METRICS) rows.push(["output", m.key, String(r[m.key]), m.unit]);
  rows.push(["output", "urbanBinding", r.urbanBinding, ""]);
  rows.push(["output", "exceedsLand", String(r.exceedsLand), ""]);
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function csvCell(s: string) {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export type { NumericKey };
