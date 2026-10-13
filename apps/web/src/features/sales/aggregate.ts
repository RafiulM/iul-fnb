import {
  hhmm,
  num,
  ORDER_STATUS,
  PAY_METHOD,
  tgl,
} from "@starter/shared/fnb/domain";
import type {
  CafeSettingsDto,
  OrderDto,
  OrderType,
  PaymentMethod,
} from "@starter/shared/fnb/types";

// Pure aggregation for the Penjualan dashboard (port of the prototype's
// period/metrics/chartBuckets/heatData/txFiltered/dlData). No React, no DOM.

export type RangeKey = "today" | "7d" | "30d";
export type ReportRangeKey = RangeKey | "month";
export type Metric = "rev" | "cnt";
export type ReportFormat = "tx" | "daily";

/** A finished or cancelled order with its timestamp parsed once. */
export type Tx = OrderDto & { at: number };

export const PER_PAGE = 15;
/** Opening-hours grid of the chart and heat map: 08–22. */
export const HOURS = Array.from({ length: 15 }, (_, k) => 8 + k);

export const RANGE: Record<ReportRangeKey, { days: number; label: string }> = {
  today: { days: 1, label: "Hari ini" },
  "7d": { days: 7, label: "7 hari terakhir" },
  "30d": { days: 30, label: "30 hari terakhir" },
  month: { days: 0, label: "Bulan ini" },
};

/* ---------- Dates & numbers ---------- */

export const pad = (n: number) => String(n).padStart(2, "0");
export const nf = (n: number) => num(n);
export const nf1 = (n: number) =>
  n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
export const sum = <T>(arr: T[], f: (x: T) => number) =>
  arr.reduce((a, x) => a + f(x), 0);

