import { HttpError } from "./http-error";

// The cafe's local time zone. "Today", order numbers (which restart daily),
// and report buckets all use it, whatever the server's own clock zone is.
export const CAFE_TIME_ZONE = "Asia/Jakarta";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAFE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" of `at` in the cafe's time zone. */
export function cafeDate(at: Date = new Date()) {
  return dayFormat.format(at);
}

/** Adds whole days to a "YYYY-MM-DD" date. */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** PostgreSQL error code from a driver error, possibly wrapped by Drizzle. */
export function pgErrorCode(error: unknown): string | undefined {
  const err = error as { code?: unknown; cause?: { code?: unknown } };
  const code = err?.cause?.code ?? err?.code;
  return typeof code === "string" ? code : undefined;
}

/**
 * Runs a write and turns a unique-constraint violation into a 409 with a
 * readable message (e.g. a duplicate menu name).
 */
export async function uniqueOr409<T>(
  write: () => Promise<T>,
  message: string,
): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (pgErrorCode(error) === "23505")
      throw new HttpError(409, "ALREADY_EXISTS", message);
    throw error;
  }
}

export const notFound = (what: string) =>
  new HttpError(404, "NOT_FOUND", `${what} tidak ditemukan.`);
