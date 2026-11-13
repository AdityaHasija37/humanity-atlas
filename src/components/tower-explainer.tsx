"use client";

import { useState } from "react";
import type { ScenarioResult } from "@/lib/model";
import { fmtCompact, fmtInt, sig } from "@/lib/format";
import { Card, Eyebrow } from "./ui";

/**
 * Schematic tower. Fractional averages (e.g. 3.5 apartments per floor) are
 * drawn as alternating floors of 3 and 4 so the picture matches the mean.
 */
function unitsOnFloor(mean: number, floorIndex: number) {
  const lo = Math.floor(mean);
  const frac = mean - lo;
  if (frac === 0) return lo;
  // Distribute the fractional part evenly across floors.
  const before = Math.floor(floorIndex * frac);
  const after = Math.floor((floorIndex + 1) * frac);
  return lo + (after - before);
}

export function TowerExplainer({ r }: { r: ScenarioResult }) {
  const { floors, unitsPerFloor, peoplePerHome, homeAreaM2, commonSpaceMultiplier, siteMultiplier } = r.inputs;
  const [active, setActive] = useState<number | null>(null);
  const maxUnits = Math.ceil(unitsPerFloor);
  const drawnFloors = Math.min(floors, 60);
  const W = 220;
  const floorH = Math.max(4, Math.min(16, 360 / drawnFloors));
  const H = drawnFloors * floorH + 40;
  const towerW = Math.min(W - 40, 30 + maxUnits * 26);
  const x0 = (W - towerW) / 2;
  const unitW = (towerW - 8) / maxUnits;

  const floorPlateM2 = unitsPerFloor * homeAreaM2 * commonSpaceMultiplier;
  const sitePerTowerM2 = floorPlateM2 * siteMultiplier;
  const residentsPerTower = r.unitCapacityPerTower * peoplePerHome;
  const activeUnits = active === null ? null : unitsOnFloor(unitsPerFloor, active);

  return (
    <Card aria-labelledby="tower-h">
      <Eyebrow>Tower explainer</Eyebrow>
      <h3 id="tower-h" className="mt-1 font-serif text-2xl text-ink">
        One tower, {fmtCompact(r.towerCount)} times over
      </h3>
      <div className="mt-4 grid gap-6 sm:grid-cols-[220px_1fr]">
        <figure>
          <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[220px]" role="img" aria-label={`Schematic tower: ${floors} floors, ${unitsPerFloor} apartments per floor on average`}>
            <rect x={x0 - 24} y={H - 24} width={towerW + 48} height={8} rx={2} fill="var(--c-free)" />
            {Array.from({ length: drawnFloors }, (_, i) => {
              const units = unitsOnFloor(unitsPerFloor, i);
              const y = H - 24 - (i + 1) * floorH;
              const on = active === i;
              return (
                <g
                  key={i}
                  tabIndex={0}
                  role="button"
                  aria-label={`Floor ${i + 1}: ${units} apartments, about ${sig(units * peoplePerHome, 3)} residents`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="cursor-pointer outline-none"
                >
                  <rect x={x0} y={y} width={towerW} height={floorH} fill={on ? "var(--ink)" : "var(--paper)"} stroke="var(--ink)" strokeWidth={0.75} />
                  {Array.from({ length: units }, (_, u) => (
                    <rect
                      key={u}
                      x={x0 + 4 + u * unitW + 1}
                      y={y + floorH * 0.2}
                      width={unitW - 2}
                      height={Math.max(1.5, floorH * 0.6)}
                      rx={1}
                      fill={on ? "var(--paper)" : "var(--c-residential)"}
                      opacity={on ? 1 : 0.85}
                    />
                  ))}
                </g>
              );
            })}
            {floors > drawnFloors && (
              <text x={W / 2} y={12} textAnchor="middle" fontSize={10} fill="var(--ink-3)">
                showing {drawnFloors} of {floors} floors
              </text>
            )}
          </svg>
          <figcaption aria-live="polite" className="mt-2 min-h-[2.5rem] text-center text-xs text-ink-2">
            {active === null ? (
              "Hover, tap or tab to a floor"
            ) : (
              <>
                Floor {active + 1}: {activeUnits} apartments · ~{sig(activeUnits! * peoplePerHome, 3)} residents
              </>
            )}
          </figcaption>
        </figure>
        <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-4 text-sm">
          <Stat label="Homes per tower" value={sig(r.unitCapacityPerTower, 4)} sub={`${floors} floors × ${unitsPerFloor}`} />
          <Stat label="Residents per tower" value={sig(residentsPerTower, 4)} sub={`${peoplePerHome} per home`} />
          <Stat label="Floor plate" value={`${fmtInt(floorPlateM2)} m²`} sub={`${unitsPerFloor} × ${homeAreaM2} m² × ${commonSpaceMultiplier}`} />
          <Stat label="Site per tower" value={`${fmtInt(sitePerTowerM2)} m²`} sub={`floor plate × ${siteMultiplier}`} />
          <Stat label="Towers needed" value={fmtCompact(r.towerCount)} sub="rounded up once" />
          <Stat label="Gross floor area" value={`${sig(r.grossApartmentAreaM2 / 1e6, 3)}m km²`.replace("m km²", " km²")} sub="all apartments + common space" rawValue={r.grossApartmentAreaM2 / 1e6} />
        </dl>
      </div>
      <p className="mt-4 text-xs text-ink-3">
        Macro-scale geometry only. Stairwell efficiency, fire codes, daylight and structural engineering are not modeled.
      </p>
    </Card>
  );
}

function Stat({ label, value, sub, rawValue }: { label: string; value: string; sub: string; rawValue?: number }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="tnum font-serif text-xl text-ink">{rawValue !== undefined ? `${fmtInt(rawValue)} km²` : value}</dd>
      <dd className="text-[11px] text-ink-3">{sub}</dd>
    </div>
  );
}
