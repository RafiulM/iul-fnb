import { isOpenAt } from "@starter/shared/fnb/domain";
import type { CafeSettingsDto } from "@starter/shared/fnb/types";
import type { CustomerSession } from "@/features/session/store";

// Opening-hours copy for the customer screens (design: nextOpenLabel, dot).

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

type Hours = Pick<CafeSettingsDto, "hours">;

/** "08:00" → "08.00" */
export const dot = (hhmm: string) => hhmm.replace(":", ".");

/** The opening hours of `d`'s weekday (settings.hours is Monday-first). */
export const hoursOn = (settings: Hours, d: Date) =>
  settings.hours[(d.getDay() + 6) % 7];

/** When the cafe opens again: "pukul 08.00" (today), "besok pukul 08.00", or "Senin pukul 08.00". */
export function nextOpenLabel(settings: Hours, now = new Date()) {
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const h = hoursOn(settings, d);
    if (!h?.open || !h.from) continue;
    const [hh, mm] = h.from.split(":").map(Number);
    d.setHours(hh ?? 0, mm ?? 0, 0, 0);
    if (d > now)
      return `${i === 0 ? "" : i === 1 ? "besok " : DAYS[d.getDay()] + " "}pukul ${dot(h.from)}`;
  }
  return "pukul 08.00";
}

/** Ordering is off: browse-only mode, or outside opening hours without the prototype override. */
export const orderingBlocked = (
  session: Pick<CustomerSession, "browseOnly" | "forceOpen">,
  settings: Hours,
  now = new Date(),
) => session.browseOnly || (!isOpenAt(settings, now) && !session.forceOpen);

/** Outside opening hours and not browse-only / forced open → the "Kafe Tutup" screen. */
export const mustClose = (
  session: Pick<CustomerSession, "browseOnly" | "forceOpen">,
  settings: Hours,
  now = new Date(),
) => !isOpenAt(settings, now) && !session.forceOpen && !session.browseOnly;
