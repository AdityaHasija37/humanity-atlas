/**
 * Reference areas for "how big is that?" comparisons.
 * Country areas are total area (land + inland water) as listed by the
 * CIA World Factbook. City figures use the named administrative boundary.
 * These are reference values for scale only.
 */
export interface Comparator {
  id: string;
  name: string;
  areaKm2: number;
  boundary: string;
  source: string;
  url: string;
}

const FACTBOOK = "https://www.cia.gov/the-world-factbook/field/area/";

export const COMPARATORS: Comparator[] = [
  { id: "nyc", name: "New York City", areaKm2: 778, boundary: "Five boroughs, land area", source: "US Census Bureau QuickFacts (300.5 sq mi)", url: "https://www.census.gov/quickfacts/newyorkcitynewyork" },
  { id: "london", name: "Greater London", areaKm2: 1_572, boundary: "Greater London administrative area", source: "UK Office for National Statistics", url: "https://www.ons.gov.uk/" },
  { id: "tokyo", name: "Tokyo Metropolis", areaKm2: 2_194, boundary: "Tokyo prefecture incl. islands", source: "Tokyo Metropolitan Government", url: "https://www.metro.tokyo.lg.jp/english/" },
  { id: "puerto-rico", name: "Puerto Rico", areaKm2: 9_104, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
  { id: "belgium", name: "Belgium", areaKm2: 30_528, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
  { id: "netherlands", name: "Netherlands", areaKm2: 41_543, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
  { id: "uk", name: "United Kingdom", areaKm2: 243_610, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
  { id: "germany", name: "Germany", areaKm2: 357_022, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
  { id: "egypt", name: "Egypt", areaKm2: 1_001_450, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
  { id: "south-africa", name: "South Africa", areaKm2: 1_219_090, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
  { id: "india", name: "India", areaKm2: 3_287_263, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
  { id: "australia", name: "Australia", areaKm2: 7_741_220, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
  { id: "brazil", name: "Brazil", areaKm2: 8_515_770, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
  { id: "usa", name: "United States", areaKm2: 9_833_517, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
  { id: "russia", name: "Russia", areaKm2: 17_098_242, boundary: "Total area", source: "CIA World Factbook", url: FACTBOOK },
];

/** The comparator whose area is closest to `areaKm2` on a log scale. */
export function nearestComparator(areaKm2: number): Comparator {
  if (!(areaKm2 > 0)) return COMPARATORS[0];
  let best = COMPARATORS[0];
  let bestDist = Infinity;
  for (const c of COMPARATORS) {
    const d = Math.abs(Math.log(areaKm2 / c.areaKm2));
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

export function comparatorById(id: string): Comparator | undefined {
  return COMPARATORS.find((c) => c.id === id);
}
