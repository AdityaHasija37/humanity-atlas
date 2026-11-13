/**
 * Dated baseline constants with provenance.
 *
 * Every number that reaches the screen traces back to one of these records.
 * `kind` separates what was measured (observation) from what we chose
 * (assumption) and what we computed from other records (derived).
 *
 * Unit conversion: FAO publishes hectares. 1 km² = 100 ha, so km² = ha / 100.
 * 4.6 billion ha → 46,000,000 km².
 */

export type ProvenanceKind = "observation" | "assumption" | "derived";

export interface Source {
  label: string;
  publisher: string;
  published: string;
  url: string;
}

export interface Datum {
  key: string;
  label: string;
  value: number;
  unit: string;
  kind: ProvenanceKind;
  /** Observation year, when the value describes a specific year. */
  year?: number;
  precision?: "rounded" | "exact" | "approximate";
  source?: Source;
  note: string;
}

export const SOURCES = {
  faoLand2024: {
    label: "Land statistics 2001–2024: global, regional and country trends",
    publisher: "FAO (FAOSTAT Analytical Brief)",
    published: "17 July 2026",
    url: "https://www.fao.org/statistics/highlights-archive/highlights-detail/land-statistics-2001-2024.-global--regional-and-country-trends/en",
  },
  faoLand2023: {
    label: "Land statistics 2001–2023: global, regional and country trends",
    publisher: "FAO (FAOSTAT Analytical Brief)",
    published: "19 June 2025",
    url: "https://www.fao.org/statistics/highlights-archive/highlights-detail/land-statistics-2001-2023.-global--regional-and-country-trends/",
  },
  faoFra2025: {
    label: "Global Forest Resources Assessment 2025 (news release)",
    publisher: "FAO",
    published: "2025",
    url: "https://www.fao.org/newsroom/detail/global-deforestation-slows--but-forests-remain-under-pressure--fao-report-shows/en",
  },
  faoFraExplainer: {
    label: "FRA 2025 interactive explainer",
    publisher: "FAO",
    published: "2025",
    url: "https://www.fao.org/interactive/2025/forest-resources-assessment/en/",
  },
  unWpp: {
    label: "World Population Prospects",
    publisher: "UN DESA Population Division",
    published: "2024 revision",
    url: "https://population.un.org/wpp/",
  },
  owidAgLand: {
    label: "Agricultural land (FAO-derived definitions)",
    publisher: "Our World in Data",
    published: "continuously updated",
    url: "https://ourworldindata.org/grapher/agricultural-land",
  },
} satisfies Record<string, Source>;

export type BundleId = "latest" | "fao2023";

export interface LandBundle {
  id: BundleId;
  label: string;
  shortLabel: string;
  mixedVintage: boolean;
  caveat: string;
  agricultureKm2: Datum;
  croplandKm2: Datum;
  pastureKm2: Datum;
  forestKm2: Datum;
}

/**
 * Latest available figures. Mixed vintage: agriculture is 2024, forest is 2025,
 * and the cropland/pasture split borrows the 2023 cropland anchor.
 */
const LATEST: LandBundle = {
  id: "latest",
  label: "Latest available (mixed years: 2023–2025)",
  shortLabel: "Latest · mixed years",
  mixedVintage: true,
  caveat:
    "Mixes vintages: agricultural land is a 2024 figure, forest is a 2025 figure, and the cropland share reuses the 2023 anchor. Adding them is a demonstration, not a synchronized land-cover record.",
  agricultureKm2: {
    key: "agricultureKm2",
    label: "Global agricultural land",
    value: 46_000_000,
    unit: "km²",
    kind: "observation",
    year: 2024,
    precision: "rounded",
    source: SOURCES.faoLand2024,
    note: "FAO reports 4.6 billion ha in 2024 (4.6e9 ha ÷ 100 = 46m km²).",
  },
  croplandKm2: {
    key: "croplandKm2",
    label: "Cropland (proxy)",
    value: 16_000_000,
    unit: "km²",
    kind: "assumption",
    year: 2023,
    precision: "rounded",
    source: SOURCES.faoLand2023,
    note: "2023 FAO cropland anchor (~1.6 billion ha), paired with the 2024 agricultural total. Not a 2024 observation.",
  },
  pastureKm2: {
    key: "pastureKm2",
    label: "Permanent meadows & pasture (proxy)",
    value: 30_000_000,
    unit: "km²",
    kind: "derived",
    year: 2024,
    precision: "rounded",
    source: SOURCES.faoLand2024,
    note: "Remainder: 46m (2024 total) − 16m (2023 cropland anchor). Not independently observed for 2024.",
  },
  forestKm2: {
    key: "forestKm2",
    label: "Global forest area",
    value: 41_400_000,
    unit: "km²",
    kind: "observation",
    year: 2025,
    precision: "rounded",
    source: SOURCES.faoFra2025,
    note: "FAO FRA 2025: ~4.14 billion ha of forest.",
  },
};

