import type {
  CafeSettingsDto,
  IngredientDto,
  OrderStatus,
  PaymentMethod,
  StaffRole,
  StockStatus,
  StockUnit,
} from "./types";

// Pure business rules and formatting shared by both frontends (and the API
// later). No browser- or Node-only code here.

export const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: "Pemilik",
  CASHIER: "Kasir",
};

/** Status label and .l-staf-chip data-tone, as in the DesainPakeAI pages. */
export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; tone: "accent" | "plain" | "positive" | "danger" }
> = {
  MENUNGGU: { label: "Baru", tone: "accent" },
  DIPROSES: { label: "Diproses", tone: "plain" },
  SIAP: { label: "Siap", tone: "positive" },
  DIANTAR: { label: "Diantar", tone: "plain" },
  SELESAI: { label: "Selesai", tone: "positive" },
  DIBATALKAN: { label: "Dibatalkan", tone: "danger" },
};

/** Kasir board flow; DIANTAR + paid becomes SELESAI. */
export const ORDER_FLOW: OrderStatus[] = [
  "MENUNGGU",
  "DIPROSES",
  "SIAP",
  "DIANTAR",
  "SELESAI",
];

export const PAY_METHOD: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  NON_CASH: "Non-tunai",
};

export const STOCK_BADGE: Record<
  StockStatus,
  { tone: "positive" | "warning" | "danger"; label: string }
> = {
  AMAN: { tone: "positive", label: "Aman" },
  MENIPIS: { tone: "warning", label: "Menipis" },
  HABIS: { tone: "danger", label: "Habis" },
};

/**
 * The cafe's local time zone. "Today", opening hours, and order numbers use
 * it, whatever time zone the server or the customer's phone is set to.
 */
export const CAFE_TIME_ZONE = "Asia/Jakarta";

const clockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: CAFE_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const MONDAY_FIRST: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Weekday (0 = Monday, like settings.hours) and minutes since midnight of `at` in the cafe. */
export function cafeClock(at: Date = new Date()) {
  const part: Record<string, string> = {};
  for (const p of clockFormat.formatToParts(at)) part[p.type] = p.value;
  return {
    day: MONDAY_FIRST[part.weekday ?? ""] ?? 0,
    mins: Number(part.hour) * 60 + Number(part.minute),
  };
}

/** Is the cafe open at `at` according to its weekly hours, in cafe time? */
export function isOpenAt(
  settings: Pick<CafeSettingsDto, "hours">,
  at: Date = new Date(),
) {
  const { day: weekday, mins } = cafeClock(at);
  const day = settings.hours[weekday];
  if (!day?.open || !day.from || !day.to) return false;
  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const from = toMins(day.from);
  const to = toMins(day.to);
  // Closing after midnight (e.g. 18:00–02:00).
  return to > from ? mins >= from && mins < to : mins >= from || mins < to;
}

export function stockStatus(ing: Pick<IngredientDto, "stockQty" | "minStock">) {
  if (ing.stockQty <= 0) return "HABIS" satisfies StockStatus;
  if (ing.stockQty <= ing.minStock) return "MENIPIS" satisfies StockStatus;
  return "AMAN" satisfies StockStatus;
}

export type OrderTotals = {
  subtotal: number;
  tax: number;
  service: number;
  total: number;
  count: number;
};

/** Subtotal, tax, service charge, and total for items `{ price, qty }`. */
export function orderTotals(
  items: { price: number; qty: number }[],
  settings: Pick<
    CafeSettingsDto,
    "taxPercent" | "servicePercent" | "taxInclusive"
  >,
): OrderTotals {
  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const count = items.reduce((a, i) => a + i.qty, 0);
  const service = Math.round((subtotal * settings.servicePercent) / 100);
  if (settings.taxInclusive) {
    // Prices already contain tax: show the included part, do not add it.
    const base = subtotal + service;
    const tax = Math.round(base - base / (1 + settings.taxPercent / 100));
    return { subtotal, tax, service, total: base, count };
  }
  const tax = Math.round((subtotal * settings.taxPercent) / 100);
  return { subtotal, tax, service, total: subtotal + tax + service, count };
}

