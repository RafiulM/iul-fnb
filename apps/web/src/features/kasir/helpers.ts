import { minsSince } from "@starter/shared/fnb/domain";
import type { OrderDto, OrderStatus } from "@starter/shared/fnb/types";

// Board rules and labels from design/src/pages/kasir.page.html.

export type BoardLane = {
  key: Extract<OrderStatus, "MENUNGGU" | "DIPROSES" | "SIAP" | "DIANTAR">;
  title: string;
  empty: string;
};

export const LANES: BoardLane[] = [
  { key: "MENUNGGU", title: "Baru masuk", empty: "Belum ada pesanan baru" },
  {
    key: "DIPROSES",
    title: "Diproses",
    empty: "Tidak ada yang sedang dibuat",
  },
  { key: "SIAP", title: "Siap diantar", empty: "Belum ada pesanan siap" },
  {
    key: "DIANTAR",
    title: "Diantar · belum bayar",
    empty: "Semua pesanan sudah lunas",
  },
];

export const STEP_LABEL = ["Baru", "Diproses", "Siap", "Diantar", "Selesai"];

export const CANCEL_REASONS = [
  "Pelanggan batal",
  "Menu habis",
  "Pesanan ganda",
  "Salah input",
];

export type TypeFilter = "ALL" | "QR" | "MANUAL";

export const TYPE_TABS: [TypeFilter, string][] = [
  ["ALL", "Semua"],
  ["QR", "QR meja"],
  ["MANUAL", "Kasir"],
];

export const isActive = (o: OrderDto) =>
  o.status !== "SELESAI" && o.status !== "DIBATALKAN";

export const whereLabel = (o: OrderDto) =>
  o.tableNumber ? "Meja " + o.tableNumber : "Bawa pulang";

export const srcLabel = (o: OrderDto) =>
  o.orderType === "QR"
    ? "Pesanan QR"
    : "Kasir" + (o.customerName ? " · a.n. " + o.customerName : "");

export const isLate = (o: OrderDto, now: number) =>
  (o.status === "MENUNGGU" && minsSince(o.createdAt, now) >= 5) ||
  (o.status === "DIPROSES" && minsSince(o.createdAt, now) >= 15);

export const shortAgo = (d: string, now: number) => {
  const m = minsSince(d, now);
  if (m < 1) return "Baru";
  if (m < 60) return m + " mnt";
  return Math.floor(m / 60) + " j " + (m % 60) + " m";
};

export type NextAction = { label: string; act: "advance" | "pay" };

export function nextAction(o: OrderDto): NextAction | null {
  if (o.status === "MENUNGGU")
    return { label: "Terima & proses", act: "advance" };
  if (o.status === "DIPROSES") return { label: "Tandai siap", act: "advance" };
  if (o.status === "SIAP")
    return {
      label: o.tableNumber
        ? `Antar ke Meja ${o.tableNumber}`
        : "Serahkan ke pelanggan",
      act: "advance",
    };
  if (o.status === "DIANTAR") return { label: "Terima pembayaran", act: "pay" };
  return null;
}

/** Toast after a board step (the order as returned by advanceOrder). */
export function advanceMessage(o: OrderDto) {
  switch (o.status) {
    case "DIPROSES":
      return `${o.code} diterima — mulai dibuat`;
    case "SIAP":
      return `${o.code} siap — antar ke ${whereLabel(o).toLowerCase()}`;
    case "DIANTAR":
      return `${o.code} sudah diantar — menunggu pembayaran`;
    case "SELESAI":
      return `${o.code} selesai — diantar & lunas`;
    default:
      return "";
  }
}

/** Search over code, "meja 07" / "bawa pulang", customer, and menu names. */
export function matchesQuery(o: OrderDto, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [
    o.code,
    o.tableNumber ? "meja " + o.tableNumber : "bawa pulang",
    o.customerName,
    ...o.items.map((i) => i.name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export const sameDay = (a: string | number | Date, b: string | number | Date) =>
  new Date(a).toDateString() === new Date(b).toDateString();

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

/** Two-tone chime for a new order (Web Audio, no asset). */
export function playChime(ctx: { current: AudioContext | null }) {
  try {
    const Ctor =
      window.AudioContext ??
      (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!Ctor) return;
    const actx = (ctx.current ??= new Ctor());
    if (actx.state === "suspended") void actx.resume();
    [880, 1318].forEach((f, i) => {
      const osc = actx.createOscillator();
      const g = actx.createGain();
      const t = actx.currentTime + i * 0.16;
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      osc.connect(g).connect(actx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {
    /* audio blocked or unsupported */
  }
}
