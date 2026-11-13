# Humanity Atlas: How Much Earth Do We Need?

An interactive data story and scenario lab. It asks what it would take to house, feed and sustain everyone on Earth, and keeps three questions apart that usually get blurred together:

1. **Housing.** How much ground do the apartment buildings themselves cover?
2. **The hidden city.** How much land does a working city need beyond homes?
3. **The hidden planet.** How much land goes to cropland, pasture and the forest we choose to keep?

> Illustrative scenario, not a forecast. This is reproducible arithmetic on stated assumptions. It is not a relocation plan or a feasibility study.

## What's in it

| Area | What it does |
| --- | --- |
| Narrative | Hero with nested to-scale area squares, then five scroll chapters (housing → city → planet → trade-offs → takeaway). Every number in it is computed live from the model. |
| Presets | Six scenarios from the brief. Each card shows which inputs it changes. |
| Controls | 14 sliders plus number inputs, clamped to the spec's safe ranges, and a data-bundle switch (mixed-year latest vs single-year FAO 2023). |
| KPIs | Population, apartments, towers, footprint, urban region, food land, forest target, share of Earth's land. Each has a provenance popover. |
| Land budget | Stacked bar at Earth's land scale next to an observed FAO reference bar, with a full breakdown table. Totals over Earth's land get an "exceeds terrestrial area" warning instead of clipping. |
| Tower explainer | A schematic tower you can focus floor by floor. Fractional averages (3.5 apartments per floor) are drawn as alternating floors of 3 and 4. |
| Sensitivity (added) | A tornado chart that sweeps each lever across its full range, showing which assumptions actually move total land. |
| Compare | Pin A, then change anything. A side-by-side table plus **per-input attribution**: each changed input is moved alone from A to B, and any leftover is shown as an interaction effect. |
| Perspective | An area-true spherical cap on an Equal Earth (equal-area) map. You can place it anywhere, highlight a comparator country, or switch to side-by-side squares. |
| Sources | A drawer that separates observed, assumed and derived values, flags mixed vintages, and lists what is and isn't modeled. |
| Share/export | Versioned URL state (presets push history; sliders replace it), copy link, CSV of every input and output, and a PNG scenario card. |

## Model

All formulas live in `src/lib/model.ts` as pure functions. Values are only rounded for display, in `src/lib/format.ts`.

```
homes            = ceil(population / peoplePerHome)
towers           = ceil(homes / (floors × unitsPerFloor))        // one ceiling, on the aggregate
grossFloorM2     = homes × homeAreaM2 × commonSpaceMultiplier
footprintKm2     = grossFloorM2 / floors / 1e6
districtKm2      = footprintKm2 × siteMultiplier
urbanKm2         = max(districtKm2, population × urbanM2PerPerson / 1e6)   // a floor, not a sum
croplandKm2      = baselineCrop × cropDemand / cropYield
pastureKm2       = baselinePasture × pastureDemand / pastureProductivity
forestKm2        = baselineForest × forestTarget                  // preservation target
overlapKm2       = min(urbanKm2 × urbanForestShare, forestKm2)    // counted once
totalKm2         = urban + cropland + pasture + forest − overlap
```

Default (Family Tower World, latest bundle): 2,371,428,572 homes, 33,877,552 towers, 8,893 km² of footprint, 1,245,000 km² urban, **88,520,500 km² total (59.4% of land)**.

**Audit note.** The spec's audit table lists 33,877,551 towers. Its own ceiling rule gives `ceil(2,371,428,572 / 70) = ceil(33,877,551.03) = 33,877,552`. The app follows the rule, and a unit test documents the difference.

**Why sharing homes doesn't shrink the city.** With the 150 m²/person allowance, the city-wide allowance (1.245m km²) is far larger than the housing districts (35,571 km²), so it sets urban area. Switching to studios multiplies towers by 4 but leaves total land unchanged. The KPI popover and the compare panel explain this instead of forcing a difference.

## Data provenance

`src/data/baselines.ts` holds every constant with its unit, year, source URL and kind (`observation` / `assumption` / `derived`). Unit conversion: **km² = ha ÷ 100**.

| Bundle | Agriculture | Cropland | Pasture | Forest | Notes |
| --- | --- | --- | --- | --- | --- |
| Latest (default) | 46.0m (FAO 2024) | 16.0m (2023 anchor) | 30.0m (derived remainder) | 41.4m (FAO FRA 2025) | Mixed vintage, labeled on screen |
| FAO 2023 | 48.0m | 16.0m | 32.0m | 40.5m | Single year |