/** Start of day. */
export function sod(d: number | Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function addDays(d: number | Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dShort = (d: number | Date) =>
  tgl(d, { day: "numeric", month: "short" });
export const dLong = (d: number | Date) =>
  tgl(d, { weekday: "long", day: "numeric", month: "short" });
export const dCsv = (d: number | Date) =>
  tgl(d, { day: "2-digit", month: "2-digit", year: "numeric" });
/** Weekday name (0 = Sunday) in the week of `now`. */
export const wdName = (now: number, dow: number, style: "long" | "short") =>
  tgl(addDays(sod(now), dow - new Date(now).getDay()), { weekday: style });

/**
 * Reference time. The prototype's morning preview `?jam=07:30` moves "now"
 * back to that time of today (never forward).
 */
export function referenceNow(realNow: number, jam: string | undefined) {
  const m = /^(\d{1,2})[.:](\d{2})$/.exec(jam ?? "");
  if (!m) return realNow;
  const d = new Date(realNow);
  d.setHours(Math.min(23, Number(m[1])), Math.min(59, Number(m[2])), 0, 0);
  return d.getTime() < realNow ? d.getTime() : realNow;
}

/** Up to `now`, newest first. */
export function toTx(list: OrderDto[], now: number): Tx[] {
  return list
    .map((o) => ({ ...o, at: new Date(o.createdAt).getTime() }))
    .filter((t) => t.at <= now)
    .sort((a, b) => b.at - a.at);
}

export const isDone = (t: Tx) => t.status === "SELESAI";
export const inRange = (t: Tx, s: number, e: number) => t.at >= s && t.at <= e;
export const txIn = (tx: Tx[], s: number, e: number) =>
  tx.filter((t) => inRange(t, s, e));
export const itemsText = (t: Pick<OrderDto, "items">, x = "×") =>
  t.items.map((i) => `${i.qty}${x} ${i.name}`).join(", ");

/* ---------- Periods ---------- */

export type Period = {
  key: ReportRangeKey;
  start: number;
  end: number;
  /** Same length, cut at the same time of day. "Hari ini" → same weekday last week. */
  prev: { start: number; end: number } | null;
};

export function period(key: ReportRangeKey, now: number): Period {
  const today = sod(now);
  const start =
    key === "month"
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : addDays(today, -(RANGE[key].days - 1));
  const shift = key === "today" ? 7 : RANGE[key].days;
  return {
    key,
    start: start.getTime(),
    end: now,
    prev: shift
      ? {
          start: addDays(start, -shift).getTime(),
          end: addDays(now, -shift).getTime(),
        }
      : null,
  };
}

export function periodText(s: number, e: number) {
  const a = new Date(s);
  const b = new Date(e);
  if (sod(a).getTime() === sod(b).getTime())
    return tgl(a, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
    return a.getDate() + "–" + tgl(b);
  return dShort(a) + " – " + tgl(b);
}

export const vsText = (key: ReportRangeKey, now: number) =>
  key === "today"
    ? `vs ${wdName(now, new Date(now).getDay(), "long")} lalu`
    : `vs ${RANGE[key].days} hari sebelumnya`;

/* ---------- Summary numbers ---------- */

export type TopMenu = {
  id: string;
  name: string;
  emoji: string;
  qty: number;
  rev: number;
};
export type Part = { n: number; amt: number };
export type Metrics = {
  done: Tx[];
  rev: number;
  cnt: number;
  avg: number;
  top: TopMenu[];
  qtyAll: number;
  pay: Record<PaymentMethod, Part>;
  src: Record<OrderType, Part>;
};

export function metrics(list: Tx[]): Metrics {
  const done = list.filter(isDone);
  const rev = sum(done, (t) => t.totalAmount);
  const items = new Map<string, TopMenu>();
  for (const t of done)
    for (const i of t.items) {
      let m = items.get(i.menuId);
      if (!m) {
        m = { id: i.menuId, name: i.name, emoji: i.imageUrl, qty: 0, rev: 0 };
        items.set(i.menuId, m);
      }
      m.qty += i.qty;
      m.rev += i.price * i.qty;
    }
  const top = [...items.values()].sort(
    (a, b) => b.qty - a.qty || b.rev - a.rev,
  );
  const part = (f: (t: Tx) => boolean): Part => {
    const a = done.filter(f);
    return { n: a.length, amt: sum(a, (t) => t.totalAmount) };
  };
  return {
    done,
    rev,
    cnt: done.length,
    avg: done.length ? rev / done.length : 0,
    top,
    qtyAll: sum(top, (m) => m.qty),
    pay: {
      CASH: part((t) => t.paymentMethod === "CASH"),
      NON_CASH: part((t) => t.paymentMethod === "NON_CASH"),
    },
    src: {
      QR: part((t) => t.orderType === "QR"),
      MANUAL: part((t) => t.orderType === "MANUAL"),
    },
  };
}

/* ---------- Deltas (direction = colored icon + text, never color alone) ---------- */

export type Dir = "up" | "down" | "flat";
/** `tone` is the data-dir used for color; neutral comparisons stay "flat". */
export type Change = { dir: Dir; tone: Dir; text: string };

/** Percent change; null when there is nothing to compare against. */
export function percentChange(cur: number, prev: number): Change | null {
  if (!prev) return null;
  const pct = ((cur - prev) / prev) * 100;
  const abs = Math.abs(pct);
  if (abs < 0.05) return { dir: "flat", tone: "flat", text: "0%" };
  const dir = pct > 0 ? "up" : "down";
  return { dir, tone: dir, text: `${abs < 10 ? nf1(abs) : nf(abs)}%` };
}

/** Change of a share in percentage points. */
export function pointsChange(
  cur: number,
  prev: number | null,
  neutral = false,
): Change | null {
  if (prev == null) return null;
  const d = cur - prev;
  const abs = Math.abs(d);
  if (abs < 0.05) return { dir: "flat", tone: "flat", text: "0 poin" };
  const dir = d > 0 ? "up" : "down";
  return { dir, tone: neutral ? "flat" : dir, text: `${nf1(abs)} poin` };
}

/** Two shares that always add up to 100. */
export function split(a: number, b: number): [number, number] {
  const t = a + b;
  if (!t) return [0, 0];
  const x = Math.round((a / t) * 100);
  return [x, 100 - x];
}

/* ---------- Chart ---------- */

export type Bucket = {
  label: string;
  sub: string;
  title: string;
  short: string;
  rev: number;
  cnt: number;
  current: boolean;
  future: boolean;
};

export function chartBuckets(tx: Tx[], p: Period, now: number): Bucket[] {
  const done = tx.filter((t) => isDone(t) && inRange(t, p.start, p.end));
  if (p.key === "today") {
    const nowH = new Date(now).getHours();
    return HOURS.map((h) => {
      const a = done.filter((t) => new Date(t.at).getHours() === h);
      return {
        label: pad(h),
        sub: "",
        title: `Pukul ${pad(h)}.00–${pad(h)}.59`,
        short: `${pad(h)}.00–${pad(h)}.59`,
        rev: sum(a, (t) => t.totalAmount),
        cnt: a.length,
        current: h === nowH,
        future: h > nowH,
      };
    });
  }
  const n = RANGE[p.key].days;
  const today = sod(now);
  const byDay = new Map<number, { rev: number; cnt: number }>();
  for (const t of done) {
    const k = sod(t.at).getTime();
    const o = byDay.get(k) ?? { rev: 0, cnt: 0 };
    o.rev += t.totalAmount;
    o.cnt++;
    byDay.set(k, o);
  }
  return Array.from({ length: n }, (_, k) => {
    const d = addDays(today, k - n + 1);
    const o = byDay.get(d.getTime()) ?? { rev: 0, cnt: 0 };
    const cur = k === n - 1;
    return {
      label:
        n <= 7 ? (cur ? "Hari ini" : tgl(d, { weekday: "short" })) : dShort(d),
      sub: n <= 7 ? dShort(d) : "",
      title: dLong(d),
      short: dLong(d),
      rev: o.rev,
      cnt: o.cnt,
      current: cur,
      future: false,
    };
  });
}

export const metricName = (metric: Metric) =>
  metric === "rev" ? "Penjualan" : "Jumlah pesanan";

export function bestOf(B: Bucket[], metric: Metric) {
  const valid = B.filter((b) => !b.future);
  return valid.reduce((a, b) => (b[metric] > a[metric] ? b : a), valid[0]!);
}

/** Text alternative of the whole chart (svg aria-label). */
export function chartSummary(
  B: Bucket[],
  metric: Metric,
  p: Period,
  format: (v: number, metric: Metric) => string,
) {
  const isHour = p.key === "today";
  const best = bestOf(B, metric);
  const cur = B.find((b) => b.current);
  return (
    `${metricName(metric)} per ${isHour ? "jam" : "hari"}, ${periodText(p.start, p.end)}. ${isHour ? "Jam" : "Hari"} tersibuk ${best.short}: ${format(best[metric], metric)}.` +
    (cur
      ? ` ${isHour ? "Jam ini" : "Hari ini"} (masih berjalan): ${format(cur[metric], metric)}.`
      : "")
  );
}

/* ---------- Heat map ---------- */

export type HeatCell = { h: number; v: number | null; k: number };
export type HeatRow = { label: string; full: string; cells: HeatCell[] };
export type Heat = {
  rows: HeatRow[];
  max: number;
  best: { r: number; c: number; v: number } | null;
};

export function heatData(tx: Tx[], p: Period, now: number): Heat {
  const done = tx.filter((t) => isDone(t) && inRange(t, p.start, p.end));
  const cnt = new Map<string, number>();
  for (const t of done) {
    const k = sod(t.at).getTime() + "|" + new Date(t.at).getHours();
    cnt.set(k, (cnt.get(k) ?? 0) + 1);
  }
  const days: Date[] = [];
  for (let d = new Date(p.start); d.getTime() <= now; d = addDays(d, 1))
    days.push(d);
  const groups =
    p.key === "today"
      ? [{ label: "Hari ini", full: "Hari ini", days }]
      : [1, 2, 3, 4, 5, 6, 0].map((dw) => ({
          label: wdName(now, dw, "short"),
          full: wdName(now, dw, "long"),
          days: days.filter((d) => d.getDay() === dw),
        }));
  let max = 0;
  let best: Heat["best"] = null;
  const rows = groups.map((g, r) => ({
    label: g.label,
    full: g.full,
    cells: HOURS.map((h, c): HeatCell => {
      const avail = g.days.filter((d) => {
        const s = new Date(d);
        s.setHours(h, 0, 0, 0);
        return s.getTime() <= now;
      });
      if (!avail.length) return { h, v: null, k: 0 };
      const v =
        sum(avail, (d) => cnt.get(d.getTime() + "|" + h) ?? 0) / avail.length;
      if (v > max) {
        max = v;
        best = { r, c, v };
      }
      return { h, v, k: avail.length };
    }),
  }));
  return { rows, max, best };
}

/** Ink ramp class: "na" (not yet), "" (zero), b1–b5. */
export function heatBin(v: number | null, max: number) {
  if (v == null) return "na";
  if (v <= 0) return "";
  return "b" + Math.min(5, Math.max(1, Math.ceil((v / max) * 5)));
}

/* ---------- Transactions ---------- */

export type TxFilter = {
  q: string;
  method: "" | PaymentMethod;
  status: "" | "SELESAI" | "DIBATALKAN";
};

export function txFiltered(list: Tx[], f: TxFilter) {
  let out = list;
  if (f.method) out = out.filter((t) => t.paymentMethod === f.method);
  if (f.status) out = out.filter((t) => t.status === f.status);
  const q = f.q.trim().toLowerCase();
  if (q) {
    const mNum = /^(?:meja\s*)?0*(\d{1,2})$/.exec(q);
    out = out.filter(
      (t) =>
        t.code.toLowerCase().includes(q) ||
        (t.tableNumber
          ? mNum
            ? Number(t.tableNumber) === Number(mNum[1])
            : ("meja " + t.tableNumber).includes(q)
          : "bawa pulang".includes(q)) ||
        t.items.some((i) => i.name.toLowerCase().includes(q)),
    );
  }
  return out;
}

/* ---------- Report (CSV) ---------- */

export type ReportCell = string | number;

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "kafe";

export function reportData(
  tx: Tx[],
  key: ReportRangeKey,
  fmt: ReportFormat,
  now: number,
  settings: Pick<CafeSettingsDto, "cafeName">,
) {
  const p = period(key, now);
  const list = txIn(tx, p.start, p.end).reverse(); // oldest first
  const done = list.filter(isDone);
  const rev = sum(done, (t) => t.totalAmount);
  let rows: ReportCell[][];
  let lines: number;
  if (fmt === "tx") {
    rows = [
      [
        "Tanggal",
        "Jam",
        "No. Pesanan",
        "Tipe",
        "Meja",
        "Item",
        "Subtotal",
        "Pajak",
        "Total",
        "Metode",
        "Kasir",
        "Status",
      ],
      ...list.map((t) => [
        dCsv(t.at),
        hhmm(t.at),
        t.code,
        t.orderType === "QR" ? "QR" : "Kasir",
        t.tableNumber ? "Meja " + t.tableNumber : "Bawa pulang",
        itemsText(t, "x"),
        t.subtotal,
        t.tax,
        t.totalAmount,
        t.paymentMethod ? PAY_METHOD[t.paymentMethod] : "-",
        t.cashierName || "-",
        ORDER_STATUS[t.status].label,
      ]),
    ];
    lines = list.length;
  } else {
    const days: Date[] = [];
    for (let d = new Date(p.start); d.getTime() <= now; d = addDays(d, 1))
      days.push(d);
    const body = days.map((d) => {
      const a = done.filter((t) => sod(t.at).getTime() === d.getTime());
      const r = sum(a, (t) => t.totalAmount);
      const by = (m: PaymentMethod) =>
        sum(
          a.filter((t) => t.paymentMethod === m),
          (t) => t.totalAmount,
        );
      return [
        dCsv(d),
        a.length,
        r,
        by("CASH"),
        by("NON_CASH"),
        a.length ? Math.round(r / a.length) : 0,
      ] as [string, number, number, number, number, number];
    });
    rows = [
      [
        "Tanggal",
        "Jumlah Pesanan",
        "Penjualan",
        "Tunai",
        "Non-tunai",
        "Rata-rata",
      ],
      ...body,
      [
        "Total",
        done.length,
        rev,
        sum(body, (x) => x[3]),
        sum(body, (x) => x[4]),
        done.length ? Math.round(rev / done.length) : 0,
      ],
    ];
    lines = body.length;
  }
  return {
    fmt,
    p,
    list,
    done,
    rev,
    rows,
    lines,
    fname: `laporan-penjualan-${slug(settings.cafeName)}-${ymd(new Date(now))}.csv`,
  };
}
