import {
  hhmm,
  ORDER_STATUS,
  PAY_METHOD,
  rp,
  tgl,
  tglPanjang,
} from "@starter/shared/fnb/domain";
import type {
  OrderDto,
  OrderType,
  PaymentMethod,
} from "@starter/shared/fnb/types";
import { cafeDaysAgo } from "@/lib/cafe-date";

// Pure filter / aggregate helpers for the Riwayat Transaksi page
// (design/src/pages/riwayat.page.html).

export const PAGE = 30;

export type RangeKey = "today" | "yesterday" | "7d" | "30d";
export type FilterKey = "method" | "source" | "status" | "cashier";

export type RiwayatFilters = {
  range: RangeKey;
  q: string;
  method: "" | PaymentMethod;
  source: "" | OrderType;
  status: "" | "SELESAI" | "DIBATALKAN";
  cashier: string;
};

export const DEFAULT_FILTERS: RiwayatFilters = {
  range: "today",
  q: "",
  method: "",
  source: "",
  status: "",
  cashier: "",
};

export const RANGE: Record<RangeKey, string> = {
  today: "Hari ini",
  yesterday: "Kemarin",
  "7d": "7 hari terakhir",
  "30d": "30 hari terakhir",
};

export const RANGE_BUTTONS: [RangeKey, string][] = [
  ["today", "Hari ini"],
  ["yesterday", "Kemarin"],
  ["7d", "7 hari"],
  ["30d", "30 hari"],
];

export const FILTER_KEYS: FilterKey[] = [
  "method",
  "source",
  "status",
  "cashier",
];

export const FILTER_LABEL: Record<FilterKey, string> = {
  method: "Metode",
  source: "Sumber",
  status: "Status",
  cashier: "Kasir",
};

export const SOURCE: Record<OrderType, string> = { QR: "QR", MANUAL: "Kasir" };

export function valueLabel(k: FilterKey, v: string) {
  if (k === "method") return PAY_METHOD[v as PaymentMethod] ?? v;
  if (k === "source") return SOURCE[v as OrderType] ?? v;
  if (k === "status") return ORDER_STATUS[v as "SELESAI"]?.label ?? v;
  return v;
}

/* ---------- Dates ---------- */

const pad = (n: number) => String(n).padStart(2, "0");

export const ymd = (d: string | number | Date) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

