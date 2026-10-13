import { z } from "zod";

// Safe for the browser bundle. VITE_API_URL is inlined at build time, so a
// production image must be built with the API's public origin.
const apiUrl = z
  .url("Set VITE_API_URL to the API's origin, e.g. http://localhost:4000.")
  .parse(import.meta.env.VITE_API_URL ?? "http://localhost:4000");

// The API origin the browser calls (Better Auth + application routes).
export const API_URL = new URL(apiUrl).origin;

// Public origin of the customer QR Menu app (table QR codes point here).
export const QR_MENU_URL = new URL(
  z
    .url(
      "Set VITE_QR_MENU_URL to the QR Menu app's origin, e.g. http://localhost:3001.",
    )
    .parse(import.meta.env.VITE_QR_MENU_URL ?? "http://localhost:3001"),
).origin;

/**
 * Link to the customer menu of a table: ?meja=<code>. Printed QR cards use
 * the table's unguessable token (`qrCode`), so "Buat ulang QR" retires old
 * cards; previews may pass the table number, which the API also accepts.
 */
export const tableMenuUrl = (code: string) =>
  `${QR_MENU_URL}/?meja=${encodeURIComponent(code)}`;
