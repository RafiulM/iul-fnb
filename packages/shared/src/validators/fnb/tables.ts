import { z } from "zod";
import { text } from "./common";

/** "5" → "05", "a1" → "A1". Up to 6 of A–Z, 0–9 and "-", not all zeros. */
export const tableNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => (/^\d$/.test(v) ? v.padStart(2, "0") : v))
  .pipe(
    z
      .string()
      .regex(/^[A-Z0-9-]{1,6}$/, "Use up to 6 letters, digits, or dashes.")
      .refine((v) => !/^0+$/.test(v), "A table number cannot be zero."),
  );

export const createTableSchema = z
  .object({
    tableNumber: tableNumberSchema,
    area: text(30).min(1).default("Dalam"),
  })
  .strict();

export const updateTableSchema = z
  .object({
    tableNumber: tableNumberSchema.optional(),
    area: text(30).min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    "Provide a field to update.",
  );

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
