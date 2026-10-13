// Loads the IUL FnB sample data (menu, tables, ingredients, recipes, settings,
// and optionally demo orders) into an EMPTY database: pnpm db:seed
// Add --orders for ~60 days of sales history plus today's open orders.
// Existing rows are never changed; a section that already has data is skipped.
import "./load-env";
import { count, sql } from "drizzle-orm";
import {
  CATEGORIES,
  generateTransactions,
  INGREDIENTS,
  MENUS,
  RECIPE_ITEMS,
  seedActiveOrders,
  SETTINGS,
  TABLES,
} from "@starter/shared/fnb/fixtures";
import { orderCode } from "@starter/shared/fnb/domain";
import type { OrderDto } from "@starter/shared/fnb/types";
import { databaseError } from "./db/connection";
import { db, pool } from "./db";
import {
  cafeSettings,
  cafeTables,
  ingredients,
  menuCategories,
  menus,
  orderCounters,
  orderItems,
  orders,
  recipeItems,
} from "./db/schema";
import { cafeDate } from "./lib/fnb";

const withOrders = process.argv.includes("--orders");

async function isEmpty(
  table:
    | typeof cafeSettings
    | typeof menuCategories
    | typeof cafeTables
    | typeof orders,
) {
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(table);
  return n === 0;
}

const plus = (iso: string, minutes: number) =>
  new Date(new Date(iso).getTime() + minutes * 60_000);

function orderRow(o: OrderDto, businessDate: string, seq: number) {
  const reached = (step: number) =>
    ["MENUNGGU", "DIPROSES", "SIAP", "DIANTAR", "SELESAI"].indexOf(o.status) >=
    step;
  const done = o.status === "SELESAI";
  return {
    id: o.id,
    code: orderCode(seq),
    businessDate,
    seq,
    tableId: o.tableId,
    tableNumber: o.tableNumber,
    orderType: o.orderType,
    status: o.status,
    customerName: o.customerName,
    subtotal: o.subtotal,
    tax: o.tax,
    service: o.service,
    totalAmount: o.totalAmount,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    paymentChannel: o.paymentChannel,
    paidAmount: o.paidAmount,
    cancelReason: o.cancelReason,
    cashierName: o.cashierName,
    createdAt: new Date(o.createdAt),
    updatedAt: new Date(o.updatedAt),
    acceptedAt: reached(1) ? plus(o.createdAt, 2) : null,
    readyAt: reached(2) ? plus(o.createdAt, 12) : null,
    deliveredAt: reached(3) ? plus(o.createdAt, 15) : null,
    paidAt: o.paidAt ? new Date(o.paidAt) : null,
    completedAt: o.completedAt ? new Date(o.completedAt) : null,
    // Sample stock levels are already "after" these sales.
    stockDeductedAt: done ? plus(o.createdAt, 25) : null,
  };
}

async function insertChunks<T>(
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += 500)
    await insert(rows.slice(i, i + 500));
}

try {
  if (await isEmpty(cafeSettings)) {
    await db.insert(cafeSettings).values({ id: 1, ...SETTINGS });
    console.log("Seeded cafe settings.");
  }
  if (await isEmpty(menuCategories)) {
    await db.transaction(async (tx) => {
      await tx.insert(menuCategories).values(CATEGORIES);
      await tx
        .insert(menus)
        .values(MENUS.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })));
      await tx.insert(ingredients).values(INGREDIENTS);
      await tx.insert(recipeItems).values(RECIPE_ITEMS);
    });
    console.log(
      `Seeded ${CATEGORIES.length} categories, ${MENUS.length} menus, ${INGREDIENTS.length} ingredients, ${RECIPE_ITEMS.length} recipe lines.`,
    );
  }
  if (await isEmpty(cafeTables)) {
    await db.insert(cafeTables).values(TABLES);
    console.log(`Seeded ${TABLES.length} tables.`);
  }

  if (withOrders && (await isEmpty(orders))) {
    const now = Date.now();
    const today = cafeDate(new Date(now));
    // Renumber per cafe-local day so codes restart daily like real orders.
    const history = generateTransactions(60, now)
      .filter((o) => cafeDate(new Date(o.createdAt)) < today)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const seqByDay = new Map<string, number>();
    const rows: ReturnType<typeof orderRow>[] = [];
    const items: (typeof orderItems.$inferInsert)[] = [];
    const add = (o: OrderDto, day: string, seq: number) => {
      rows.push(orderRow(o, day, seq));
      o.items.forEach((i, position) =>
        items.push({
          orderId: o.id,
          menuId: i.menuId,
          name: i.name,
          imageUrl: i.imageUrl,
          qty: i.qty,
          note: i.note,
          price: i.price,
          position,
        }),
      );
    };
    for (const o of history) {
      const day = cafeDate(new Date(o.createdAt));
      const seq = (seqByDay.get(day) ?? 0) + 1;
      seqByDay.set(day, seq);
      add(o, day, seq);
    }
    // Today's board continues from the fixtures' own numbers (A-101…).
    for (const o of seedActiveOrders(now)) {
      const seq = Number(o.code.slice(2));
      seqByDay.set(today, Math.max(seqByDay.get(today) ?? 0, seq));
      add(o, today, seq);
    }
    await db.transaction(async (tx) => {
      await insertChunks(rows, (chunk) => tx.insert(orders).values(chunk));
      await insertChunks(items, (chunk) => tx.insert(orderItems).values(chunk));
      await tx
        .insert(orderCounters)
        .values(
          [...seqByDay].map(([businessDate, lastSeq]) => ({
            businessDate,
            lastSeq,
          })),
        )
        .onConflictDoUpdate({
          target: orderCounters.businessDate,
          set: {
            lastSeq: sql`greatest(${orderCounters.lastSeq}, excluded.last_seq)`,
          },
        });
    });
    console.log(`Seeded ${rows.length} demo orders (${items.length} lines).`);
  } else if (withOrders) {
    console.log("Orders already exist; demo orders skipped.");
  }
  console.log("Sample data ready.");
} catch (error) {
  console.error(databaseError(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}
