import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { ORDER_FLOW, orderCode, orderTotals } from "@starter/shared/fnb/domain";
import type {
  OrderItemDto,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from "@starter/shared/fnb/types";
import type { PublicOrderDto, StaffOrderDto } from "@starter/shared/fnb/api";
import type {
  CreateManualOrderInput,
  CreateQrOrderInput,
  ListTransactionsInput,
  PayOrderInput,
} from "@starter/shared/validators/fnb/orders";
import { db, type DbOrTx, type Tx } from "../db";
import {
  cafeTables,
  menus,
  orderCounters,
  orderItems,
  orders,
} from "../db/schema";
import { HttpError } from "../lib/http-error";
import { addDays, cafeDate, notFound } from "../lib/fnb";
import { getSettings } from "./settings.service";
import { deductStockForOrder, type Actor } from "./stock.service";
import { findActiveTable } from "./tables.service";

type OrderRow = typeof orders.$inferSelect;

/** Unconfirmed QR orders a single table may have waiting at once. */
export const MAX_PENDING_PER_TABLE = 5;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

async function loadItems(conn: DbOrTx, orderIds: string[]) {
  const byOrder = new Map<string, OrderItemDto[]>();
  if (!orderIds.length) return byOrder;
  const rows = await conn
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(asc(orderItems.orderId), asc(orderItems.position));
  for (const r of rows) {
    const list = byOrder.get(r.orderId) ?? [];
    list.push({
      id: r.id,
      // A deleted menu leaves an empty id; the copied name stays.
      menuId: r.menuId ?? "",
      name: r.name,
      imageUrl: r.imageUrl,
      qty: r.qty,
      note: r.note,
      price: r.price,
    });
    byOrder.set(r.orderId, list);
  }
  return byOrder;
}

function toStaffDto(row: OrderRow, items: OrderItemDto[]): StaffOrderDto {
  return {
    id: row.id,
    code: row.code,
    tableId: row.tableId,
    tableNumber: row.tableNumber,
    orderType: row.orderType as OrderType,
    status: row.status as OrderStatus,
    customerName: row.customerName,
    items,
    subtotal: row.subtotal,
    tax: row.tax,
    service: row.service,
    totalAmount: row.totalAmount,
    paymentStatus: row.paymentStatus as PaymentStatus,
    paymentMethod: row.paymentMethod as PaymentMethod | null,
    paymentChannel: row.paymentChannel,
    paidAmount: row.paidAmount,
    cancelReason: row.cancelReason,
    cashierName: row.cashierName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    paidAt: iso(row.paidAt),
    completedAt: iso(row.completedAt),
    timeline: {
      createdAt: row.createdAt.toISOString(),
      acceptedAt: iso(row.acceptedAt),
      readyAt: iso(row.readyAt),
      deliveredAt: iso(row.deliveredAt),
      completedAt: row.status === "SELESAI" ? iso(row.completedAt) : null,
      cancelledAt: row.status === "DIBATALKAN" ? iso(row.completedAt) : null,
    },
  };
}

function toPublicDto(order: StaffOrderDto): PublicOrderDto {
  return {
    id: order.id,
    code: order.code,
    tableNumber: order.tableNumber,
    status: order.status,
    items: order.items,
    subtotal: order.subtotal,
    tax: order.tax,
    service: order.service,
    totalAmount: order.totalAmount,
    paymentStatus: order.paymentStatus,
    cancelReason: order.cancelReason,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    timeline: order.timeline,
  };
}

async function withItems(conn: DbOrTx, rows: OrderRow[]) {
  const items = await loadItems(
    conn,
    rows.map((r) => r.id),
  );
  return rows.map((r) => toStaffDto(r, items.get(r.id) ?? []));
}

/* ---------- Creating orders ---------- */

type NewOrder = {
  orderType: OrderType;
  status: "MENUNGGU" | "DIPROSES";
  table: { id: string; tableNumber: string } | null;
  customerName: string | null;
  cashier: Actor | null;
  items: { menuId: string; qty: number; note: string }[];
};

/** Prices come from the menu, totals from the cafe settings: never the client. */
async function insertOrder(tx: Tx, init: NewOrder) {
  const ids = [...new Set(init.items.map((i) => i.menuId))];
  const found = await tx
    .select({
      id: menus.id,
      name: menus.name,
      price: menus.price,
      imageUrl: menus.imageUrl,
      isAvailable: menus.isAvailable,
    })
    .from(menus)
    .where(inArray(menus.id, ids));
  const byId = new Map(found.map((m) => [m.id, m]));
  const lines = init.items.map((i, position) => {
    const menu = byId.get(i.menuId);
    if (!menu)
      throw new HttpError(422, "MENU_NOT_FOUND", "Menu tidak ditemukan.");
    if (!menu.isAvailable)
      throw new HttpError(
        409,
        "MENU_UNAVAILABLE",
        `${menu.name} sedang habis.`,
      );
    return {
      menuId: menu.id,
      name: menu.name,
      imageUrl: menu.imageUrl,
      price: menu.price,
      qty: i.qty,
      note: i.note,
      position,
    };
  });

  const settings = await getSettings(tx);
  const totals = orderTotals(lines, settings);

  const businessDate = cafeDate();
  const [counter] = await tx
    .insert(orderCounters)
    .values({ businessDate, lastSeq: 1 })
    .onConflictDoUpdate({
      target: orderCounters.businessDate,
      set: { lastSeq: sql`${orderCounters.lastSeq} + 1` },
    })
    .returning({ seq: orderCounters.lastSeq });
  const seq = counter!.seq;

  const now = new Date();
  const [row] = await tx
    .insert(orders)
    .values({
      code: orderCode(seq),
      businessDate,
      seq,
      tableId: init.table?.id ?? null,
      tableNumber: init.table?.tableNumber ?? null,
      orderType: init.orderType,
      status: init.status,
      customerName: init.customerName,
      subtotal: totals.subtotal,
      tax: totals.tax,
      service: totals.service,
      totalAmount: totals.total,
      cashierId: init.cashier?.id ?? null,
      cashierName: init.cashier?.name ?? null,
      createdAt: now,
      updatedAt: now,
      acceptedAt: init.status === "DIPROSES" ? now : null,
    })
    .returning();
  await tx
    .insert(orderItems)
    .values(lines.map((l) => ({ ...l, orderId: row!.id })));
  const [dto] = await withItems(tx, [row!]);
  return dto!;
}

/** A customer's order from a table QR; waits for the cashier (MENUNGGU). */
export async function createQrOrder(input: CreateQrOrderInput) {
  return db.transaction(async (tx) => {
    const table = await findActiveTable(input.qrCode, tx);
    if (!table)
      throw new HttpError(
        404,
        "TABLE_NOT_FOUND",
        "Meja tidak ditemukan atau sedang tidak aktif. Minta bantuan kasir.",
      );
    // Lock the table row so parallel submits count each other.
    await tx
      .select({ id: cafeTables.id })
      .from(cafeTables)
      .where(eq(cafeTables.id, table.id))
      .for("update");
    const [{ pending } = { pending: 0 }] = await tx
      .select({ pending: count() })
      .from(orders)
      .where(and(eq(orders.tableId, table.id), eq(orders.status, "MENUNGGU")));
    if (pending >= MAX_PENDING_PER_TABLE)
      throw new HttpError(
        429,
        "TOO_MANY_PENDING_ORDERS",
        "Masih ada pesanan meja ini yang menunggu kasir. Tunggu sebentar atau panggil kasir.",
      );
    const order = await insertOrder(tx, {
      orderType: "QR",
      status: "MENUNGGU",
      table,
      customerName: null,
      cashier: null,
      items: input.items,
    });
    return toPublicDto(order);
  });
}

/** A walk-in order recorded by the cashier; it starts at DIPROSES. */
export async function createManualOrder(
  input: CreateManualOrderInput,
  cashier: Actor,
) {
  return db.transaction(async (tx) => {
    let table: NewOrder["table"] = null;
    if (input.tableId) {
      const [row] = await tx
        .select({ id: cafeTables.id, tableNumber: cafeTables.tableNumber })
        .from(cafeTables)
        .where(eq(cafeTables.id, input.tableId));
      if (!row)
        throw new HttpError(422, "TABLE_NOT_FOUND", "Meja tidak ditemukan.");
      table = row;
    }
    return insertOrder(tx, {
      orderType: "MANUAL",
      status: "DIPROSES",
      table,
      customerName: input.customerName,
      cashier,
      items: input.items,
    });
  });
}

/* ---------- Reading orders ---------- */

/** Every order of one cafe-local day, oldest first (the cashier board). */
export async function listOrdersOfDay(date: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.businessDate, date))
    .orderBy(asc(orders.createdAt), asc(orders.seq));
  return withItems(db, rows);
}

