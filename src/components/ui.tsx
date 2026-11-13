"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";
import type { SegmentId } from "@/lib/model";

export const SEGMENT_COLOR: Record<SegmentId | "free", string> = {
  residential: "var(--c-residential)",
  urbanOther: "var(--c-urban)",
  cropland: "var(--c-crop)",
  pasture: "var(--c-pasture)",
  forest: "var(--c-forest)",
  free: "var(--c-free)",
};

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** Fades content in once it scrolls into view. Respects reduced motion via CSS. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx("reveal", visible && "is-visible", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Reports whether an element is in view (for scroll-driven story stages). */
export function useInView<T extends Element>(threshold = 0.5) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/** Click/tap-to-open provenance popover. Works without hover. */
export function InfoTip({ label, children, align = "left" }: { label: string; children: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <span ref={wrap} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`About: ${label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-3 hover:bg-rule hover:text-ink"
      >
        <Info size={14} aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className={cx(
            "absolute top-7 z-40 w-72 max-w-[80vw] rounded-lg border border-rule-strong bg-paper p-3 text-left text-xs leading-relaxed font-normal text-ink-2 normal-case tracking-normal shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <span className="mb-1 flex items-start justify-between gap-2">
            <span className="font-semibold text-ink">{label}</span>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="text-ink-3 hover:text-ink">
              <X size={14} aria-hidden />
            </button>
          </span>
          <span className="block">{children}</span>
        </span>
      )}
    </span>
  );
}

export function KindBadge({ kind }: { kind: "observation" | "assumption" | "derived" }) {
  const styles = {
    observation: "bg-forest/10 text-[#0d5c4d] border-forest/30",
    assumption: "bg-crop/10 text-[#7a4a05] border-crop/30",
    derived: "bg-residential/10 text-[#1d4a8f] border-residential/30",
  }[kind];
  const text = { observation: "Observed", assumption: "Assumption", derived: "Derived" }[kind];
  return <span className={cx("inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", styles)}>{text}</span>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3">{children}</p>;
}

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cx("rounded-2xl border border-rule bg-paper p-5 sm:p-6", className)} {...rest}>
      {children}
    </section>
  );
}

export function IllustrativeLabel({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border border-rule-strong bg-ivory px-2.5 py-1 text-[11px] font-medium text-ink-2", className)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-crop" />
      Illustrative scenario, not a forecast
    </span>
  );
}

export function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-3 w-3 shrink-0 rounded-[3px]" style={{ background: color }} />;
}

/** Counts up to `value` once visible. Reduced-motion users get the final number. */
export function useCountUp(value: number, run: boolean, ms = 1400) {
  const [v, setV] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!run) return;
    if (done.current || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setV(value);
      done.current = true;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else done.current = true;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, run, ms]);
  return v;
}
