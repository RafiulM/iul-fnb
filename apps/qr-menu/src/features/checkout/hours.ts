import { isOpenAt } from "@starter/shared/fnb/domain";
import type { CafeSettingsDto } from "@starter/shared/fnb/types";

// Opening-hours helpers for the customer screens, ported from the design's
// pelanggan pages (HOURS, nextOpenLabel, plan). The design keys hours by JS
// weekday (0 = Minggu); settings.hours is Monday-first, so map through hoursOn.

type Hours = Pick<CafeSettingsDto, "hours">;
export type Span = [from: string, to: string];

export const DAY = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;
/** Monday first, like the Pengaturan page (values are JS weekdays). */
export const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;

/** Opening span for a JS weekday (0 = Minggu), or null when closed that day. */
export function hoursOn(settings: Hours, jsDay: number): Span | null {
  const d = settings.hours[(jsDay + 6) % 7];
  return d?.open && d.from && d.to ? [d.from, d.to] : null;
}

/** "08:00" → "08.00" */
export const dotT = (t: string) => t.replace(":", ".");
export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
/** "08.00–22.00", or "Tutup" for a closed day. */
export const range = (h: Span | null) =>
  h ? `${dotT(h[0])}–${dotT(h[1])}` : "Tutup";

/** "pukul 08.00" / "besok pukul 08.00" / "Senin pukul 08.00". */
export function nextOpenLabel(settings: Hours, now = new Date()) {
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const h = hoursOn(settings, d.getDay());
    if (!h) continue;
    const m = toMin(h[0]);
    d.setHours(Math.floor(m / 60), m % 60, 0, 0);
    if (d > now)
      return `${i === 0 ? "" : i === 1 ? "besok " : DAY[d.getDay()] + " "}pukul ${dotT(h[0])}`;
  }
  return "pukul 08.00";
}

/** Can the customer send an order right now? */
export const orderingBlocked = (
  settings: Hours,
  session: { browseOnly: boolean; forceOpen: boolean },
  now: Date,
) => session.browseOnly || (!isOpenAt(settings, now) && !session.forceOpen);

/**
 * When the cafe opens next (the tutup page's plan). While the cafe is actually
 * open (canvas preview), it computes as if now = today's closing time.
 */
export function closedPlan(settings: Hours, now = new Date()) {
  const preview = isOpenAt(settings, now);
  const day = now.getDay();
  const today = hoursOn(settings, day);
  const m =
    preview && today ? toMin(today[1]) : now.getHours() * 60 + now.getMinutes();
  let off: number | null = null;
  let time: string | null = null;
  if (today && m < toMin(today[0])) {
    off = 0;
    time = today[0];
  } else {
    for (let k = 1; k <= 7; k++) {
      const h = hoursOn(settings, (day + k) % 7);
      if (h) {
        off = k;
        time = h[0];
        break;
      }
    }
  }
  const phase = !today ? "libur" : m < toMin(today[0]) ? "pagi" : "malam";
  const mins =
    off == null || time == null ? null : off * 1440 + toMin(time) - m;
  return {
    preview,
    day,
    today,
    m,
    phase,
    off,
    nextDay: off == null ? null : (day + off) % 7,
    time,
    mins,
  };
}

/** "12 menit lagi" / "sekitar 1 jam lagi" / "sekitar 9 jam lagi". */
export const rel = (mins: number) =>
  mins < 60
    ? `${Math.max(1, mins)} menit lagi`
    : mins < 90
      ? "sekitar 1 jam lagi"
      : `sekitar ${Math.round(mins / 60)} jam lagi`;