/** An order by id, or by today's code such as "A-027". */
const byRef = (ref: string) =>
  or(
    eq(orders.id, ref),
    and(eq(orders.code, ref), eq(orders.businessDate, cafeDate())),
  );

async function findRow(conn: DbOrTx, ref: string, lock = false) {
  const query = conn.select().from(orders).where(byRef(ref)).limit(1);
  const [row] = await (lock ? query.for("update") : query);
  if (!row) throw notFound("Pesanan");
  return row;
}

export async function getOrder(ref: string) {
  const [dto] = await withItems(db, [await findRow(db, ref)]);
  return dto!;
}

/** Customer tracking: only by the order's unguessable id. */
export async function getPublicOrder(id: string) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id));
  if (!row) throw notFound("Pesanan");
  const [dto] = await withItems(db, [row]);
  return toPublicDto(dto!);
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

/** Finished and cancelled orders, newest first. */
export async function listTransactions(input: ListTransactionsInput) {
  const conditions: (SQL | undefined)[] = [
    input.status
      ? eq(orders.status, input.status)
      : inArray(orders.status, ["SELESAI", "DIBATALKAN"]),
    input.from ? gte(orders.businessDate, input.from) : undefined,
    input.to ? lte(orders.businessDate, input.to) : undefined,
    input.method ? eq(orders.paymentMethod, input.method) : undefined,
    input.type ? eq(orders.orderType, input.type) : undefined,
  ];
  if (input.q) {
    const term = `%${escapeLike(input.q)}%`;
    const table = input.q.replace(/^meja\s*/i, "");
    conditions.push(
      or(
        ilike(orders.code, term),
        ilike(orders.customerName, term),
        ilike(orders.cashierName, term),
        eq(
          orders.tableNumber,
          /^\d$/.test(table) ? table.padStart(2, "0") : table.toUpperCase(),
        ),
        sql`EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = "orders"."id" AND oi.name ILIKE ${term})`,
      ),
    );
  }
  const rows = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(input.limit + 1)
    .offset(input.offset);
  return {
    data: await withItems(db, rows.slice(0, input.limit)),
    meta: {
      limit: input.limit,
      offset: input.offset,
      hasMore: rows.length > input.limit,
    },
  };
}

