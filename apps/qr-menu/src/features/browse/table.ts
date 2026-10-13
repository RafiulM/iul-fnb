import { getTable } from "@/features/catalog/api";
import { ApiError } from "@/lib/api";
import {
  readSession,
  emptySession,
  writeSession,
} from "@/features/session/store";
import { browseState } from "./state";

// Table from the QR URL (design: normTable / applyUrlTable).

/** Table shown when the phone has no session and no ?meja (design custEmpty("07")). */
export const DEFAULT_TABLE = "07";

/** "7" → "07"; other input (a QR token) is reduced to a short safe token. */
export function normTable(raw: unknown) {
  const s = String(raw ?? "")
    .trim()
    .slice(0, 64);
  return /^\d{1,3}$/.test(s)
    ? String(Number(s)).padStart(2, "0")
    : s.replace(/[^\w-]/g, "").slice(0, 32);
}

/**
 * Apply ?meja= (a table number or QR token) to the customer session, checked
 * with the API. Returns false when the table is unknown or inactive
 * (session.invalidTable is set for the "QR tidak valid" screen). A different
 * table than the session starts a new session.
 */
export async function applyUrlTable(raw: unknown) {
  let s = readSession();
  if (raw == null && s.table) return true;
  const code = raw == null ? DEFAULT_TABLE : normTable(raw);
  let tableNumber: string;
  try {
    if (!code) throw new ApiError(404, "NOT_FOUND", "");
    ({ tableNumber } = await getTable(code));
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) throw err;
    // A table number is short (≤ 6 chars); a QR token is not shown.
    const shown = /^[\w-]{1,6}$/.test(code) ? code.toUpperCase() : "?";
    writeSession({ ...s, invalidTable: shown });
    return false;
  }
  if (tableNumber !== s.table) {
    const had = s.cart.length > 0 || s.order != null;
    s = emptySession(tableNumber, code); // another table's QR → new session
    if (had)
      browseState.notice = `Meja ${tableNumber} · sesi pesanan baru dimulai`;
  }
  writeSession({ ...s, qr: code, invalidTable: null });
  return true;
}
