"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import { ASSUMPTIONS, BUNDLES, EARTH_LAND, SOURCES, type Datum } from "@/data/baselines";
import { COMPARATORS } from "@/data/comparators";
import { fmtInt } from "@/lib/format";
import { Eyebrow, KindBadge } from "./ui";

export interface SourceDrawerHandle {
  open: () => void;
}

const MODELED: [string, string][] = [
  ["Area of housing, city region, crops, pasture and forest", "Crop suitability, rainfall, irrigation, trade networks"],
  ["Floor and apartment geometry at macro scale", "Stairwells, fire codes, structural engineering"],
  ["An illustrative city-wide land allowance", "Energy capacity, water reliability, logistics throughput"],
  ["Forest area as a preservation target", "Ecological quality, biodiversity, carbon sinks, location"],
  ["Area comparisons on an equal-area map", "Site selection, relocation, political constraints"],
];

export const SourceDrawer = forwardRef<SourceDrawerHandle>(function SourceDrawer(_, ref) {
  const dlg = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => ({ open: () => dlg.current?.showModal() }));

  return (
    <dialog
      ref={dlg}
      aria-labelledby="sources-h"
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-2xl overflow-y-auto bg-paper p-0 text-ink shadow-2xl"
      onClick={(e) => e.target === dlg.current && dlg.current?.close()}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-paper/95 px-6 py-4 backdrop-blur">
        <div>
          <Eyebrow>Assumptions & sources</Eyebrow>
          <h2 id="sources-h" className="font-serif text-2xl">
            What&apos;s measured, what&apos;s assumed
          </h2>
        </div>
        <button type="button" onClick={() => dlg.current?.close()} aria-label="Close sources" className="rounded-full p-2 hover:bg-ivory">
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="space-y-8 px-6 py-6 text-sm">
        <p className="text-ink-2">
          Residential geometry is exact arithmetic on chosen inputs. Everything about cities, food and forests is a hypothetical multiplier on published FAO baselines. Labels below show which numbers are <KindBadge kind="observation" />, which are <KindBadge kind="assumption" />, and which are <KindBadge kind="derived" />.
        </p>

        {Object.values(BUNDLES).map((b) => (
          <section key={b.id} aria-labelledby={`b-${b.id}`}>
            <h3 id={`b-${b.id}`} className="font-semibold text-ink">
              Data bundle: {b.label}
            </h3>
            <p className={b.mixedVintage ? "mt-1 rounded-md bg-warn-bg p-2 text-xs text-warn" : "mt-1 text-xs text-ink-3"}>{b.caveat}</p>
            <ul className="mt-3 divide-y divide-rule">
              {[b.agricultureKm2, b.croplandKm2, b.pastureKm2, b.forestKm2].map((d) => (
                <DatumRow key={d.key} d={d} />
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="ref-h">
          <h3 id="ref-h" className="font-semibold text-ink">Reference values</h3>
          <ul className="mt-3 divide-y divide-rule">
            <DatumRow d={EARTH_LAND} />
          </ul>
        </section>

        <section aria-labelledby="as-h">
          <h3 id="as-h" className="font-semibold text-ink">Scenario defaults</h3>
          <ul className="mt-3 divide-y divide-rule">
            {ASSUMPTIONS.map((d) => (
              <DatumRow key={d.key} d={d} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="mod-h">
          <h3 id="mod-h" className="font-semibold text-ink">Modeled vs not modeled</h3>
          <table className="mt-3 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-rule text-ink-3">
                <th className="py-2 pr-3 font-medium">Modeled</th>
                <th className="py-2 font-medium">Not modeled</th>
              </tr>
            </thead>
            <tbody>
              {MODELED.map(([a, b]) => (
                <tr key={a} className="border-b border-rule/70 align-top">
                  <td className="py-2 pr-3 text-ink">{a}</td>
                  <td className="py-2 text-ink-3">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink-3">No climate, emissions, water, dietary health, biodiversity or cost outputs are calculated.</p>
        </section>

        <section aria-labelledby="cmpref-h">
          <h3 id="cmpref-h" className="font-semibold text-ink">Comparison areas</h3>
          <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            {COMPARATORS.map((c) => (
              <li key={c.id} className="flex justify-between gap-2 border-b border-rule/60 py-1">
                <a href={c.url} target="_blank" rel="noreferrer" className="hover:underline">
                  {c.name}
                </a>
                <span className="tnum text-ink-3">{fmtInt(c.areaKm2)} km²</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-3">Countries: CIA World Factbook total area (land + inland water). Cities use the named administrative boundary.</p>
        </section>

        <section aria-labelledby="src-h">
          <h3 id="src-h" className="font-semibold text-ink">Sources</h3>
          <ol className="mt-3 space-y-2">
            {Object.values(SOURCES).map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="group inline-flex items-start gap-1 text-ink hover:underline">
                  <span>
                    {s.publisher}, <em>{s.label}</em> ({s.published})
                  </span>
                  <ExternalLink size={12} className="mt-1 shrink-0 text-ink-3" aria-hidden />
                </a>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-ink-3">Unit conversion: FAO reports hectares. km² = ha ÷ 100, so 4.6 billion ha = 46 million km².</p>
        </section>
      </div>
    </dialog>
  );
});

function DatumRow({ d }: { d: Datum }) {
  return (
    <li className="py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 font-medium text-ink">
          {d.label} <KindBadge kind={d.kind} />
        </span>
        <span className="tnum text-ink">
          {fmtInt(d.value)} {d.unit}
          {d.year ? <span className="ml-1 text-xs text-ink-3">· {d.year}</span> : null}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-ink-3">
        {d.note}
        {d.source && (
          <>
            {" "}
            <a href={d.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {d.source.publisher}
            </a>
          </>
        )}
      </p>
    </li>
  );
}