/** A single-year 2023 bundle, for users who prefer temporal consistency. */
const FAO_2023: LandBundle = {
  id: "fao2023",
  label: "FAO 2023 (single year)",
  shortLabel: "FAO 2023",
  mixedVintage: false,
  caveat:
    "All four land figures come from the same FAO 2023 release, so they share one observation year. Older than the latest figures.",
  agricultureKm2: {
    key: "agricultureKm2",
    label: "Global agricultural land",
    value: 48_000_000,
    unit: "km²",
    kind: "observation",
    year: 2023,
    precision: "rounded",
    source: SOURCES.faoLand2023,
    note: "FAO reports 4,800 million ha of agricultural land in 2023.",
  },
  croplandKm2: {
    key: "croplandKm2",
    label: "Cropland",
    value: 16_000_000,
    unit: "km²",
    kind: "observation",
    year: 2023,
    precision: "rounded",
    source: SOURCES.faoLand2023,
    note: "FAO reports about 1,600 million ha of cropland in 2023.",
  },
  pastureKm2: {
    key: "pastureKm2",
    label: "Permanent meadows & pasture",
    value: 32_000_000,
    unit: "km²",
    kind: "observation",
    year: 2023,
    precision: "rounded",
    source: SOURCES.faoLand2023,
    note: "FAO reports 3,200 million ha of permanent meadows and pastures in 2023.",
  },
  forestKm2: {
    key: "forestKm2",
    label: "Global forest area",
    value: 40_500_000,
    unit: "km²",
    kind: "observation",
    year: 2023,
    precision: "rounded",
    source: SOURCES.faoLand2023,
    note: "FAO reports 4,050 million ha of forest land in 2023.",
  },
};

export const BUNDLES: Record<BundleId, LandBundle> = {
  latest: LATEST,
  fao2023: FAO_2023,
};

export const EARTH_LAND: Datum = {
  key: "earthLandKm2",
  label: "Earth's land area (reference)",
  value: 148_940_000,
  unit: "km²",
  kind: "assumption",
  precision: "approximate",
  note: "Approximate terrestrial surface including Antarctica and inland water. Used only as a denominator, not as habitable or buildable land.",
};

export const EARTH_RADIUS_KM = 6371.0088; // IUGG mean radius, for spherical-cap geometry

/** Default scenario coefficients. All are illustrative choices, not measurements. */
export const ASSUMPTIONS: Datum[] = [
  {
    key: "population",
    label: "Population",
    value: 8_300_000_000,
    unit: "people",
    kind: "assumption",
    precision: "rounded",
    source: SOURCES.unWpp,
    note: "Rounded scenario population, close to UN estimates for the mid-2020s. Not a live census.",
  },
  { key: "homeAreaM2", label: "Apartment area", value: 60, unit: "m²", kind: "assumption", note: "Roughly a compact two-room (1BHK) flat." },
  { key: "peoplePerHome", label: "People per home", value: 3.5, unit: "people", kind: "assumption", note: "Scenario average, not a literal half-person household." },
  { key: "unitsPerFloor", label: "Apartments per floor", value: 3.5, unit: "homes", kind: "assumption", note: "Average across 3- and 4-apartment tower floors." },
  { key: "floors", label: "Floors", value: 20, unit: "floors", kind: "assumption", note: "Mid-rise residential tower." },
  { key: "commonSpaceMultiplier", label: "Common-area multiplier", value: 1.25, unit: "×", kind: "assumption", note: "Illustrative allowance for corridors, lifts and stairs." },
  { key: "siteMultiplier", label: "Residential site multiplier", value: 4, unit: "×", kind: "assumption", note: "Illustrative grounds, setbacks and internal lanes around each tower." },
  { key: "urbanM2PerPerson", label: "Urban land per resident", value: 150, unit: "m²", kind: "assumption", note: "Generous city-region allowance for transport, hospitals, schools, work, utilities and parks. It sets a floor for urban area; it is not added on top of housing." },
  { key: "urbanForestShare", label: "Urban forest share", value: 0.1, unit: "share", kind: "assumption", note: "Fraction of urban land that also counts as forest. Subtracted once to avoid double counting." },
  { key: "factors", label: "Demand, yield and forest factors", value: 1, unit: "×", kind: "assumption", note: "Hypothetical multipliers on the FAO baseline. 1.0 means today's reference. They are not diet or yield forecasts." },
];