/** Best sellers over the last 7 cafe days, for the customer menu. */
export async function popularMenuIds(limit = 4) {
  const rows = await db
    .select({
      menuId: orderItems.menuId,
      qty: sql<number>`sum(${orderItems.qty})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(menus, eq(menus.id, orderItems.menuId))
    .where(
      and(
        ne(orders.status, "DIBATALKAN"),
        gte(orders.businessDate, addDays(cafeDate(), -6)),
      ),
    )
    .groupBy(orderItems.menuId)
    .orderBy(desc(sql`sum(${orderItems.qty})`), asc(orderItems.menuId))
    .limit(limit);
  return rows.flatMap((r) => (r.menuId ? [r.menuId] : []));
}

/* ---------- Changing orders ---------- */

const CLOSED: string[] = ["SELESAI", "DIBATALKAN"];

/** SELESAI: stamps it and deducts the recipe stock exactly once. */
async function complete(tx: Tx, row: OrderRow, actor: Actor | null) {
  const now = new Date();
  const [done] = await tx
    .update(orders)
    .set({ status: "SELESAI", completedAt: now, stockDeductedAt: now })
    .where(eq(orders.id, row.id))
    .returning();
  if (!row.stockDeductedAt) {
    const items = await loadItems(tx, [row.id]);
    await deductStockForOrder(
      tx,
      {
        id: row.id,
        code: row.code,
        items: (items.get(row.id) ?? []).map((i) => ({
          menuId: i.menuId || null,
          name: i.name,
          qty: i.qty,
        })),
      },
      actor,
    );
  }
  return done!;
}

const STEP_STAMP = {
  DIPROSES: "acceptedAt",
  SIAP: "readyAt",
  DIANTAR: "deliveredAt",
} as const;

/**
 * Next step on the board: MENUNGGU → DIPROSES → SIAP → DIANTAR. A paid order
 * that reaches DIANTAR is finished (SELESAI); an unpaid one waits for payment.
 */
export async function advanceOrder(ref: string, actor: Actor) {
  return db.transaction(async (tx) => {
    let row = await findRow(tx, ref, true);
    if (CLOSED.includes(row.status))
      throw new HttpError(
        409,
        "ORDER_CLOSED",
        "Pesanan ini sudah selesai atau dibatalkan.",
      );
    if (row.status === "DIANTAR")
      throw new HttpError(
        409,
        "PAYMENT_REQUIRED",
        "Catat pembayaran untuk menyelesaikan pesanan.",
      );
    const next = ORDER_FLOW[ORDER_FLOW.indexOf(row.status as OrderStatus) + 1];
    if (!next || !(next in STEP_STAMP))
      throw new HttpError(
        409,
        "INVALID_STATUS",
        "Status tidak bisa dilanjutkan.",
      );
    [row] = (await tx
      .update(orders)
      .set({
        status: next,
        [STEP_STAMP[next as keyof typeof STEP_STAMP]]: new Date(),
      })
      .where(eq(orders.id, row.id))
      .returning()) as [OrderRow];
    if (row.status === "DIANTAR" && row.paymentStatus === "LUNAS")
      row = await complete(tx, row, actor);
    const [dto] = await withItems(tx, [row]);
    return dto!;
  });
}

/** Cash needs paidAmount ≥ total (change is given); non-cash pays exactly. */
export async function payOrder(
  ref: string,
  input: PayOrderInput,
  actor: Actor,
) {
  return db.transaction(async (tx) => {
    let row = await findRow(tx, ref, true);
    if (row.status === "DIBATALKAN")
      throw new HttpError(409, "ORDER_CANCELLED", "Pesanan sudah dibatalkan.");
    if (row.paymentStatus === "LUNAS")
      throw new HttpError(409, "ALREADY_PAID", "Pesanan sudah lunas.");
    const cash = input.method === "CASH";
    if (cash && input.paidAmount < row.totalAmount)
      throw new HttpError(
        422,
        "INSUFFICIENT_PAYMENT",
        "Uang diterima kurang dari total.",
      );
    [row] = (await tx
      .update(orders)
      .set({
        paymentStatus: "LUNAS",
        paymentMethod: input.method,
        paymentChannel: cash ? null : input.channel,
        paidAmount: cash ? input.paidAmount : row.totalAmount,
        paidAt: new Date(),
        cashierId: row.cashierId ?? actor.id,
        cashierName: row.cashierName ?? actor.name,
      })
      .where(eq(orders.id, row.id))
      .returning()) as [OrderRow];
    if (row.status === "DIANTAR") row = await complete(tx, row, actor);
    const [dto] = await withItems(tx, [row]);
    return dto!;
  });
}

/** Only unpaid orders that are new or being prepared can be cancelled. */
export async function cancelOrder(ref: string, reason: string, actor: Actor) {
  return db.transaction(async (tx) => {
    let row = await findRow(tx, ref, true);
    if (row.paymentStatus === "LUNAS")
      throw new HttpError(
        409,
        "ORDER_PAID",
        "Pesanan yang sudah lunas tidak bisa dibatalkan.",
      );
    if (row.status !== "MENUNGGU" && row.status !== "DIPROSES")
      throw new HttpError(
        409,
        "CANNOT_CANCEL",
        "Hanya pesanan baru atau yang sedang diproses yang bisa dibatalkan.",
      );
    [row] = (await tx
      .update(orders)
      .set({
        status: "DIBATALKAN",
        cancelReason: reason,
        completedAt: new Date(),
        cashierId: row.cashierId ?? actor.id,
        cashierName: row.cashierName ?? actor.name,
      })
      .where(eq(orders.id, row.id))
      .returning()) as [OrderRow];
    const [dto] = await withItems(tx, [row]);
    return dto!;
  });
}
