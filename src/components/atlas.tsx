"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Download, Image as ImageIcon, Link2, Pin, SlidersHorizontal, X } from "lucide-react";
import { matchPreset, presetById, presetInputs } from "@/data/presets";
import { computeScenario } from "@/lib/model";
import { DEFAULT_INPUTS, decodeInputs, deserializeCompact, encodeInputs, serializeCompact, type NumericKey, type ScenarioInputs } from "@/lib/schema";
import { downloadCsv, downloadPng } from "@/lib/export";
import { fmtKm2, fmtPct } from "@/lib/format";
import { Hero, Story } from "./story";
import { KpiStrip } from "./kpi-strip";
import { LandBudget } from "./land-budget";
import { TowerExplainer } from "./tower-explainer";
import { SensitivityCard } from "./sensitivity-chart";
import { PerspectiveMap } from "./perspective-map";
import { ScenarioCompare } from "./scenario-compare";
import { SourceDrawer, type SourceDrawerHandle } from "./source-drawer";
import { PresetPicker, ScenarioControls } from "./scenario-controls";
import { CaseStudy } from "./case-study";
import { IllustrativeLabel, cx } from "./ui";

function readUrl(): { inputs: ScenarioInputs; cmp: ScenarioInputs | null } {
  const p = new URLSearchParams(window.location.search);
  const preset = presetById(p.get("preset"));
  const base = preset ? presetInputs(preset) : DEFAULT_INPUTS;
  const inputs = decodeInputs(p, base);
  const cmpRaw = p.get("cmp");
  return { inputs, cmp: cmpRaw ? deserializeCompact(cmpRaw) : null };
}

function buildSearch(inputs: ScenarioInputs, cmp: ScenarioInputs | null) {
  const preset = matchPreset(inputs);
  const p = encodeInputs(inputs, preset?.id);
  if (preset) {
    // A preset id fully describes its numbers; keep only the bundle override.
    for (const k of [...p.keys()]) if (!["v", "preset", "b"].includes(k)) p.delete(k);
  }
  if (cmp) p.set("cmp", serializeCompact(cmp));
  return `?${p.toString()}`;
}

