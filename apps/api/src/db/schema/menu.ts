import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { textId } from "./_id";
import { ingredients } from "./stock";

export const menuCategories = pgTable(
  "menu_categories",
  {
    id: textId(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    tile: text("tile").notNull().default("#F3EEE6"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("menu_categories_name_uq").on(sql`lower(${t.name})`)],
);

export const menus = pgTable(
  "menus",
  {
    id: textId(),
    categoryId: text("category_id")
      .notNull()
      .references(() => menuCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    // Whole rupiah.
    price: integer("price").notNull(),
    imageUrl: text("image_url").notNull().default(""),
    isAvailable: boolean("is_available").notNull().default(true),
    // Set when the system marked the menu habis because an ingredient ran
    // out; only those menus come back automatically after a restock.
    autoUnavailable: boolean("auto_unavailable").notNull().default(false),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("menus_name_uq").on(sql`lower(${t.name})`),
    index("menus_category_idx").on(t.categoryId),
    check("menus_price_positive", sql`${t.price} > 0`),
  ],
);

export const recipeItems = pgTable(
  "recipe_items",
  {
    id: textId(),
    menuId: text("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    ingredientId: text("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    qtyUsed: numeric("qty_used", {
      precision: 14,
      scale: 3,
      mode: "number",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("recipe_items_menu_ingredient_uq").on(t.menuId, t.ingredientId),
    index("recipe_items_ingredient_idx").on(t.ingredientId),
    check("recipe_items_qty_positive", sql`${t.qtyUsed} > 0`),
  ],
);
