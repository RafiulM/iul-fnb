import { z } from "zod";
import { recordIdSchema, text } from "./common";

export const MENU_TAGS = ["Terlaris", "Baru", "Pedas"] as const;

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a color like #FCE6D4.");

export const createCategorySchema = z
  .object({
    name: text(30).min(1),
    tile: hexColor.default("#F3EEE6"),
  })
  .strict();

export const updateCategorySchema = z
  .object({ name: text(30).min(1).optional(), tile: hexColor.optional() })
  .strict()
  .refine(
    (v) => v.name !== undefined || v.tile !== undefined,
    "Provide a name or tile to update.",
  );

/** PUT-style reorder: every category id, in the new order. */
export const reorderCategoriesSchema = z
  .object({ ids: z.array(recordIdSchema).min(1).max(100) })
  .strict();

const menuFields = {
  categoryId: recordIdSchema,
  name: text(60).min(1),
  description: text(140).default(""),
  price: z.number().int().min(1).max(99_999_999),
  /** An emoji placeholder or an https image URL. */
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) =>
        v === "" || !/^[a-z][a-z0-9+.-]*:/i.test(v) || /^https:\/\//i.test(v),
      "Use an emoji or an https:// image URL.",
    )
    .default(""),
  isAvailable: z.boolean().default(true),
  tags: z
    .array(z.enum(MENU_TAGS))
    .max(MENU_TAGS.length)
    .default([])
    .transform((tags) => [...new Set(tags)]),
};

export const createMenuSchema = z.object(menuFields).strict();

export const updateMenuSchema = z
  .object({
    categoryId: menuFields.categoryId.optional(),
    name: menuFields.name.optional(),
    description: text(140).optional(),
    price: menuFields.price.optional(),
    imageUrl: menuFields.imageUrl.unwrap().optional(),
    isAvailable: z.boolean().optional(),
    tags: z
      .array(z.enum(MENU_TAGS))
      .max(MENU_TAGS.length)
      .transform((tags) => [...new Set(tags)])
      .optional(),
  })
  .strict()
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    "Provide a field to update.",
  );

/** PUT /api/menus/:id/recipe: replaces the whole recipe. */
export const replaceRecipeSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            ingredientId: recordIdSchema,
            qtyUsed: z.number().positive().max(1_000_000),
          })
          .strict(),
      )
      .max(30)
      .refine(
        (items) =>
          new Set(items.map((i) => i.ingredientId)).size === items.length,
        "Each ingredient may appear once.",
      ),
  })
  .strict();

/** POST /api/menus/bulk-availability */
export const bulkAvailabilitySchema = z
  .object({
    ids: z.array(recordIdSchema).min(1).max(200),
    isAvailable: z.boolean(),
  })
  .strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type ReplaceRecipeInput = z.infer<typeof replaceRecipeSchema>;
