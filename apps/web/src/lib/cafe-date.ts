// The cafe's calendar (Asia/Jakarta), matching the API's "today" and report
// dates whatever time zone this browser or server runs in.
const CAFE_TIME_ZONE = "Asia/Jakarta";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAFE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" of `at` in the cafe's time zone. */
export const cafeDate = (at: Date | number = Date.now()) =>
  dayFormat.format(at);

/** The cafe date `days` days before today. */
export function cafeDaysAgo(days: number, now: Date | number = Date.now()) {
  const d = new Date(`${cafeDate(now)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
