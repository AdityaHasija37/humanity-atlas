import { describe, expect, it } from "vitest";
import { BUNDLES, EARTH_RADIUS_KM, SOURCES, ASSUMPTIONS } from "@/data/baselines";
import { PRESETS, presetInputs, matchPreset } from "@/data/presets";
import {
  capAngularRadiusDeg,
  circleRadiusKm,
  compareScenarios,
  computeScenario,
  landSegments,
  sensitivity,
  squareEdgeKm,
  toCsv,
} from "@/lib/model";
import { CONTROLS, DEFAULT_INPUTS, clampValue, decodeInputs, encodeInputs, validateInputs, type ScenarioInputs } from "@/lib/schema";
import { nearestComparator } from "@/data/comparators";

const base = (o: Partial<ScenarioInputs> = {}): ScenarioInputs => ({ ...DEFAULT_INPUTS, ...o });

describe("housing geometry (spec §10)", () => {
  it("default family towers: ~2.371b homes and ~33.878m towers", () => {
    const r = computeScenario(base());
    expect(r.homeCount).toBe(2_371_428_572);
    expect(r.unitCapacityPerTower).toBe(70);
    // ceil(2,371,428,572 / 70) = ceil(33,877,551.03) = 33,877,552.
    // The spec's audit table prints 33,877,551 (rounded, not ceiled); we keep the ceiling rule.
    expect(r.towerCount).toBe(33_877_552);
    expect(r.towerCount / 1e6).toBeCloseTo(33.878, 3);
  });

  it("high density: 4 people/home and 4 apartments/floor → 2.075b homes, 25.9375m towers", () => {
    const r = computeScenario(base({ peoplePerHome: 4, unitsPerFloor: 4 }));
    expect(r.homeCount).toBe(2_075_000_000);
    expect(r.towerCount).toBe(25_937_500);
  });

  it("single living: 1 person/home and 3 apartments/floor → 8.3b homes, ~138.333m towers", () => {
    const r = computeScenario(base({ peoplePerHome: 1, unitsPerFloor: 3 }));
    expect(r.homeCount).toBe(8_300_000_000);
    expect(r.towerCount).toBe(Math.ceil(8.3e9 / 60));
    expect(r.towerCount / 1e6).toBeCloseTo(138.333, 3);
  });

  it("default footprints match the audit table", () => {
    const r = computeScenario(base());
    expect(r.residentialBuildingFootprintKm2).toBeCloseTo(8_892.857, 2);
    expect(r.residentialDistrictKm2).toBeCloseTo(35_571.43, 1);
  });

  it("doubling floors halves the unrounded building footprint", () => {
    const a = computeScenario(base({ floors: 20 }));
    const b = computeScenario(base({ floors: 40 }));
    expect(b.residentialBuildingFootprintKm2).toBeCloseTo(a.residentialBuildingFootprintKm2 / 2, 9);
  });

  it("apartments per floor changes tower count but not floor area or footprint", () => {
    const a = computeScenario(base({ unitsPerFloor: 3 }));
    const b = computeScenario(base({ unitsPerFloor: 6 }));
    expect(b.towerCount).toBeLessThan(a.towerCount);
    expect(b.grossApartmentAreaM2).toBe(a.grossApartmentAreaM2);
    expect(b.residentialBuildingFootprintKm2).toBe(a.residentialBuildingFootprintKm2);
  });
});

describe("urban region is a max(), not a sum", () => {
  it("default urban region is 1,245,000 km², set by the services allowance", () => {
    const r = computeScenario(base());
    expect(r.urbanAreaKm2).toBeCloseTo(1_245_000, 6);
    expect(r.urbanBinding).toBe("services");
  });

  it("with the 150 m² floor, changing occupancy changes housing but not urban area", () => {
    const a = computeScenario(base({ peoplePerHome: 3.5 }));
    const b = computeScenario(base({ peoplePerHome: 1 }));
    expect(b.residentialDistrictKm2).toBeGreaterThan(a.residentialDistrictKm2);
    expect(b.urbanAreaKm2).toBe(a.urbanAreaKm2);
  });

  it("housing becomes binding when districts outgrow the allowance", () => {
    const r = computeScenario(base({ peoplePerHome: 1, floors: 1, homeAreaM2: 150, siteMultiplier: 8, urbanM2PerPerson: 30 }));
    expect(r.urbanBinding).toBe("housing");
    expect(r.urbanAreaKm2).toBe(r.residentialDistrictKm2);
    expect(r.urbanNonResidentialKm2).toBe(0);
  });
});

