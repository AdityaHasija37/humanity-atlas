"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoCircle, geoEqualEarth, geoGraticule10, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import { COMPARATORS, comparatorById, nearestComparator } from "@/data/comparators";
import { EARTH_RADIUS_KM } from "@/data/baselines";
import { capAngularRadiusDeg, circleRadiusKm, squareEdgeKm, type ScenarioResult } from "@/lib/model";
import { fmtInt, fmtKm2, fmtRatio, sig } from "@/lib/format";
import { Card, Eyebrow, cx } from "./ui";

type MetricId = "footprint" | "district" | "urban" | "agriculture" | "total";

const METRICS: { id: MetricId; label: string; color: string; get: (r: ScenarioResult) => number }[] = [
  { id: "footprint", label: "Building footprint", color: "var(--c-residential)", get: (r) => r.residentialBuildingFootprintKm2 },
  { id: "district", label: "Residential districts", color: "var(--c-residential)", get: (r) => r.residentialDistrictKm2 },
  { id: "urban", label: "Urban region", color: "#7a5fc0", get: (r) => r.urbanAreaKm2 },
  { id: "agriculture", label: "Food land (crops + pasture)", color: "var(--c-pasture)", get: (r) => r.agricultureKm2 },
  { id: "total", label: "Total allocated land", color: "var(--ink)", get: (r) => r.totalAllocatedKm2 },
];

/** ISO 3166-1 numeric codes used by world-atlas, for highlighting comparators. */
const ISO_NUMERIC: Record<string, string> = {
  "puerto-rico": "630",
  belgium: "056",
  netherlands: "528",
  uk: "826",
  germany: "276",
  egypt: "818",
  "south-africa": "710",
  india: "356",
  australia: "036",
  brazil: "076",
  usa: "840",
  russia: "643",
};

const CENTERS: { id: string; label: string; lonlat: [number, number] }[] = [
  { id: "sahara", label: "Sahara", lonlat: [12, 22] },
  { id: "central-asia", label: "Central Asia", lonlat: [70, 45] },
  { id: "amazon", label: "Amazon basin", lonlat: [-60, -5] },
  { id: "north-america", label: "North America", lonlat: [-100, 42] },
  { id: "australia", label: "Australia", lonlat: [134, -25] },
  { id: "pacific", label: "Pacific Ocean", lonlat: [-150, 0] },
];

type CountriesTopo = Topology<{ countries: GeometryCollection; land: GeometryCollection }>;

