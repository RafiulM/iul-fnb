import { stockStatus } from "@starter/shared/fnb/domain";
import type {
  IngredientDto,
  MenuDto,
  RecipeItemDto,
  StockMovementDto,
  StockStatus,
  StockUnit,
} from "@starter/shared/fnb/types";
import type { DataResponse, Paginated } from "@starter/shared/types";
import { apiFetch } from "@/lib/api/client";

// /api/ingredients, /api/recipes, /api/stock-movements. Stock goes down on
// the API when an order becomes SELESAI (one OUT movement per recipe line).

const ingredientPath = (id: string) =>
  `/api/ingredients/${encodeURIComponent(id)}`;

/* ---------- Reads ---------- */

export async function listIngredients() {
  return (await apiFetch<DataResponse<IngredientDto[]>>("/api/ingredients"))
    .data;
}

export async function listRecipeItems() {
  return (await apiFetch<DataResponse<RecipeItemDto[]>>("/api/recipes")).data;
}

/** How many of the newest movements the history and drawers show. */
const RECENT_MOVEMENTS = 400;
const PAGE_SIZE = 200;

/** The newest movements, newest first. */
export async function listStockMovements() {
  const all: StockMovementDto[] = [];
  for (let offset = 0; offset < RECENT_MOVEMENTS; offset += PAGE_SIZE) {
    const page = await apiFetch<Paginated<StockMovementDto>>(
      "/api/stock-movements",
      { query: { limit: PAGE_SIZE, offset } },
    );
    all.push(...page.data);
    if (!page.meta.hasMore) break;
  }
  return all;
}

/** The newest movement of one ingredient (just written by a mutation). */
async function latestMovement(ingredientId: string) {
  const page = await apiFetch<Paginated<StockMovementDto>>(
    "/api/stock-movements",
    { query: { ingredientId, limit: 1 } },
  );
  return page.data[0] ?? null;
}

/* ---------- Writes ---------- */

export type StockInInput = {
  ingredientId: string;
  qty: number;
  /** yyyy-mm-dd; today keeps the current time. */
  date: string;
  note: string;
};

export type StockInResult = {
  ingredient: IngredientDto;
  qty: number;
  movement: StockMovementDto | null;
  before: StockStatus;
  /** Menus that could not be sold before and can be now. */
  reopened: string[];
};

/** What the page already shows, to tell which menus a delivery reopens. */
export type StockContext = {
  ingredients: IngredientDto[];
  menus: MenuDto[];
};

/** POST /api/stock-movements/restock (bahan masuk). */
export async function recordStockIn(
  input: StockInInput,
  ctx: StockContext,
): Promise<StockInResult> {
  const prev = ctx.ingredients.find((i) => i.id === input.ingredientId);
  const { data: ingredient } = await apiFetch<DataResponse<IngredientDto>>(
    "/api/stock-movements/restock",
    { method: "POST", body: input },
  );
  // The API brings back menus it had marked habis itself; ask it which.
  const { data: menusAfter } =
    await apiFetch<DataResponse<MenuDto[]>>("/api/menus");
  const availableAfter = new Set(
    menusAfter.filter((m) => m.isAvailable).map((m) => m.id),
  );
  return {
    ingredient,
    qty: input.qty,
    movement: await latestMovement(ingredient.id),
    before: prev ? stockStatus(prev) : stockStatus(ingredient),
    reopened: ctx.menus
      .filter((m) => !m.isAvailable && availableAfter.has(m.id))
      .map((m) => m.name),
  };
}

export type IngredientInput = {
  name: string;
  unit: StockUnit;
  stockQty: number;
  minStock: number;
};

/** POST /api/ingredients (an opening stock is recorded as "Stok awal"). */
export async function createIngredient(input: IngredientInput) {
  const { data: ingredient } = await apiFetch<DataResponse<IngredientDto>>(
    "/api/ingredients",
    { method: "POST", body: input },
  );
  const movement =
    input.stockQty > 0 ? await latestMovement(ingredient.id) : null;
  return { ingredient, movement };
}

export type IngredientUpdate = {
  name: string;
  unit: StockUnit;
  minStock: number;
};

/** PATCH /api/ingredients/:id (stock itself changes only through movements). */
export async function updateIngredient(
  before: IngredientDto,
  input: IngredientUpdate,
) {
  const { data: ingredient } = await apiFetch<DataResponse<IngredientDto>>(
    ingredientPath(before.id),
    { method: "PATCH", body: input },
  );
  return { ingredient, before: stockStatus(before) };
}
