import { randomBytes } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import type { TableDto } from "@starter/shared/fnb/types";
import type { PublicTableDto } from "@starter/shared/fnb/api";
import type {
  CreateTableInput,
  UpdateTableInput,
} from "@starter/shared/validators/fnb/tables";
import { db, type DbOrTx } from "../db";
import { cafeTables } from "../db/schema";
import { notFound, uniqueOr409 } from "../lib/fnb";

const fields = {
  id: cafeTables.id,
  tableNumber: cafeTables.tableNumber,
  qrCode: cafeTables.qrCode,
  area: cafeTables.area,
  isActive: cafeTables.isActive,
};

/** A fresh, unguessable QR token such as "ks-9f3a1c2b7d". */
const newQrCode = () => "ks-" + randomBytes(5).toString("hex");

const DUPLICATE = "Nomor meja sudah dipakai.";

export async function listTables(): Promise<TableDto[]> {
  const rows = await db.select(fields).from(cafeTables);
  return rows.sort((a, b) =>
    a.tableNumber.localeCompare(b.tableNumber, "id", { numeric: true }),
  );
}

export async function createTable(input: CreateTableInput) {
  const [row] = await uniqueOr409(
    () =>
      db
        .insert(cafeTables)
        .values({ ...input, qrCode: newQrCode() })
        .returning(fields),
    DUPLICATE,
  );
  return row!;
}

export async function updateTable(id: string, input: UpdateTableInput) {
  const [row] = await uniqueOr409(
    () =>
      db
        .update(cafeTables)
        .set(input)
        .where(eq(cafeTables.id, id))
        .returning(fields),
    DUPLICATE,
  );
  if (!row) throw notFound("Meja");
  return row;
}

/** Prints a new QR: the old token stops working immediately. */
export async function regenerateQrCode(id: string) {
  const [row] = await db
    .update(cafeTables)
    .set({ qrCode: newQrCode() })
    .where(eq(cafeTables.id, id))
    .returning(fields);
  if (!row) throw notFound("Meja");
  return row;
}

/** Past orders keep their copied table number. */
export async function deleteTable(id: string) {
  const [row] = await db
    .delete(cafeTables)
    .where(eq(cafeTables.id, id))
    .returning({ id: cafeTables.id });
  if (!row) throw notFound("Meja");
}

/**
 * The active table behind a scanned QR. Accepts the QR token or, while the
 * printed codes carry `?meja=<number>`, the table number.
 */
export async function findActiveTable(code: string, conn: DbOrTx = db) {
  const number = /^\d$/.test(code) ? code.padStart(2, "0") : code.toUpperCase();
  const [row] = await conn
    .select(fields)
    .from(cafeTables)
    .where(
      and(
        eq(cafeTables.isActive, true),
        or(eq(cafeTables.qrCode, code), eq(cafeTables.tableNumber, number)),
      ),
    )
    .limit(1);
  return row;
}

export async function getPublicTable(code: string): Promise<PublicTableDto> {
  const table = await findActiveTable(code);
  if (!table) throw notFound("Meja");
  return { tableNumber: table.tableNumber, area: table.area };
}
