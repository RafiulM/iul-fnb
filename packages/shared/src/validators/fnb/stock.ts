import { z } from "zod";
import { dateSchema, pageSchema, recordIdSchema, text } from "./common";

export const STOCK_UNITS = ["gram", "ml", "pcs", "botol"] as const;

const qty = z.number().min(0).max(1_000_000);

export const createIngredientSchema = z
  .object({
    name: text(40).min(1),
    unit: z.enum(STOCK_UNITS),
    stockQty: qty.default(0),
    minStock: qty.default(0),
  })
  .strict();

/** Stock quantity changes only through restock/adjust movements. */
export const updateIngredientSchema = z
  .object({
    name: text(40).min(1).optional(),
    unit: z.enum(STOCK_UNITS).optional(),
    minStock: qty.optional(),
  })
  .strict()
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    "Provide a field to update.",
  );

/** POST /api/stock-movements/restock: bahan masuk. */
export const restockSchema = z
  .object({
    ingredientId: recordIdSchema,
    qty: z.number().positive().max(1_000_000),
    note: text(80).default(""),
    /** Backdating is allowed, the future is not. Defaults to now. */
    date: dateSchema.optional(),
  })
  .strict();

/** POST /api/stock-movements/adjust: stock opname to a counted quantity. */
export const adjustStockSchema = z
  .object({
    ingredientId: recordIdSchema,
    countedQty: qty,
    note: text(80).default(""),
  })
  .strict();

export const listStockMovementsSchema = z
  .object({
    ingredientId: recordIdSchema.optional(),
    type: z.enum(["IN", "OUT", "ADJUST"]).optional(),
    ...pageSchema,
  })
  .strict();

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
export type RestockInput = z.infer<typeof restockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ListStockMovementsInput = z.infer<typeof listStockMovementsSchema>;