/* ---------- API error copy ---------- */

// The API's generic errors (sign-in, permissions, validation, request body,
// server failures) carry the starter's English text, while the cafe's own
// errors are already Indonesian. Both frontends show the copy below instead,
// keyed by the error code, so cashiers and customers never see English.

const GENERIC: Record<string, string> = {
  VALIDATION_ERROR:
    "Data yang dikirim belum sesuai. Periksa lagi isiannya, lalu coba lagi.",
  UNAUTHORIZED: "Sesi kamu sudah berakhir. Silakan masuk lagi.",
  FORBIDDEN:
    "Akun kamu belum punya izin untuk tindakan ini. Minta pemilik mengaturnya di Akun & Staf.",
  FORBIDDEN_ORIGIN:
    "Permintaan ditolak karena asal halamannya tidak dikenal. Muat ulang halaman, lalu coba lagi.",
  INVALID_JSON: "Data yang dikirim rusak. Muat ulang halaman, lalu coba lagi.",
  UNSUPPORTED_MEDIA_TYPE:
    "Data yang dikirim rusak. Muat ulang halaman, lalu coba lagi.",
  LENGTH_REQUIRED:
    "Data yang dikirim rusak. Muat ulang halaman, lalu coba lagi.",
  PAYLOAD_TOO_LARGE:
    "Data terlalu besar untuk dikirim. Kurangi isinya, lalu coba lagi.",
  INTERNAL_ERROR: "Terjadi kesalahan di server. Coba lagi sebentar lagi.",
};

export const NETWORK_ERROR_MESSAGE =
  "Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi.";

/** The message to show for a failed API call, always in Indonesian. */
export function apiErrorMessage(
  status: number,
  code: string | undefined,
  message: string | undefined,
) {
  if (code && Object.hasOwn(GENERIC, code)) return GENERIC[code]!;
  // Unknown API paths; "Pesanan tidak ditemukan." and the like stay as sent.
  if (code === "NOT_FOUND" && message === "Route not found.")
    return "Alamat tidak ditemukan. Muat ulang halaman, lalu coba lagi.";
  return message || `Permintaan gagal (kode ${status}). Coba lagi.`;
}

/* ---------- Formatting (id-ID) ---------- */

export const rp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

export const rpShort = (n: number) =>
  n >= 1e6
    ? "Rp " +
      (n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 }) +
      " jt"
    : n >= 1e3
      ? "Rp " + Math.round(n / 1e3) + " rb"
      : rp(n);

export const num = (n: number) => Math.round(n).toLocaleString("id-ID");

export const hhmm = (d: string | number | Date) =>
  new Date(d).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const tgl = (
  d: string | number | Date,
  opt: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
) => new Date(d).toLocaleDateString("id-ID", opt);

export const tglPanjang = (d: string | number | Date) =>
  new Date(d).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const minsSince = (d: string | number | Date, now = Date.now()) =>
  Math.max(0, Math.floor((now - new Date(d).getTime()) / 60000));

export const ago = (d: string | number | Date, now = Date.now()) => {
  const m = minsSince(d, now);
  if (m < 1) return "baru saja";
  if (m < 60) return m + " mnt lalu";
  if (m < 1440) return Math.floor(m / 60) + " jam lalu";
  return Math.floor(m / 1440) + " hari lalu";
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const UNIT_SHORT: Record<StockUnit, string> = {
  gram: "g",
  ml: "ml",
  pcs: "pcs",
  botol: "botol",
};

/** 1850 gram → "1,85 kg", 4200 ml → "4,2 L". */
export function fmtQty(q: number, unit: StockUnit) {
  const n = (v: number) =>
    v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  if (unit === "gram" && Math.abs(q) >= 1000) return n(q / 1000) + " kg";
  if (unit === "ml" && Math.abs(q) >= 1000) return n(q / 1000) + " L";
  return n(q) + " " + (UNIT_SHORT[unit] ?? unit);
}

/** Order number shown to customers and cashiers, e.g. 27 → "A-027". */
export const orderCode = (seq: number) => "A-" + String(seq).padStart(3, "0");

/** Deterministic RNG (mulberry32) so sample data is stable across reloads. */
export function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