/** Start of the local day, in ms. */
export const sod = (d: string | number | Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

export const addDays = (d: number, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.getTime();
};

export function bounds(key: RangeKey, now: number) {
  const today = sod(now);
  if (key === "yesterday") return { start: addDays(today, -1), end: today - 1 };
  const days = key === "7d" ? 7 : key === "30d" ? 30 : 1;
  return { start: addDays(today, -(days - 1)), end: now };
}

/**
 * The cafe days ("YYYY-MM-DD", Asia/Jakarta like the API) the database is
 * asked for: only the selected range is loaded.
 */
export function rangeDates(key: RangeKey, now: number) {
  if (key === "yesterday") {
    const d = cafeDaysAgo(1, now);
    return { from: d, to: d };
  }
  const days = key === "7d" ? 7 : key === "30d" ? 30 : 1;
  return { from: cafeDaysAgo(days - 1, now), to: cafeDaysAgo(0, now) };
}

export function periodText(key: RangeKey, now: number) {
  const b = bounds(key, now);
  const s = new Date(b.start);
  const e = new Date(b.end);
  if (key === "today" || key === "yesterday") return tglPanjang(s);
  return (
    (s.getFullYear() === e.getFullYear()
      ? tgl(s, { day: "numeric", month: "short" })
      : tgl(s)) +
    " – " +
    tgl(e)
  );
}

/* ---------- Labels ---------- */

export const nf = (n: number) => Math.round(n).toLocaleString("id-ID");

export const whereLabel = (t: Pick<OrderDto, "tableNumber">) =>
  t.tableNumber ? "Meja " + t.tableNumber : "Bawa pulang";

export const itemsText = (t: Pick<OrderDto, "items">, x = "×") =>
  t.items.map((i) => `${i.qty}${x} ${i.name}`).join(", ");

export const itemCount = (t: Pick<OrderDto, "items">) =>
  t.items.reduce((a, i) => a + i.qty, 0);

/* ---------- Filtering ---------- */

/** "meja 7" → only tables; "7"/"07" → table 07 or order no. 007; otherwise code, table, menu, customer. */
export function matcher(raw: string): ((t: OrderDto) => boolean) | null {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  const meja = /^meja\s*0*(\d{1,2})$/.exec(q);
  const numQ = /^0*(\d{1,2})$/.exec(q);
  if (meja) return (t) => !!t.tableNumber && +t.tableNumber === +meja[1]!;
  if (numQ)
    return (t) =>
      (!!t.tableNumber && +t.tableNumber === +numQ[1]!) ||
      +t.code.replace(/\D/g, "") === +numQ[1]!;
  return (t) =>
    t.code.toLowerCase().includes(q) ||
    (t.tableNumber
      ? ("meja " + t.tableNumber).includes(q)
      : "bawa pulang".includes(q)) ||
    t.items.some((i) => i.name.toLowerCase().includes(q)) ||
    (t.customerName ?? "").toLowerCase().includes(q);
}

/** Narrows the loaded range (only `f.range`'s days) by the other filters. */
export function filterTransactions(all: OrderDto[], f: RiwayatFilters) {
  const m = matcher(f.q);
  return all.filter(
    (t) =>
      (!f.method || t.paymentMethod === f.method) &&
      (!f.source || t.orderType === f.source) &&
      (!f.status || t.status === f.status) &&
      (!f.cashier || t.cashierName === f.cashier) &&
      (!m || m(t)),
  );
}

export const activeKeys = (f: RiwayatFilters) =>
  FILTER_KEYS.filter((k) => f[k]);

export const isDirty = (f: RiwayatFilters) =>
  f.range !== DEFAULT_FILTERS.range || !!f.q.trim() || activeKeys(f).length > 0;

export function cashierNames(all: OrderDto[]) {
  return [
    ...new Set(all.map((t) => t.cashierName).filter((n): n is string => !!n)),
  ].sort((a, b) => a.localeCompare(b, "id"));
}

/* ---------- Aggregates ---------- */

export function metrics(list: OrderDto[]) {
  const done = list.filter((t) => t.status === "SELESAI");
  const rev = done.reduce((a, t) => a + t.totalAmount, 0);
  const part = (m: PaymentMethod) => {
    const a = done.filter((t) => t.paymentMethod === m);
    return { n: a.length, amt: a.reduce((s, t) => s + t.totalAmount, 0) };
  };
  return {
    done: done.length,
    voids: list.length - done.length,
    rev,
    cash: part("CASH"),
    non: part("NON_CASH"),
    pct: (x: number) => (rev ? Math.round((x / rev) * 100) + "%" : "0%"),
  };
}

export type DayTotals = { n: number; rev: number; voids: number };

/** Per-day totals over the WHOLE filtered list (not only the rows shown). */
export function dayTotals(list: OrderDto[]) {
  const days = new Map<number, DayTotals>();
  for (const t of list) {
    const k = sod(t.createdAt);
    const o = days.get(k) ?? { n: 0, rev: 0, voids: 0 };
    if (t.status === "SELESAI") {
      o.n++;
      o.rev += t.totalAmount;
    } else o.voids++;
    days.set(k, o);
  }
  return days;
}

/** Consecutive rows of the same day (list is newest first). */
export function groupByDay(rows: OrderDto[]) {
  const groups: { k: number; rows: OrderDto[] }[] = [];
  for (const t of rows) {
    const k = sod(t.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.k === k) last.rows.push(t);
    else groups.push({ k, rows: [t] });
  }
  return groups;
}

/** Day group heading: bold part + the rest. */
export function dayLabel(dayStart: number, now: number): [string, string] {
  const today = sod(now);
  const d = new Date(dayStart);
  if (dayStart === today) return ["Hari ini", tglPanjang(d)];
  if (dayStart === addDays(today, -1)) return ["Kemarin", tglPanjang(d)];
  return [
    tgl(d, { weekday: "long" }),
    tgl(d, { day: "numeric", month: "long", year: "numeric" }),
  ];
}

/* ---------- Detail ---------- */

/** Timeline times, clamped between ordering and now. */
export function trail(t: OrderDto, now: number) {
  const c = Date.parse(t.createdAt);
  const clamp = (v: string | null) =>
    v ? Math.min(Math.max(Date.parse(v), c), now) : null;
  return {
    paid: t.paymentStatus === "LUNAS" ? clamp(t.paidAt) : null,
    end: clamp(t.completedAt),
    reason: t.cancelReason,
  };
}

export function payDetail(t: OrderDto, withMethod = true) {
  const amt = t.paidAmount || t.totalAmount;
  if (t.paymentMethod === "CASH")
    return (
      (withMethod ? "Tunai · " : "") +
      (amt > t.totalAmount
        ? `diterima ${rp(amt)}, kembali ${rp(amt - t.totalAmount)}`
        : `uang pas ${rp(amt)}`)
    );
  return withMethod
    ? `Non-tunai${t.paymentChannel ? " · " + t.paymentChannel : ""} · ${rp(t.totalAmount)}`
    : `${rp(t.totalAmount)} lewat ${t.paymentChannel || "pembayaran non-tunai"}`;
}

export const minsBetween = (a: number, b: number) =>
  Math.max(0, Math.round((b - a) / 60000));

/* ---------- CSV ---------- */

export function csvRows(list: OrderDto[]) {
  return [
    [
      "Tanggal",
      "Jam",
      "No. Pesanan",
      "Sumber",
      "Meja",
      "Pelanggan",
      "Item",
      "Subtotal",
      "Pajak",
      "Total",
      "Metode",
      "Kanal",
      "Kasir",
      "Status",
      "Alasan batal",
    ],
    ...list
      .slice()
      .reverse()
      .map((t) => [
        tgl(t.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" }),
        hhmm(t.createdAt),
        t.code,
        SOURCE[t.orderType],
        whereLabel(t),
        t.customerName ?? "",
        itemsText(t, "x"),
        t.subtotal,
        t.tax,
        t.totalAmount,
        t.paymentMethod ? PAY_METHOD[t.paymentMethod] : "-",
        t.paymentChannel ?? "",
        t.cashierName || "-",
        ORDER_STATUS[t.status].label,
        t.status === "DIBATALKAN" ? (t.cancelReason ?? "") : "",
      ]),
  ];
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
