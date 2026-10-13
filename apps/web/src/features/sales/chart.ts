import { rp, rpShort } from "@starter/shared/fnb/domain";
import { nf, type Bucket, type Metric, type RangeKey } from "./aggregate";

// Pure layout of the hand-made SVG bar chart (prototype drawChart).

export function niceStep(raw: number) {
  if (!(raw > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

export const axisFmt = (v: number, metric: Metric) =>
  metric === "cnt"
    ? nf(v)
    : !v
      ? "0"
      : v >= 1e6
        ? "Rp " +
          (v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 2 }) +
          " jt"
        : "Rp " + nf(v / 1e3) + " rb";
export const valFmt = (v: number, metric: Metric) =>
  metric === "cnt" ? nf(v) + " pesanan" : rpShort(v);
export const valFull = (v: number, metric: Metric) =>
  metric === "cnt" ? nf(v) + " pesanan" : rp(v);

/** Bar: data end rounded 4px, square base on the baseline. */
export function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h}Z`;
}

export type ChartGeo = {
  W: number;
  H: number;
  M: { t: number; r: number; b: number; l: number };
  band: number;
  bw: number;
  ph: number;
  Y: (v: number) => number;
  ticks: { y: number; label: string; base: boolean }[];
  bars: { i: number; d: string; current: boolean }[];
  xlabels: {
    i: number;
    x: number;
    y0: number;
    label: string;
    sub: string;
    cls: string;
  }[];
  dlabels: { i: number; x: number; y: number; text: string }[];
};

export function chartGeometry(
  B: Bucket[],
  metric: Metric,
  mode: RangeKey,
  W: number,
): ChartGeo {
  const vals = B.map((b) => (b.future ? 0 : b[metric]));
  const max = Math.max(0, ...vals);
  const step =
    metric === "cnt"
      ? Math.max(1, niceStep(max / 4))
      : niceStep(Math.max(max, 4000) / 4);
  const yMax = Math.max(step, Math.ceil(max / step) * step);
  const tickVals: number[] = [];
  for (let k = 0; k * step <= yMax; k++) tickVals.push(k * step);
  const tl = tickVals.map((v) => axisFmt(v, metric));
  const two = mode === "7d";
  const M = {
    t: 24,
    r: 4,
    b: two ? 42 : 28,
    l: Math.max(26, Math.ceil(Math.max(...tl.map((s) => s.length)) * 6.3) + 12),
  };
  const H = W < 520 ? 240 : 300;
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;
  const y0 = M.t + ph;
  const Y = (v: number) => y0 - (v / yMax) * ph;
  const band = pw / B.length;
  const bw = Math.max(2, Math.min(24, band * (B.length > 20 ? 0.62 : 0.56)));
  const cx = (i: number) => M.l + band * (i + 0.5);

  const ticks = tickVals.map((v, k) => ({
    y: Math.round(Y(v)) + 0.5,
    label: tl[k]!,
    base: v === 0,
  }));

  const bars: ChartGeo["bars"] = [];
  B.forEach((b, i) => {
    const v = vals[i]!;
    if (b.future || v <= 0) return;
    const h = Math.max(2, y0 - Y(v));
    bars.push({
      i,
      d: barPath(cx(i) - bw / 2, y0 - h, bw, h),
      current: b.current,
    });
  });

  // X labels (30 days: sparse, anchored at today).
  const every =
    mode === "30d" ? Math.max(1, Math.ceil(46 / band)) : band < 26 ? 2 : 1;
  const xlabels: ChartGeo["xlabels"] = [];
  B.forEach((b, i) => {
    if (mode === "30d" ? (B.length - 1 - i) % every : i % every) return;
    xlabels.push({
      i,
      x: cx(i),
      y0,
      label: b.label,
      sub: b.sub,
      cls: (b.current ? " cur" : "") + (b.future ? " fut" : ""),
    });
  });

  // Direct labels — only the running bar and the peak (selective).
  const curI = B.findIndex((b) => b.current);
  const maxI = vals.indexOf(max);
  const lab: number[] = [];
  if (curI >= 0 && vals[curI]! > 0) lab.push(curI);
  if (
    max > 0 &&
    maxI !== curI &&
    (curI < 0 || vals[curI]! <= 0 || Math.abs(maxI - curI) * band >= 72)
  )
    lab.push(maxI);
  const dlabels: ChartGeo["dlabels"] = [];
  for (const i of lab) {
    const text = metric === "rev" ? rpShort(vals[i]!) : nf(vals[i]!);
    const half = text.length * 3.4 + 3;
    const x = Math.min(Math.max(cx(i), M.l + half), W - M.r - half);
    let top = vals[i]!;
    B.forEach((_, j) => {
      if (j !== i && Math.abs(cx(j) - x) < half + bw / 2 + 2)
        top = Math.max(top, vals[j]!);
    });
    // A label far above its own bar would detach from it → tooltip & table suffice.
    if (Y(vals[i]!) - Y(top) > 36) continue;
    dlabels.push({ i, x, y: Y(top) - 8, text });
  }

  return { W, H, M, band, bw, ph, Y, ticks, bars, xlabels, dlabels };
}
