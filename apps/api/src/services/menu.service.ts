import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type {
  MenuCategoryDto,
  MenuDto,
  RecipeItemDto,
} from "@starter/shared/fnb/types";
import type {
  CreateCategoryInput,
  CreateMenuInput,
  ReplaceRecipeInput,
  UpdateCategoryInput,
  UpdateMenuInput,
} from "@starter/shared/validators/fnb/menu";
import { db } from "../db";
import { ingredients, menuCategories, menus, recipeItems } from "../db/schema";
import { HttpError } from "../lib/http-error";
import { notFound, pgErrorCode, uniqueOr409 } from "../lib/fnb";
import { syncAutoAvailability } from "./stock.service";

/* ---------- Categories ---------- */

const categoryFields = {
  id: menuCategories.id,
  name: menuCategories.name,
  sortOrder: menuCategories.sortOrder,
  tile: menuCategories.tile,
};

export function listCategories(): Promise<MenuCategoryDto[]> {
  return db
    .select(categoryFields)
    .from(menuCategories)
    .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));
}

const DUPLICATE_CATEGORY = "Nama kategori sudah dipakai.";

/** New categories go last. */
export async function createCategory(input: CreateCategoryInput) {
  const [row] = await uniqueOr409(
    () =>
      db
        .insert(menuCategories)
        .values({
          ...input,
          sortOrder: sql`(SELECT coalesce(max(sort_order), 0) + 1 FROM menu_categories)`,
        })
        .returning(categoryFields),
    DUPLICATE_CATEGORY,
  );
  return row!;
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const [row] = await uniqueOr409(
    () =>
      db
        .update(menuCategories)
        .set(input)
        .where(eq(menuCategories.id, id))
        .returning(categoryFields),
    DUPLICATE_CATEGORY,
  );
  if (!row) throw notFound("Kategori");
  return row;
}

/** Only empty categories can be deleted. */
export async function deleteCategory(id: string) {
  try {
    const [row] = await db
      .delete(menuCategories)
      .where(eq(menuCategories.id, id))
      .returning({ id: menuCategories.id });
    if (!row) throw notFound("Kategori");
  } catch (error) {
    if (pgErrorCode(error) === "23503")
      throw new HttpError(
        409,
        "CATEGORY_NOT_EMPTY",
        "Pindahkan atau hapus menu di kategori ini terlebih dahulu.",
      );
    throw error;
  }
}

/** Sets sort_order 1..n from the given order of every category id. */
export async function reorderCategories(ids: string[]) {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .for("update");
    const known = new Set(existing.map((c) => c.id));
    if (
      ids.length !== known.size ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !known.has(id))
    )
      throw new HttpError(
        422,
        "INVALID_ORDER",
        "Kirim semua kategori tepat satu kali.",
      );
    for (const [index, id] of ids.entries())
      await tx
        .update(menuCategories)
        .set({ sortOrder: index + 1 })
        .where(eq(menuCategories.id, id));
    return tx
      .select(categoryFields)
      .from(menuCategories)
      .orderBy(asc(menuCategories.sortOrder));
  });
}

/* ---------- Menus ---------- */

const menuFields = {
  id: menus.id,
  categoryId: menus.categoryId,
  name: menus.name,
  description: menus.description,
  price: menus.price,
  imageUrl: menus.imageUrl,
  isAvailable: menus.isAvailable,
  tags: menus.tags,
  createdAt: menus.createdAt,
};

const toMenu = (
  row: {
    createdAt: Date;
  } & Omit<MenuDto, "createdAt">,
): MenuDto => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
});

export async function listMenus() {
  const rows = await db
    .select(menuFields)
    .from(menus)
    .innerJoin(menuCategories, eq(menuCategories.id, menus.categoryId))
    .orderBy(
      asc(menuCategories.sortOrder),
      asc(menus.createdAt),
      asc(menus.id),
    );
  return rows.map(toMenu);
}

const DUPLICATE_MENU = "Nama menu sudah dipakai.";

async function writeMenu<T>(write: () => Promise<T>) {
  try {
    return await uniqueOr409(write, DUPLICATE_MENU);
  } catch (error) {
    if (pgErrorCode(error) === "23503")
      throw new HttpError(
        422,
        "CATEGORY_NOT_FOUND",
        "Kategori tidak ditemukan.",
      );
    throw error;
  }
}

export async function createMenu(input: CreateMenuInput) {
  const [row] = await writeMenu(() =>
    db.insert(menus).values(input).returning(menuFields),
  );
  return toMenu(row!);
}

export async function updateMenu(id: string, input: UpdateMenuInput) {
  const [row] = await writeMenu(() =>
    db
      .update(menus)
      .set({
        ...input,
        // The owner decided; stock sync no longer owns this menu's state.
        ...(input.isAvailable !== undefined ? { autoUnavailable: false } : {}),
      })
      .where(eq(menus.id, id))
      .returning(menuFields),
  );
  if (!row) throw notFound("Menu");
  return toMenu(row);
}

/** Bulk "tandai habis"/"tersedia" (e.g. every menu with an empty ingredient). */
export async function setMenusAvailability(
  ids: string[],
  isAvailable: boolean,
) {
  const rows = await db
    .update(menus)
    .set({ isAvailable, autoUnavailable: false })
    .where(inArray(menus.id, ids))
    .returning(menuFields);
  return rows.map(toMenu);
}

/** Deletes the menu and its recipe; past orders keep their copied lines. */
export async function deleteMenu(id: string) {
  const [row] = await db
    .delete(menus)
    .where(eq(menus.id, id))
    .returning({ id: menus.id });
  if (!row) throw notFound("Menu");
}

/* ---------- Recipes ---------- */

const recipeFields = {
  id: recipeItems.id,
  menuId: recipeItems.menuId,
  ingredientId: recipeItems.ingredientId,
  qtyUsed: recipeItems.qtyUsed,
};

export function listRecipeItems(menuId?: string): Promise<RecipeItemDto[]> {
  return db
    .select(recipeFields)
    .from(recipeItems)
    .where(menuId ? eq(recipeItems.menuId, menuId) : undefined)
    .orderBy(asc(recipeItems.menuId), asc(recipeItems.id));
}

/** Replaces the whole recipe of a menu. */
export async function replaceRecipe(menuId: string, input: ReplaceRecipeInput) {
  return db.transaction(async (tx) => {
    const [menu] = await tx
      .select({ id: menus.id })
      .from(menus)
      .where(eq(menus.id, menuId))
      .for("update");
    if (!menu) throw notFound("Menu");
    const ids = input.items.map((i) => i.ingredientId);
    if (ids.length) {
      const found = await tx
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(inArray(ingredients.id, ids));
      if (found.length !== ids.length)
        throw new HttpError(
          422,
          "INGREDIENT_NOT_FOUND",
          "Ada bahan resep yang tidak ditemukan.",
        );
    }
    await tx.delete(recipeItems).where(eq(recipeItems.menuId, menuId));
    if (ids.length)
      await tx
        .insert(recipeItems)
        .values(input.items.map((i) => ({ menuId, ...i })));
    await syncAutoAvailability(tx);
    return tx
      .select(recipeFields)
      .from(recipeItems)
      .where(and(eq(recipeItems.menuId, menuId)))
      .orderBy(asc(recipeItems.id));
  });
}
