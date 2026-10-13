import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type {
  IngredientDto,
  StockMovementDto,
  StockUnit,
  StockMovementType,
} from "@starter/shared/fnb/types";
import type {
  AdjustStockInput,
  CreateIngredientInput,
  ListStockMovementsInput,
  RestockInput,
  UpdateIngredientInput,
} from "@starter/shared/validators/fnb/stock";
import { db, type DbOrTx, type Tx } from "../db";
import { ingredients, menus, recipeItems, stockMovements } from "../db/schema";
import { HttpError } from "../lib/http-error";
import { cafeDate, notFound, uniqueOr409 } from "../lib/fnb";

/** Who performed a stock change, for the movement history. */
export type Actor = { id: string; name: string };

const ingredientFields = {
  id: ingredients.id,
  name: ingredients.name,
  unit: ingredients.unit,
  stockQty: ingredients.stockQty,
  minStock: ingredients.minStock,
};

const toIngredient = (row: {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
  minStock: number;
}): IngredientDto => ({ ...row, unit: row.unit as StockUnit });

const DUPLICATE = "Nama bahan sudah dipakai.";

export async function listIngredients() {
  const rows = await db
    .select(ingredientFields)
    .from(ingredients)
    .orderBy(asc(ingredients.name));
  return rows.map(toIngredient);
}

async function getIngredient(conn: DbOrTx, id: string, lock = false) {
  const query = conn
    .select(ingredientFields)
    .from(ingredients)
    .where(eq(ingredients.id, id))
    .limit(1);
  const [row] = await (lock ? query.for("update") : query);
  if (!row) throw notFound("Bahan");
  return row;
}

async function insertMovement(
  tx: Tx,
  m: {
    ingredientId: string;
    qty: number;
    type: StockMovementType;
    note: string;
    actor: Actor | null;
    orderId?: string;
    createdAt?: Date;
  },
) {
  await tx.insert(stockMovements).values({
    ingredientId: m.ingredientId,
    qty: m.qty,
    type: m.type,
    note: m.note,
    orderId: m.orderId ?? null,
    createdBy: m.actor?.id ?? null,
    createdByName: m.actor?.name ?? null,
    ...(m.createdAt ? { createdAt: m.createdAt } : {}),
  });
}

export async function createIngredient(
  input: CreateIngredientInput,
  actor: Actor,
) {
  return uniqueOr409(
    () =>
      db.transaction(async (tx) => {
        const [row] = await tx
          .insert(ingredients)
          .values(input)
          .returning(ingredientFields);
        if (input.stockQty > 0)
          await insertMovement(tx, {
            ingredientId: row!.id,
            qty: input.stockQty,
            type: "IN",
            note: "Stok awal",
            actor,
          });
        return toIngredient(row!);
      }),
    DUPLICATE,
  );
}

export async function updateIngredient(
  id: string,
  input: UpdateIngredientInput,
) {
  const [row] = await uniqueOr409(
    () =>
      db
        .update(ingredients)
        .set(input)
        .where(eq(ingredients.id, id))
        .returning(ingredientFields),
    DUPLICATE,
  );
  if (!row) throw notFound("Bahan");
  return toIngredient(row);
}

/** Deletes an ingredient, its recipe lines, and its movement history. */
export async function deleteIngredient(id: string) {
  const [row] = await db
    .delete(ingredients)
    .where(eq(ingredients.id, id))
    .returning({ id: ingredients.id });
  if (!row) throw notFound("Bahan");
}

/** Bahan masuk: adds stock and records an IN movement. */
export async function restock(input: RestockInput, actor: Actor) {
  const today = cafeDate();
  if (input.date && input.date > today)
    throw new HttpError(
      422,
      "DATE_IN_FUTURE",
      "Tanggal bahan masuk tidak boleh setelah hari ini.",
    );
  return db.transaction(async (tx) => {
    await getIngredient(tx, input.ingredientId, true);
    const [row] = await tx
      .update(ingredients)
      .set({ stockQty: sql`${ingredients.stockQty} + ${input.qty}` })
      .where(eq(ingredients.id, input.ingredientId))
      .returning(ingredientFields);
    await insertMovement(tx, {
      ingredientId: input.ingredientId,
      qty: input.qty,
      type: "IN",
      note: input.note,
      actor,
      // A backdated entry is stamped at noon of that cafe-local day.
      createdAt:
        input.date && input.date !== today
          ? new Date(`${input.date}T12:00:00+07:00`)
          : undefined,
    });
    await syncAutoAvailability(tx);
    return toIngredient(row!);
  });
}

