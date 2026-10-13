import { z } from "zod";

// Ids are text: seeded rows keep readable ids ("m1", "makanan"), new rows get
// UUIDs. Either way they only contain URL-safe characters.
export const recordIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid id.");

/** A calendar day in the cafe's time zone, "YYYY-MM-DD". */
export const dateSchema = z.iso.date();

export const pageSchema = {
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
};

/** Trimmed single-line text. */
export const text = (max: number) => z.string().trim().max(max);
