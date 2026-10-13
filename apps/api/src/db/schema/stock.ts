import { sql } from "drizzle-orm";
import {
  check,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { textId } from "./_id";
import { user } from "./user";

const qty = (name: string) =>
  numeric(name, { precision: 14, scale: 3, mode: "number" });

export const ingredients = pgTable(
  "ingredients",
  {
    id: textId(),
    name: text("name").notNull(),
    // gram | ml | pcs | botol
    unit: text("unit").notNull(),
    stockQty: qty("stock_qty").notNull().default(0),
    minStock: qty("min_stock").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("ingredients_name_uq").on(sql`lower(${t.name})`),
    check("ingredients_stock_non_negative", sql`${t.stockQty} >= 0`),
    check("ingredients_min_non_negative", sql`${t.minStock} >= 0`),
  ],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: textId(),
    ingredientId: text("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    // Positive for IN, negative for OUT; ADJUST carries the difference.
    qty: qty("qty").notNull(),
    // IN | OUT | ADJUST
    type: text("type").notNull(),
    note: text("note").notNull().default(""),
    // The sale that consumed the stock, for OUT movements.
    orderId: text("order_id"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    // Name at the time, so history survives account changes.
    createdByName: text("created_by_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("stock_movements_created_idx").on(t.createdAt.desc(), t.id.desc()),
    index("stock_movements_ingredient_idx").on(
      t.ingredientId,
      t.createdAt.desc(),
    ),
  ],
);
