import type {
  MenuCategoryDto,
  MenuDto,
  RecipeItemDto,
} from "@starter/shared/fnb/types";
import type { MENU_TAGS } from "@starter/shared/validators/fnb/menu";
import type { DataResponse } from "@starter/shared/types";
import { apiFetch } from "@/lib/api/client";

// /api/menu-categories, /api/menus, and menu recipes.

const menuPath = (id: string) => `/api/menus/${encodeURIComponent(id)}`;
const categoryPath = (id: string) =>
  `/api/menu-categories/${encodeURIComponent(id)}`;

export async function listCategories() {
  const res = await apiFetch<DataResponse<MenuCategoryDto[]>>(
    "/api/menu-categories",
  );
  return res.data.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listMenus() {
  return (await apiFetch<DataResponse<MenuDto[]>>("/api/menus")).data;
}

/* ---------- Menus ---------- */

export type MenuInput = {
  name: string;
  categoryId: string;
  price: number;
  description: string;
  /** Emoji placeholder until photo upload exists. */
  imageUrl: string;
  tags: string[];
  isAvailable: boolean;
};

export type RecipeLineInput = { ingredientId: string; qtyUsed: number };

type MenuTag = (typeof MENU_TAGS)[number];

/**
 * Creates (id = null) or updates a menu, then replaces its recipe:
 * POST /api/menus or PATCH /api/menus/:id, then PUT /api/menus/:id/recipe.
 */
export async function saveMenu({
  id,
  input,
  recipe,
}: {
  id: string | null;
  input: MenuInput;
  recipe: RecipeLineInput[];
}) {
  const body = { ...input, tags: input.tags as MenuTag[] };
  const { data: menu } = await apiFetch<DataResponse<MenuDto>>(
    id ? menuPath(id) : "/api/menus",
    { method: id ? "PATCH" : "POST", body },
  );
  await saveMenuRecipe({ menuId: menu.id, recipe });
  return menu;
}

/** PUT /api/menus/:id/recipe */
export async function saveMenuRecipe({
  menuId,
  recipe,
}: {
  menuId: string;
  recipe: RecipeLineInput[];
}) {
  const res = await apiFetch<DataResponse<RecipeItemDto[]>>(
    `${menuPath(menuId)}/recipe`,
    { method: "PUT", body: { items: recipe } },
  );
  return res.data;
}

/** PATCH /api/menus/:id { isAvailable } */
export async function setMenuAvailability({
  id,
  isAvailable,
}: {
  id: string;
  isAvailable: boolean;
}) {
  const res = await apiFetch<DataResponse<MenuDto>>(menuPath(id), {
    method: "PATCH",
    body: { isAvailable },
  });
  return res.data;
}

/** POST /api/menus/availability { ids, isAvailable: false } */
export async function markMenusUnavailable(ids: string[]) {
  const res = await apiFetch<DataResponse<MenuDto[]>>(
    "/api/menus/availability",
    { method: "POST", body: { ids, isAvailable: false } },
  );
  return res.data;
}

/** DELETE /api/menus/:id (sales history keeps its own item names). */
export async function deleteMenu(id: string) {
  await apiFetch<void>(menuPath(id), { method: "DELETE" });
}

/* ---------- Categories ---------- */

const TILES = ["#FCE6D4", "#E2EEDD", "#F7E9BE", "#E3E8F4", "#F3E1EA"];

/** POST /api/menu-categories (appended at the end). */
export async function createCategory(name: string) {
  const tile = TILES[[...name].length % TILES.length]!;
  const res = await apiFetch<DataResponse<MenuCategoryDto>>(
    "/api/menu-categories",
    { method: "POST", body: { name, tile } },
  );
  return res.data;
}

/** PATCH /api/menu-categories/:id { name } */
export async function renameCategory({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const res = await apiFetch<DataResponse<MenuCategoryDto>>(categoryPath(id), {
    method: "PATCH",
    body: { name },
  });
  return res.data;
}

/**
 * Swap with the neighbour above (-1) or below (1): POST
 * /api/menu-categories/reorder with every id in the new order.
 */
export async function moveCategory({ id, dir }: { id: string; dir: -1 | 1 }) {
  const ids = (await listCategories()).map((c) => c.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length)
    throw new Error("Urutan kategori tidak bisa diubah.");
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  const res = await apiFetch<DataResponse<MenuCategoryDto[]>>(
    "/api/menu-categories/reorder",
    { method: "POST", body: { ids } },
  );
  const category = res.data.find((c) => c.id === id)!;
  return { category, position: j + 1 };
}

/** DELETE /api/menu-categories/:id (only when empty: 409 otherwise). */
export async function deleteCategory(id: string) {
  await apiFetch<void>(categoryPath(id), { method: "DELETE" });
}
