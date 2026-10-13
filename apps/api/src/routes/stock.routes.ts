import { Router } from "express";
import { recordIdSchema } from "@starter/shared/validators/fnb/common";
import {
  adjustStockSchema,
  createIngredientSchema,
  listStockMovementsSchema,
  restockSchema,
  updateIngredientSchema,
} from "@starter/shared/validators/fnb/stock";
import { requireAuth } from "../middleware/auth";
import { jsonBody } from "../middleware/body";
import { requireTrustedOrigin } from "../middleware/origin";
import { requireOwner, requireStaff } from "../middleware/staff";
import {
  adjustStock,
  createIngredient,
  deleteIngredient,
  listIngredients,
  listStockMovements,
  restock,
  updateIngredient,
} from "../services/stock.service";
import { actorOf } from "./_staff";

// Viewing and recording deliveries follow the owner's Kasir permissions;
// adding, editing, and counting (opname) ingredients is the owner's.
const read = requireStaff("stock_view");
const manage = requireOwner;

export const ingredientsRouter = Router();
ingredientsRouter.use(requireAuth, requireTrustedOrigin);

ingredientsRouter.get("/", read, async (_req, res) => {
  res.json({ data: await listIngredients() });
});

ingredientsRouter.post("/", manage, jsonBody, async (req, res) => {
  const input = createIngredientSchema.parse(req.body);
  const ingredient = await createIngredient(input, actorOf(req));
  res
    .status(201)
    .location(`/api/ingredients/${ingredient.id}`)
    .json({ data: ingredient });
});

ingredientsRouter.patch("/:id", manage, jsonBody, async (req, res) => {
  const id = recordIdSchema.parse(req.params.id);
  const input = updateIngredientSchema.parse(req.body);
  res.json({ data: await updateIngredient(id, input) });
});

ingredientsRouter.delete("/:id", manage, async (req, res) => {
  await deleteIngredient(recordIdSchema.parse(req.params.id));
  res.status(204).end();
});

export const stockMovementsRouter = Router();
stockMovementsRouter.use(requireAuth, requireTrustedOrigin);

stockMovementsRouter.get("/", read, async (req, res) => {
  res.json(await listStockMovements(listStockMovementsSchema.parse(req.query)));
});

// Bahan masuk: cashiers may record deliveries too.
stockMovementsRouter.post(
  "/restock",
  requireStaff("stock_in"),
  jsonBody,
  async (req, res) => {
    const input = restockSchema.parse(req.body);
    res.status(201).json({ data: await restock(input, actorOf(req)) });
  },
);

// Stock opname: set the counted quantity.
stockMovementsRouter.post("/adjust", manage, jsonBody, async (req, res) => {
  const input = adjustStockSchema.parse(req.body);
  res.status(201).json({ data: await adjustStock(input, actorOf(req)) });
});
