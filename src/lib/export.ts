import { BUNDLES } from "@/data/baselines";
import { matchPreset } from "@/data/presets";
import { landSegments, toCsv, type ScenarioResult } from "./model";
import { fmtCompact, fmtKm2, fmtPct } from "./format";

const COLORS: Record<string, string> = {
  residential: "#2e6fd0",
  urbanOther: "#a48be0",
  cropland: "#d88a12",
  pasture: "#a9562b",
  forest: "#16917a",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Self-contained SVG summary card, used for PNG export. */
export function scenarioCardSvg(r: ScenarioResult): string {
  const W = 1200;
  const H = 630;
  const name = matchPreset(r.inputs)?.name ?? "Custom scenario";
  const scale = Math.max(r.earthLandKm2, r.totalAllocatedKm2);
  const barX = 60;
  const barW = W - 120;
  let x = barX;
  const rects = landSegments(r)
    .map((s) => {
      const w = Math.max(s.km2 > 0 ? 2 : 0, (s.km2 / scale) * barW);
      const out = `<rect x="${x.toFixed(1)}" y="330" width="${w.toFixed(1)}" height="56" fill="${COLORS[s.id]}"/>`;
      x += w;
      return out;
    })
    .join("");
  const earthX = barX + (r.earthLandKm2 / scale) * barW;
  const kpis: [string, string][] = [
    ["Apartments", fmtCompact(r.homeCount)],
    ["Towers", fmtCompact(r.towerCount)],
    ["Building footprint", fmtKm2(r.residentialBuildingFootprintKm2)],
    ["Urban region", fmtKm2(r.urbanAreaKm2)],
    ["Food land", fmtKm2(r.agricultureKm2)],
    ["Forest target", fmtKm2(r.forestTargetKm2)],
  ];
  const kpiSvg = kpis
    .map(([k, v], i) => {
      const cx = 60 + i * 185;
      return `<text x="${cx}" y="460" font-size="16" fill="#6b7489">${esc(k)}</text><text x="${cx}" y="494" font-size="28" fill="#14213d" font-family="Georgia, serif">${esc(v)}</text>`;
    })
    .join("");
  const legend = landSegments(r)
    .map((s, i) => `<rect x="${60 + i * 210}" y="404" width="12" height="12" rx="2" fill="${COLORS[s.id]}"/><text x="${80 + i * 210}" y="415" font-size="14" fill="#3d4a66">${esc(s.label)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">
<rect width="${W}" height="${H}" fill="#f7f3ea"/>
<text x="60" y="80" font-size="18" letter-spacing="3" fill="#6b7489">HUMANITY ATLAS</text>
<text x="60" y="140" font-size="44" fill="#14213d" font-family="Georgia, serif">${esc(name)}</text>
<text x="60" y="250" font-size="96" fill="#14213d" font-family="Georgia, serif">${esc(fmtPct(r.utilizationPct))}</text>
<text x="${60 + 330}" y="215" font-size="22" fill="#3d4a66">of Earth&apos;s land allocated to cities, food and forest</text>
<text x="${60 + 330}" y="248" font-size="22" fill="#3d4a66">${esc(fmtKm2(r.totalAllocatedKm2))} for ${esc(fmtCompact(r.inputs.population))} people</text>
<rect x="${barX}" y="330" width="${barW}" height="56" fill="#e9e2d2"/>
${rects}
${r.exceedsLand ? `<line x1="${earthX}" x2="${earthX}" y1="318" y2="398" stroke="#9a3412" stroke-width="3" stroke-dasharray="6 4"/><text x="${earthX - 6}" y="312" font-size="14" text-anchor="end" fill="#9a3412">Earth&apos;s land</text>` : ""}
${legend}
${kpiSvg}
<text x="60" y="580" font-size="15" fill="#6b7489">Illustrative scenario, not a forecast · Baselines: ${esc(BUNDLES[r.inputs.bundle].label)} · FAO</text>
</svg>`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(r: ScenarioResult) {
  download(new Blob([toCsv(r)], { type: "text/csv;charset=utf-8" }), "humanity-atlas-scenario.csv");
}

export async function downloadPng(r: ScenarioResult) {
  const svg = scenarioCardSvg(r);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not render the scenario card"));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 2400;
  canvas.height = 1260;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (blob) download(blob, "humanity-atlas-scenario.png");
}