/** Stock opname: sets the counted quantity and records the difference. */
export async function adjustStock(input: AdjustStockInput, actor: Actor) {
  return db.transaction(async (tx) => {
    const current = await getIngredient(tx, input.ingredientId, true);
    const diff = input.countedQty - current.stockQty;
    if (diff === 0) return toIngredient(current);
    const [row] = await tx
      .update(ingredients)
      .set({ stockQty: input.countedQty })
      .where(eq(ingredients.id, input.ingredientId))
      .returning(ingredientFields);
    await insertMovement(tx, {
      ingredientId: input.ingredientId,
      qty: diff,
      type: "ADJUST",
      note: input.note || "Penyesuaian stok",
      actor,
    });
    await syncAutoAvailability(tx);
    return toIngredient(row!);
  });
}

export async function listStockMovements(
  input: ListStockMovementsInput,
): Promise<{
  data: StockMovementDto[];
  meta: { limit: number; offset: number; hasMore: boolean };
}> {
  const where = and(
    input.ingredientId
      ? eq(stockMovements.ingredientId, input.ingredientId)
      : undefined,
    input.type ? eq(stockMovements.type, input.type) : undefined,
  );
  const rows = await db
    .select({
      id: stockMovements.id,
      ingredientId: stockMovements.ingredientId,
      qty: stockMovements.qty,
      type: stockMovements.type,
      note: stockMovements.note,
      createdAt: stockMovements.createdAt,
      createdBy: stockMovements.createdByName,
    })
    .from(stockMovements)
    .where(where)
    .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
    .limit(input.limit + 1)
    .offset(input.offset);
  return {
    data: rows.slice(0, input.limit).map((r) => ({
      ...r,
      type: r.type as StockMovementType,
      createdAt: r.createdAt.toISOString(),
    })),
    meta: {
      limit: input.limit,
      offset: input.offset,
      hasMore: rows.length > input.limit,
    },
  };
}

/**
 * PRD "Stok Berkurang Otomatis": one OUT movement per recipe line of each
 * sold item, floored at zero. Call inside the transaction that finishes the
 * order; the caller guarantees it runs once per order.
 */
export async function deductStockForOrder(
  tx: Tx,
  order: {
    id: string;
    code: string;
    items: { menuId: string | null; name: string; qty: number }[];
  },
  actor: Actor | null,
) {
  const menuIds = [
    ...new Set(order.items.flatMap((i) => (i.menuId ? [i.menuId] : []))),
  ];
  if (!menuIds.length) return;
  const recipe = await tx
    .select({
      menuId: recipeItems.menuId,
      ingredientId: recipeItems.ingredientId,
      qtyUsed: recipeItems.qtyUsed,
    })
    .from(recipeItems)
    .where(inArray(recipeItems.menuId, menuIds));
  if (!recipe.length) return;

  const ingredientIds = [...new Set(recipe.map((r) => r.ingredientId))].sort();
  // Lock in a fixed order so concurrent sales never deadlock.
  await tx
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(inArray(ingredients.id, ingredientIds))
    .orderBy(asc(ingredients.id))
    .for("update");

  for (const item of order.items) {
    for (const r of recipe.filter((x) => x.menuId === item.menuId)) {
      const used = r.qtyUsed * item.qty;
      await tx
        .update(ingredients)
        .set({ stockQty: sql`greatest(0, ${ingredients.stockQty} - ${used})` })
        .where(eq(ingredients.id, r.ingredientId));
      await insertMovement(tx, {
        ingredientId: r.ingredientId,
        qty: -used,
        type: "OUT",
        note: `Penjualan ${order.code} · ${item.name} ×${item.qty}`,
        actor,
        orderId: order.id,
      });
    }
  }
  await syncAutoAvailability(tx);
}

/**
 * Marks menus habis when an ingredient no longer covers one portion, and
 * brings back menus the system (not the owner) turned off once stock allows.
 */
export async function syncAutoAvailability(conn: DbOrTx) {
  const short = sql`EXISTS (
    SELECT 1 FROM ${recipeItems} r
    JOIN ${ingredients} i ON i.id = r.ingredient_id
    WHERE r.menu_id = "menus"."id" AND i.stock_qty < r.qty_used
  )`;
  await conn
    .update(menus)
    .set({ isAvailable: false, autoUnavailable: true })
    .where(and(eq(menus.isAvailable, true), short));
  await conn
    .update(menus)
    .set({ isAvailable: true, autoUnavailable: false })
    .where(and(eq(menus.autoUnavailable, true), sql`NOT ${short}`));
}
