import { Router } from "express";
import { z } from "zod";
import { recordIdSchema } from "@starter/shared/validators/fnb/common";
import {
  bulkAvailabilitySchema,
  createCategorySchema,
  createMenuSchema,
  reorderCategoriesSchema,
  replaceRecipeSchema,
  updateCategorySchema,
  updateMenuSchema,
} from "@starter/shared/validators/fnb/menu";
import { requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import { requireStaff } from "../middleware/staff";
import {
  createCategory,
  createMenu,
  deleteCategory,
  deleteMenu,
  listCategories,
  listMenus,
  listRecipeItems,
  reorderCategories,
  replaceRecipe,
  setMenusAvailability,
  updateCategory,
  updateMenu,
} from "../services/menu.service";

// Every staff member reads the menu (manual orders, stock screen); changing
// it needs the "menu" permission.
const read = requireStaff();
const manage = requireStaff("menu");

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth, requireTrustedOrigin);

categoriesRouter.get("/", read, async (_req, res) => {
  res.json({ data: await listCategories() });
});

categoriesRouter.post("/", manage, jsonBody, async (req, res) => {
  const category = await createCategory(createCategorySchema.parse(req.body));
  res
    .status(201)
    .location(`/api/menu-categories/${category.id}`)
    .json({ data: category });
});

categoriesRouter.post("/reorder", manage, jsonBody, async (req, res) => {
  const { ids } = reorderCategoriesSchema.parse(req.body);
  res.json({ data: await reorderCategories(ids) });
});

categoriesRouter.patch("/:id", manage, jsonBody, async (req, res) => {
  const id = recordIdSchema.parse(req.params.id);
  const input = updateCategorySchema.parse(req.body);
  res.json({ data: await updateCategory(id, input) });
});

categoriesRouter.delete("/:id", manage, async (req, res) => {
  await deleteCategory(recordIdSchema.parse(req.params.id));
  res.status(204).end();
});

export const menusRouter = Router();
menusRouter.use(requireAuth, requireTrustedOrigin);

menusRouter.get("/", read, async (_req, res) => {
  res.json({ data: await listMenus() });
});

menusRouter.post("/", manage, jsonBody, async (req, res) => {
  const menu = await createMenu(createMenuSchema.parse(req.body));
  res.status(201).location(`/api/menus/${menu.id}`).json({ data: menu });
});

menusRouter.post("/availability", manage, jsonBody, async (req, res) => {
  const { ids, isAvailable } = bulkAvailabilitySchema.parse(req.body);
  res.json({ data: await setMenusAvailability(ids, isAvailable) });
});

menusRouter.patch("/:id", manage, jsonBody, async (req, res) => {
  const id = recordIdSchema.parse(req.params.id);
  const input = updateMenuSchema.parse(req.body);
  res.json({ data: await updateMenu(id, input) });
});

menusRouter.delete("/:id", manage, async (req, res) => {
  await deleteMenu(recordIdSchema.parse(req.params.id));
  res.status(204).end();
});

menusRouter.put("/:id/recipe", manage, jsonBody, async (req, res) => {
  const id = recordIdSchema.parse(req.params.id);
  const input = replaceRecipeSchema.parse(req.body);
  res.json({ data: await replaceRecipe(id, input) });
});

// Recipes are read on the stock screen (portions left per ingredient).
export const recipesRouter = Router();
recipesRouter.use(requireAuth, requireTrustedOrigin);

recipesRouter.get("/", requireStaff("stock_view"), async (req, res) => {
  const { menuId } = z
    .object({ menuId: recordIdSchema.optional() })
    .strict()
    .parse(req.query);
  res.json({ data: await listRecipeItems(menuId) });
});
