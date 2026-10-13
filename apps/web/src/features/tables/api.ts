import type { TableDto } from "@starter/shared/fnb/types";
import type { DataResponse } from "@starter/shared/types";
import { apiFetch } from "@/lib/api/client";

// /api/tables. Which QR cards still need printing is device-local.

const path = (id: string) => `/api/tables/${encodeURIComponent(id)}`;

export async function listTables() {
  return (await apiFetch<DataResponse<TableDto[]>>("/api/tables")).data;
}

/** "7" → "07", " a 1 " → "A1" (the design's table-number rule). */
export function normTableNo(v: string) {
  let s = v.trim().toUpperCase().replace(/\s+/g, "");
  if (/^\d+$/.test(s)) s = String(parseInt(s, 10)).padStart(2, "0");
  return s;
}

export const isValidTableNo = (no: string) => /^[A-Z0-9-]{1,6}$/.test(no);

/** Validation message for a new table number, or "" when valid. */
export function tableNoError(
  no: string,
  tables: Pick<TableDto, "tableNumber">[],
) {
  if (!no) return "Nomor meja wajib diisi.";
  if (!isValidTableNo(no))
    return "Pakai huruf, angka, atau tanda “-”, maksimal 6 karakter.";
  if (/^0+$/.test(no)) return "Nomor meja tidak boleh 0.";
  if (tables.some((t) => t.tableNumber.toUpperCase() === no))
    return `Meja ${no} sudah ada. Pakai nomor lain.`;
  return "";
}

/* Tables whose QR changed and has not been printed yet ("Belum dicetak"),
   remembered in this browser. */
const UNPRINTED = "iulfnb:unprinted-tables";

function readUnprinted(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(UNPRINTED) ?? "[]");
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function writeUnprinted(ids: string[]) {
  const list = [...new Set(ids)];
  try {
    localStorage.setItem(UNPRINTED, JSON.stringify(list));
  } catch {
    /* storage blocked: the badge resets on reload */
  }
  return list;
}

export async function listUnprintedTableIds() {
  return readUnprinted();
}

/** POST /api/tables { tableNumber, area } → unique QR token. */
export async function createTable(input: {
  tableNumber: string;
  area: string;
}) {
  const { data: table } = await apiFetch<DataResponse<TableDto>>(
    "/api/tables",
    {
      method: "POST",
      body: {
        tableNumber: normTableNo(input.tableNumber),
        area: input.area.trim() || "Dalam",
      },
    },
  );
  writeUnprinted([...readUnprinted(), table.id]);
  return table;
}

/** PATCH /api/tables/:id { isActive } */
export async function setTableActive({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const res = await apiFetch<DataResponse<TableDto>>(path(id), {
    method: "PATCH",
    body: { isActive },
  });
  return res.data;
}

/** The old QR stops working immediately. POST /api/tables/:id/regenerate-qr */
export async function regenerateTableQr(id: string) {
  const res = await apiFetch<DataResponse<TableDto>>(
    `${path(id)}/regenerate-qr`,
    { method: "POST" },
  );
  writeUnprinted([...readUnprinted(), id]);
  return res.data;
}

export async function markTablesPrinted(ids: string[]) {
  return writeUnprinted(readUnprinted().filter((id) => !ids.includes(id)));
}