I checked these against the live FAO pages on 13 Nov 2026:
- FAO, *Land statistics 2001–2024* (17 Jul 2026): 4.6 billion ha agricultural land in 2024.
- FAO, *Land statistics 2001–2023* (19 Jun 2025): 4.8b ha agricultural, ~1.6b ha cropland, 3.2b ha pasture, 4.05b ha forest.
- FAO, *Global Forest Resources Assessment 2025*: ~4.14b ha forest.

Comparator areas (`src/data/comparators.ts`) are CIA World Factbook total areas for countries and admin-boundary areas for cities. They're reference values for scale only.

Earth's land (148.94m km²) is an approximate denominator. Unallocated land is never presented as habitable, contiguous or buildable.

**Not modeled:** climate, emissions, water, dietary health, biodiversity, costs, crop suitability, site selection or engineering.

## Design decisions

- **Custom SVG/HTML charts instead of Recharts or Visx.** They give exact control over the honesty rules (no clipping past 100%, a dashed Earth-land marker, every chart paired with a table) and keep the bundle small.
- **Palette.** Built area is blue/lavender, cropland amber, pasture rust, forest teal on warm ivory. It was checked with a CVD validator: worst adjacent-pair ΔE is 9.9 under deuteranopia. The two lighter fills fall below 3:1 contrast, so every chart has a legend, direct labels and an accessible table.
- **Map.** Natural Earth 1:110m (`world-atlas`) is lazy-loaded when the card nears the viewport, then drawn with `d3-geo` on Equal Earth. The overlay is a true spherical cap, `θ = acos(1 − A / 2πR²)`, so its area is right anywhere on the globe. Flat-plane √(A/π) and √A are shown alongside.
- **No live fetches.** The app is fully static (`○` prerendered) and works offline.

## Accessibility

- Skip link and keyboard-reachable controls throughout. Bar segments and tower floors are focusable and announce their values.
- Every chart has a table or text alternative, and `aria-live` regions report hover/focus details.
- Popovers open on click or tap (no hover needed), and Escape closes them.
- `prefers-reduced-motion` turns off reveals and count-ups.
- On mobile, controls open in a bottom-sheet drawer that shows the live total.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 32 Vitest unit tests (model, URL state, provenance, export)
npm run test:e2e     # 5 Playwright smoke tests × desktop + mobile
npm run check        # typecheck + lint + unit tests + build
```

## Deploy (Vercel)

The default demo has no server dependency.

```bash
npx vercel@latest deploy --prod
```

Or import the repo in Vercel. The framework preset is Next.js, and no environment variables are needed.

## Structure

```
src/data/baselines.ts      dated source constants, bundles, provenance
src/data/presets.ts        six presets as overrides on the baseline
src/data/comparators.ts    reference areas for scale
src/lib/model.ts           pure calculator, segments, sensitivity, compare attribution, geometry, CSV
src/lib/schema.ts          control specs, Zod validation, clamping, versioned URL encode/decode
src/lib/format.ts          display-only formatting
src/lib/export.ts          PNG scenario card + CSV download
src/components/*           story, controls, KPIs, land budget, tower, sensitivity, map, compare, sources
tests/model.test.ts        unit tests
e2e/smoke.spec.ts          Playwright smoke tests
```

## Case study (short)

**Problem.** "Could everyone fit in one city?" gets answered with one striking number that quietly mixes housing, cities and the land that feeds us.

**Central product decision.** Keep exact residential geometry separate from uncertain system assumptions, and make each layer visible and adjustable on its own.

**Insight the product surfaces.** Buildings take 8,893 km². Food and forest take about 87m km². The four-orders-of-magnitude gap *is* the story, and the sensitivity chart shows pasture demand outweighing every housing lever combined.

**Validation.** The unit tests encode the spec's must-pass cases and the audit table. That surfaced the off-by-one in the spec's tower count.

**Next.** Add an independently sourced diet-to-land model rather than leaving pasture as a bare multiplier.

Suggested résumé line: *Designed and shipped an interactive geospatial scenario dashboard modeling global housing, agriculture and forest land use; built transparent assumptions, A/B what-if attribution and reproducible, unit-tested calculations on FAO datasets.*
