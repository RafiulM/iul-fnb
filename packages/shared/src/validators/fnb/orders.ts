import { z } from "zod";
import { dateSchema, pageSchema, recordIdSchema, text } from "./common";

const orderItem = z
  .object({
    menuId: recordIdSchema,
    qty: z.number().int().min(1).max(50),
    note: text(120).default(""),
  })
  .strict();

const items = z.array(orderItem).min(1, "Add at least one menu.").max(30);

/**
 * POST /api/public/orders: a customer orders from a table's QR code. `qrCode`
 * is the table's QR token or, while printed QR codes carry `?meja=<number>`,
 * the table number itself.
 */
export const createQrOrderSchema = z
  .object({ qrCode: recordIdSchema, items })
  .strict();

/** POST /api/orders: the cashier records a walk-in order. */
export const createManualOrderSchema = z
  .object({
    tableId: recordIdSchema.nullable().default(null),
    customerName: text(60)
      .nullable()
      .default(null)
      .transform((v) => v || null),
    items,
  })
  .strict();

export const MAX_PAID_AMOUNT = 99_999_999;

/** POST /api/orders/:id/payment */
export const payOrderSchema = z
  .object({
    method: z.enum(["CASH", "NON_CASH"]),
    channel: text(40)
      .nullable()
      .default(null)
      .transform((v) => v || null),
    paidAmount: z.number().int().min(0).max(MAX_PAID_AMOUNT),
  })
  .strict();

/** POST /api/orders/:id/cancel */
export const cancelOrderSchema = z
  .object({ reason: text(80).min(1, "Choose a reason.") })
  .strict();

/** GET /api/orders?date=today|YYYY-MM-DD: the cashier board for one day. */
export const listOrdersSchema = z
  .object({ date: z.union([z.literal("today"), dateSchema]).default("today") })
  .strict();

/** GET /api/transactions: finished and cancelled orders, newest first. */
export const listTransactionsSchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    status: z.enum(["SELESAI", "DIBATALKAN"]).optional(),
    method: z.enum(["CASH", "NON_CASH"]).optional(),
    type: z.enum(["QR", "MANUAL"]).optional(),
    q: text(60).optional(),
    ...pageSchema,
  })
  .strict();

export type CreateQrOrderInput = z.infer<typeof createQrOrderSchema>;
export type CreateManualOrderInput = z.infer<typeof createManualOrderSchema>;
export type PayOrderInput = z.infer<typeof payOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ListOrdersInput = z.infer<typeof listOrdersSchema>;
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;