describe("land budget (spec §04–§05)", () => {
  it("default totals: 88,520,500 km² and ~59.4% of Earth's land", () => {
    const r = computeScenario(base());
    expect(r.agricultureKm2).toBe(46_000_000);
    expect(r.forestTargetKm2).toBe(41_400_000);
    expect(r.overlapKm2).toBeCloseTo(124_500, 6);
    expect(r.totalAllocatedKm2).toBeCloseTo(88_520_500, 4);
    expect(r.utilizationPct).toBeCloseTo(59.43, 2);
  });

  it("pasture demand 0.5 → 15m km² of pasture", () => {
    const r = computeScenario(base({ pastureDemandFactor: 0.5 }));
    expect(r.pastureKm2).toBe(15_000_000);
  });

  it("forest factor 1.2 raises the target by 8.28m km² and keeps overlap correct", () => {
    const a = computeScenario(base());
    const b = computeScenario(base({ forestTargetFactor: 1.2 }));
    expect(b.forestTargetKm2 - a.forestTargetKm2).toBeCloseTo(8_280_000, 4);
    expect(b.overlapKm2).toBe(Math.min(b.urbanForestKm2, b.forestTargetKm2));
    expect(b.totalAllocatedKm2 - a.totalAllocatedKm2).toBeCloseTo(8_280_000, 4);
  });

  it("yield and productivity factors divide demand", () => {
    const r = computeScenario(base({ croplandDemandFactor: 1.5, cropYieldFactor: 2, pastureProductivityFactor: 2 }));
    expect(r.croplandKm2).toBe(12_000_000);
    expect(r.pastureKm2).toBe(15_000_000);
  });

  it("overlap never exceeds the forest target", () => {
    const r = computeScenario(base({ population: 12e9, urbanM2PerPerson: 500, urbanForestShare: 0.3, forestTargetFactor: 0.5 }));
    expect(r.overlapKm2).toBeLessThanOrEqual(r.forestTargetKm2);
    expect(r.forestOutsideUrbanKm2).toBeGreaterThanOrEqual(0);
  });

  it("chart segments sum exactly to total allocated land", () => {
    for (const p of PRESETS) {
      const r = computeScenario(presetInputs(p));
      const sum = landSegments(r).reduce((s, x) => s + x.km2, 0);
      expect(sum).toBeCloseTo(r.totalAllocatedKm2, 4);
    }
  });

  it("oversubscription is flagged, not clipped", () => {
    const r = computeScenario(base({ croplandDemandFactor: 1.5, cropYieldFactor: 0.7, pastureDemandFactor: 1.5, pastureProductivityFactor: 0.7, forestTargetFactor: 1.5 }));
    expect(r.exceedsLand).toBe(true);
    expect(r.remainingKm2).toBeLessThan(0);
    expect(r.utilizationPct).toBeGreaterThan(100);
    expect(Number.isFinite(r.totalAllocatedKm2)).toBe(true);
  });

  it("the single-year 2023 bundle uses its own figures", () => {
    const r = computeScenario(base({ bundle: "fao2023" }));
    expect(r.agricultureKm2).toBe(48_000_000);
    expect(r.forestTargetKm2).toBe(40_500_000);
  });

  it("rounding never touches internal values", () => {
    const r = computeScenario(base());
    expect(Number.isInteger(r.residentialBuildingFootprintKm2)).toBe(false);
  });
});

describe("validation and URL state", () => {
  it("rejects zero people per home, zero floors and NaN", () => {
    expect(() => computeScenario(base({ peoplePerHome: 0 }))).toThrow();
    expect(() => computeScenario(base({ floors: 0 }))).toThrow();
    expect(() => computeScenario(base({ homeAreaM2: NaN }))).toThrow();
    expect(validateInputs(base({ floors: 0 })).success).toBe(false);
    expect(validateInputs(base({ peoplePerHome: NaN })).success).toBe(false);
    expect(validateInputs(base()).success).toBe(true);
  });

  it("clamps to safe ranges and snaps integers", () => {
    expect(clampValue("floors", 0)).toBe(1);
    expect(clampValue("floors", 20.6)).toBe(21);
    expect(clampValue("peoplePerHome", NaN)).toBe(DEFAULT_INPUTS.peoplePerHome);
  });

  it("round-trips every preset through the URL", () => {
    for (const p of PRESETS) {
      const inputs = presetInputs(p, "fao2023");
      const back = decodeInputs(encodeInputs(inputs, p.id));
      expect(back).toEqual(inputs);
      expect(matchPreset(back)?.id).toBe(p.id);
    }
  });

  it("ignores garbage params without dropping valid ones", () => {
    const r = decodeInputs(new URLSearchParams("v=1&fl=abc&pph=4&b=nope&upf=999"));
    expect(r.floors).toBe(DEFAULT_INPUTS.floors);
    expect(r.peoplePerHome).toBe(4);
    expect(r.bundle).toBe("latest");
    expect(r.unitsPerFloor).toBe(12);
  });

  it("every preset validates", () => {
    for (const p of PRESETS) expect(validateInputs(presetInputs(p)).success).toBe(true);
  });
});

