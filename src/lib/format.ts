/** Display-only formatting. Never feed these strings back into calculations. */

const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat("en-US", opts);

export function fmtInt(n: number) {
  return nf({ maximumFractionDigits: 0 }).format(n);
}

/** Compact human number: 2.37 billion, 33.9 million, 8,893. */
export function fmtCompact(n: number, digits = 3) {
  const a = Math.abs(n);
  if (a >= 1e9) return `${sig(n / 1e9, digits)} billion`;
  if (a >= 1e6) return `${sig(n / 1e6, digits)} million`;
  return fmtInt(n);
}

/** Short compact: 2.37b, 33.9m, 8.9k. */
export function fmtShort(n: number, digits = 3) {
  const a = Math.abs(n);
  if (a >= 1e9) return `${sig(n / 1e9, digits)}b`;
  if (a >= 1e6) return `${sig(n / 1e6, digits)}m`;
  if (a >= 1e4) return `${sig(n / 1e3, digits)}k`;
  return fmtInt(n);
}

export function sig(n: number, digits = 3) {
  if (n === 0) return "0";
  const s = Number(n.toPrecision(digits));
  return nf({ maximumFractionDigits: 6 }).format(s);
}

export function fmtKm2(n: number, compact = true) {
  return `${compact ? fmtShortArea(n) : fmtInt(n)} km²`;
}

function fmtShortArea(n: number) {
  const a = Math.abs(n);
  if (a >= 1e6) return `${sig(n / 1e6, 3)}m`;
  if (a >= 1e5) return fmtInt(Math.round(n / 100) * 100);
  return fmtInt(n);
}

export function fmtPct(n: number, digits = 1) {
  return `${nf({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)}%`;
}

export function fmtSigned(n: number, f: (x: number) => string) {
  if (n === 0) return f(0);
  return `${n > 0 ? "+" : "−"}${f(Math.abs(n))}`;
}

export function fmtInput(value: number, unit: string, divisor?: number, displayUnit?: string) {
  if (divisor) return `${sig(value / divisor, 3)} ${displayUnit ?? ""}`.trim();
  if (unit === "share") return fmtPct(value * 100, 0);
  if (unit === "×") return `${sig(value, 3)}×`;
  const u = value !== 1 ? unit : unit === "people" ? "person" : unit.endsWith("s") ? unit.slice(0, -1) : unit;
  return `${sig(value, 4)} ${u}`;
}

export function fmtRatio(r: number) {
  if (r >= 10) return `${fmtInt(r)}×`;
  if (r >= 1) return `${sig(r, 2)}×`;
  return `${sig(r * 100, 2)}%`;
}