export function Atlas() {
  const [inputs, setInputs] = useState<ScenarioInputs>(DEFAULT_INPUTS);
  const [cmpA, setCmpA] = useState<ScenarioInputs | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const sources = useRef<SourceDrawerHandle>(null);
  const hydrated = useRef(false);
  const replaceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const r = useMemo(() => computeScenario(inputs), [inputs]);
  const story = useMemo(() => computeScenario(DEFAULT_INPUTS), []);
  const preset = matchPreset(inputs);

  // Hydrate from URL and follow back/forward.
  useEffect(() => {
    const apply = () => {
      const s = readUrl();
      setInputs(s.inputs);
      setCmpA(s.cmp);
    };
    apply();
    hydrated.current = true;
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  const writeUrl = useCallback((next: ScenarioInputs, cmp: ScenarioInputs | null, mode: "push" | "replace") => {
    if (!hydrated.current) return;
    const search = buildSearch(next, cmp);
    if (search === window.location.search) return;
    const url = `${window.location.pathname}${search}${window.location.hash}`;
    clearTimeout(replaceTimer.current);
    if (mode === "push") window.history.pushState(null, "", url);
    else replaceTimer.current = setTimeout(() => window.history.replaceState(null, "", url), 250);
  }, []);

  const update = (next: ScenarioInputs, mode: "push" | "replace", cmp = cmpA) => {
    setInputs(next);
    writeUrl(next, cmp, mode);
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const onPreset = (id: string) => {
    const p = presetById(id);
    if (p) update(presetInputs(p, inputs.bundle), "push");
  };
  const onChange = (key: NumericKey, value: number) => update({ ...inputs, [key]: value }, "replace");
  const pin = () => {
    setCmpA(inputs);
    writeUrl(inputs, inputs, "push");
    flash("Pinned as scenario A. Change anything to compare.");
  };
  const clearCmp = () => {
    setCmpA(null);
    writeUrl(inputs, null, "push");
  };
  const loadA = () => {
    if (!cmpA) return;
    const prevB = inputs;
    setCmpA(prevB);
    update(cmpA, "push", prevB);
  };
  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${buildSearch(inputs, cmpA)}#lab`;
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied. It reproduces this exact scenario.");
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <>
      <a href="#lab" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Skip to the scenario lab
      </a>
      <header className="sticky top-0 z-30 border-b border-rule bg-ivory/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-center gap-2 font-serif text-lg text-ink">
            <Globe2Mark /> Humanity Atlas
          </a>
          <nav aria-label="Primary" className="flex items-center gap-1 text-sm">
            <a href="#story" className="hidden rounded-full px-3 py-1.5 text-ink-2 hover:text-ink sm:inline">Story</a>
            <a href="#lab" className="rounded-full px-3 py-1.5 text-ink-2 hover:text-ink">Lab</a>
            <a href="#case-study" className="hidden rounded-full px-3 py-1.5 text-ink-2 hover:text-ink md:inline">Case study</a>
            <button type="button" onClick={() => sources.current?.open()} className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-ink hover:border-ink">
              <BookOpen size={14} aria-hidden /> Sources
            </button>
          </nav>
        </div>
      </header>

      <main id="top">
        <Hero r={story} />
        <Story r={story} />

        <section id="lab" aria-labelledby="lab-h" className="scroll-mt-14">
          <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">The lab</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <h2 id="lab-h" className="font-serif text-4xl text-ink sm:text-5xl">
                Design a planet
              </h2>
              <IllustrativeLabel />
            </div>
            <p className="mt-3 max-w-2xl text-ink-2">Pick a preset to see what it changes, then adjust any assumption. Every number recalculates instantly and the URL keeps your scenario.</p>
            <div className="mt-6">
              <PresetPicker presetId={preset?.id} onPick={onPreset} />
            </div>
          </div>

          {/* Sticky scenario strip */}
          <div className="sticky top-[53px] z-20 mt-8 border-y border-rule bg-paper/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
              <div className="flex min-w-0 items-baseline gap-3">
                <span className="truncate text-sm font-semibold text-ink">{preset?.name ?? "Custom scenario"}</span>
                <span className={cx("tnum text-sm", r.exceedsLand ? "font-semibold text-warn" : "text-ink-2")}>
                  {fmtKm2(r.totalAllocatedKm2)} · {fmtPct(r.utilizationPct)} of land{r.exceedsLand ? " · exceeds land available" : ""}
                </span>
                {cmpA && (
                  <a href="#compare" className="hidden text-xs text-ink-3 underline underline-offset-2 sm:inline">
                    vs A: {fmtPct(computeScenario(cmpA).utilizationPct)}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setDrawer(true)} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-paper lg:hidden">
                  <SlidersHorizontal size={13} aria-hidden /> Adjust
                </button>
                <ToolButton onClick={pin} label="Pin as A" icon={<Pin size={13} aria-hidden />} />
                <ToolButton onClick={copyLink} label="Copy link" icon={<Link2 size={13} aria-hidden />} />
                <ToolButton onClick={() => downloadCsv(r)} label="CSV" icon={<Download size={13} aria-hidden />} />
                <ToolButton onClick={() => downloadPng(r).catch(() => flash("PNG export failed in this browser."))} label="PNG" icon={<ImageIcon size={13} aria-hidden />} />
              </div>
            </div>
          </div>

          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-8">
            <aside
              aria-label="Scenario controls"
              className={cx(
                drawer ? "fixed inset-x-0 bottom-0 z-50 block max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-rule bg-paper p-5 shadow-2xl" : "hidden",
                "lg:sticky lg:top-[112px] lg:z-auto lg:block lg:max-h-[calc(100dvh-128px)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-rule lg:bg-paper lg:p-5 lg:shadow-none",
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
                <span className={cx("tnum text-xs", r.exceedsLand ? "font-semibold text-warn" : "text-ink-2")} aria-live="polite">
                  {fmtKm2(r.totalAllocatedKm2)} · {fmtPct(r.utilizationPct)} of land
                </span>
                <button type="button" onClick={() => setDrawer(false)} className="inline-flex items-center gap-1 rounded-full border border-rule px-3 py-1 text-xs">
                  <X size={13} aria-hidden /> Done
                </button>
              </div>
              <ScenarioControls inputs={inputs} onChange={onChange} onBundle={(b) => update({ ...inputs, bundle: b }, "push")} onReset={() => update(DEFAULT_INPUTS, "push")} />
            </aside>
            {drawer && <div aria-hidden className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setDrawer(false)} />}

            <div className="min-w-0 space-y-6">
              <KpiStrip r={r} />
              <LandBudget r={r} />
              <div id="compare" className="scroll-mt-32">
                <ScenarioCompare a={cmpA} b={inputs} onPin={pin} onClear={clearCmp} onSwap={loadA} />
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                <TowerExplainer r={r} />
                <SensitivityCard r={r} />
              </div>
              <PerspectiveMap r={r} />
            </div>
          </div>
        </section>

        <CaseStudy r={story} onSources={() => sources.current?.open()} />
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-ink-3 sm:px-6">
          <p>Humanity Atlas · an illustrative scenario model, not a forecast or feasibility study. Baselines: FAO land statistics and FRA 2025.</p>
          <p>
            Built by Aditya Hasija ·{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => sources.current?.open()}>
              Sources & assumptions
            </button>
          </p>
        </div>
      </footer>

      <SourceDrawer ref={sources} />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
        {toast && (
          <p className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-lg">
            <Check size={14} aria-hidden /> {toast}
          </p>
        )}
      </div>
    </>
  );
}

function ToolButton({ onClick, label, icon }: { onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1.5 text-xs font-medium text-ink-2 hover:border-ink hover:text-ink">
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Globe2Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12" y="12" width="7" height="7" fill="var(--c-forest)" />
      <rect x="12" y="12" width="3" height="3" fill="var(--c-residential)" />
    </svg>
  );
}