describe("comparison, sensitivity and geometry", () => {
  it("attributes a single-parameter change fully, with no interaction", () => {
    const c = compareScenarios(base(), base({ pastureDemandFactor: 0.5 }));
    expect(c.deltaTotalKm2).toBeCloseTo(-15_000_000, 4);
    expect(c.attributions).toHaveLength(1);
    expect(c.attributions[0].key).toBe("pastureDemandFactor");
    expect(c.interactionKm2).toBeCloseTo(0, 4);
  });

  it("explains why private studios don't change total land (services floor binds)", () => {
    const c = compareScenarios(base(), presetInputs(PRESETS[1]));
    expect(c.b.towerCount).toBeGreaterThan(c.a.towerCount);
    expect(c.deltaTotalKm2).toBe(0);
  });

  it("food and forest levers dominate housing levers in the default scenario", () => {
    const s = sensitivity(base());
    const top3 = s.slice(0, 3).map((x) => x.key);
    expect(top3).not.toContain("floors");
    expect(top3).not.toContain("peoplePerHome");
    const floors = s.find((x) => x.key === "floors")!;
    expect(floors.swingKm2).toBe(0);
  });

  it("area-equivalent geometry: flat formulas and spherical cap", () => {
    expect(circleRadiusKm(Math.PI * 100)).toBeCloseTo(10, 9);
    expect(squareEdgeKm(10_000)).toBe(100);
    const hemisphere = 2 * Math.PI * EARTH_RADIUS_KM ** 2;
    expect(capAngularRadiusDeg(hemisphere)).toBeCloseTo(90, 9);
    expect(capAngularRadiusDeg(1e12)).toBeNull();
  });

  it("nearest comparator for the default building footprint is Puerto Rico", () => {
    const r = computeScenario(base());
    expect(nearestComparator(r.residentialBuildingFootprintKm2).id).toBe("puerto-rico");
  });

  it("CSV includes every input and output", () => {
    const csv = toCsv(computeScenario(base()));
    for (const c of CONTROLS) expect(csv).toContain(`input,${c.key},`);
    expect(csv).toContain("output,totalAllocatedKm2,");
  });
});

describe("provenance", () => {
  it("every dataset field has unit, kind and a note; observations carry year and URL", () => {
    const all = [...Object.values(BUNDLES).flatMap((b) => [b.agricultureKm2, b.croplandKm2, b.pastureKm2, b.forestKm2]), ...ASSUMPTIONS];
    for (const d of all) {
      expect(d.unit).toBeTruthy();
      expect(d.kind).toMatch(/observation|assumption|derived/);
      expect(d.note.length).toBeGreaterThan(10);
      if (d.kind === "observation") {
        expect(d.year).toBeTypeOf("number");
        expect(d.source?.url).toMatch(/^https:\/\//);
      }
    }
    for (const s of Object.values(SOURCES)) expect(s.url).toMatch(/^https:\/\//);
  });

  it("the latest bundle is flagged as mixed vintage", () => {
    expect(BUNDLES.latest.mixedVintage).toBe(true);
    expect(BUNDLES.fao2023.mixedVintage).toBe(false);
  });
});

describe("export", () => {
  it("PNG card SVG is well-formed and reflects the scenario", async () => {
    const { scenarioCardSvg } = await import("@/lib/export");
    const svg = scenarioCardSvg(computeScenario(base({ forestTargetFactor: 1.5, pastureDemandFactor: 1.5, pastureProductivityFactor: 0.7, cropYieldFactor: 0.7, croplandDemandFactor: 1.5 })));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(/&(?!amp;|lt;|gt;|apos;|quot;)/.test(svg)).toBe(false);
    expect(svg).toContain("Earth&apos;s land");
  });
});