export function PerspectiveMap({ r }: { r: ScenarioResult }) {
  const [metric, setMetric] = useState<MetricId>("total");
  const [view, setView] = useState<"globe" | "squares">("globe");
  const [compId, setCompId] = useState<string>("auto");
  const [center, setCenter] = useState<[number, number]>(CENTERS[0].lonlat);
  const [countries, setCountries] = useState<FeatureCollection<Geometry, { name?: string }> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Lazy-load the map geometry when the card scrolls near the viewport.
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || countries) return;
    import("world-atlas/countries-110m.json")
      .then((m) => {
        const topo = (m.default ?? m) as unknown as CountriesTopo;
        setCountries(feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name?: string }>);
      })
      .catch(() => setLoadError(true));
  }, [visible, countries]);

  const m = METRICS.find((x) => x.id === metric)!;
  const area = m.get(r);
  const comp = compId === "auto" ? nearestComparator(area) : comparatorById(compId)!;
  const ratio = area / comp.areaKm2;
  const capDeg = capAngularRadiusDeg(area);
  const capSurfaceKm = capDeg === null ? null : (capDeg * Math.PI * EARTH_RADIUS_KM) / 180;

  return (
    <Card aria-labelledby="persp-h">
      <Eyebrow>Perspective explorer</Eyebrow>
      <h3 id="persp-h" className="mt-1 font-serif text-2xl text-ink">
        {m.label}: {fmtKm2(area)}, about {fmtRatio(ratio)} {comp.name}
      </h3>
      <p className="mt-1 text-sm text-ink-2">An area-equivalent shape, not a place. Scenario land is not one contiguous city and is not drawn on any real location.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-3">Area to show</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value as MetricId)} className="rounded-lg border border-rule bg-ivory px-2 py-1.5">
            {METRICS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-3">Compare with</span>
          <select value={compId} onChange={(e) => setCompId(e.target.value)} className="rounded-lg border border-rule bg-ivory px-2 py-1.5">
            <option value="auto">Closest in size ({nearestComparator(area).name})</option>
            {COMPARATORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div role="tablist" aria-label="View" className="inline-flex rounded-lg border border-rule bg-ivory p-0.5">
          {(["globe", "squares"] as const).map((v) => (
            <button key={v} role="tab" type="button" aria-selected={view === v} onClick={() => setView(v)} className={cx("rounded-md px-3 py-1 text-xs font-medium", view === v ? "bg-ink text-paper" : "text-ink-2")}>
              {v === "globe" ? "Area-true globe" : "Side-by-side squares"}
            </button>
          ))}
        </div>
        {view === "globe" && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-3">Centre the circle on</span>
            <select
              onChange={(e) => {
                const c = CENTERS.find((x) => x.id === e.target.value);
                if (c) setCenter(c.lonlat);
              }}
              className="rounded-lg border border-rule bg-ivory px-2 py-1.5"
            >
              {CENTERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div ref={holder} className="mt-5">
        {view === "globe" ? (
          <Globe countries={countries} loadError={loadError} capDeg={capDeg} center={center} onCenter={setCenter} color={m.color} highlightIso={ISO_NUMERIC[comp.id]} />
        ) : (
          <Squares a={{ label: m.label, km2: area, color: m.color }} b={{ label: comp.name, km2: comp.areaKm2 }} />
        )}
      </div>

      <dl className="mt-4 grid gap-3 text-xs text-ink-2 sm:grid-cols-3">
        <div>
          <dt className="text-ink-3">Flat-equivalent circle radius</dt>
          <dd className="tnum text-sm text-ink">{fmtInt(circleRadiusKm(area))} km · √(A/π)</dd>
        </div>
        <div>
          <dt className="text-ink-3">Flat-equivalent square edge</dt>
          <dd className="tnum text-sm text-ink">{fmtInt(squareEdgeKm(area))} km · √A</dd>
        </div>
        <div>
          <dt className="text-ink-3">On the sphere (spherical cap)</dt>
          <dd className="tnum text-sm text-ink">{capDeg === null ? "larger than Earth's surface" : `${sig(capDeg, 3)}° · ${fmtInt(capSurfaceKm!)} km along the surface`}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
        Drawn on an Equal Earth projection, which preserves area but bends shapes near the edges; a Mercator map would inflate high-latitude areas. The circle is a true spherical cap, so its area is correct wherever you place it. {comp.name}: {fmtInt(comp.areaKm2)} km², {comp.boundary.toLowerCase()} (
        <a href={comp.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {comp.source}
        </a>
        ). Country outlines: Natural Earth 1:110m via world-atlas.
      </p>
    </Card>
  );
}

function Globe({
  countries,
  loadError,
  capDeg,
  center,
  onCenter,
  color,
  highlightIso,
}: {
  countries: FeatureCollection<Geometry, { name?: string }> | null;
  loadError: boolean;
  capDeg: number | null;
  center: [number, number];
  onCenter: (c: [number, number]) => void;
  color: string;
  highlightIso?: string;
}) {
  const W = 960;
  const H = 480;
  const projection = useMemo(() => geoEqualEarth().fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" }), []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const sphere = path({ type: "Sphere" }) ?? "";
  const grat = path(geoGraticule10()) ?? "";
  const circle = capDeg === null ? sphere : path(geoCircle().center(center).radius(Math.max(capDeg, 0.15)).precision(2)()) ?? "";
  const highlight = countries?.features.find((f) => String((f as Feature).id) === highlightIso);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair rounded-xl"
        role="img"
        aria-label="Equal-area world map with an area-equivalent circle. Click the map to move the circle."
        onClick={(e) => {
          const svg = e.currentTarget;
          const pt = svg.getBoundingClientRect();
          const x = ((e.clientX - pt.left) / pt.width) * W;
          const y = ((e.clientY - pt.top) / pt.height) * H;
          const ll = projection.invert?.([x, y]);
          if (ll && Number.isFinite(ll[0]) && Number.isFinite(ll[1])) onCenter([ll[0], ll[1]]);
        }}
      >
        <path d={sphere} fill="#eef3f6" stroke="var(--rule-strong)" />
        <path d={grat} fill="none" stroke="#d7dfe4" strokeWidth={0.5} />
        {countries?.features.map((f, i) => (
          <path key={i} d={path(f) ?? ""} fill={f === highlight ? "#c9c0dc" : "#e6dfcf"} stroke="#fffdf8" strokeWidth={0.5} />
        ))}
        {!countries && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={16} fill="var(--ink-3)">
            {loadError ? "Map geometry failed to load. The numbers below still apply." : "Loading map…"}
          </text>
        )}
        <path d={circle} fill={color} fillOpacity={0.28} stroke={color} strokeWidth={2} />
      </svg>
      <figcaption className="mt-2 text-xs text-ink-3">
        {highlight ? "Shaded country: the comparator. " : ""}Click anywhere to move the circle; its area stays the same.
      </figcaption>
    </figure>
  );
}

function Squares({ a, b }: { a: { label: string; km2: number; color: string }; b: { label: string; km2: number } }) {
  const W = 640;
  const H = 300;
  const maxEdge = Math.max(squareEdgeKm(a.km2), squareEdgeKm(b.km2));
  const px = (km2: number) => Math.max(2, (squareEdgeKm(km2) / maxEdge) * (H - 50));
  const ea = px(a.km2);
  const eb = px(b.km2);
  const base = H - 30;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${a.label} ${fmtKm2(a.km2)} versus ${b.label} ${fmtKm2(b.km2)}, as squares of equal area`}>
        <line x1={20} x2={W - 20} y1={base} y2={base} stroke="var(--rule-strong)" />
        <rect x={60} y={base - ea} width={ea} height={ea} fill={a.color} fillOpacity={0.3} stroke={a.color} strokeWidth={2} rx={2} />
        <text x={60} y={base + 18} fontSize={13} fill="var(--ink)">
          {a.label} · {fmtInt(squareEdgeKm(a.km2))} km edge
        </text>
        <rect x={W / 2 + 40} y={base - eb} width={eb} height={eb} fill="#c9c0dc" fillOpacity={0.5} stroke="#6b5a99" strokeWidth={2} rx={2} />
        <text x={W / 2 + 40} y={base + 18} fontSize={13} fill="var(--ink)">
          {b.label} · {fmtInt(squareEdgeKm(b.km2))} km edge
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-ink-3">Square areas are to scale with each other. A tiny square is the honest answer, not a rendering bug.</figcaption>
    </figure>
  );
}
