import { z } from "zod";
import { dateSchema } from "./common";

/** GET /api/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, max 366 days). */
export const salesReportSchema = z
  .object({ from: dateSchema, to: dateSchema })
  .strict()
  .refine((v) => v.from <= v.to, {
    message: "from must not be after to.",
    path: ["from"],
  })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 <= 366, {
    message: "Choose at most 366 days.",
    path: ["to"],
  });

export type SalesReportInput = z.infer<typeof salesReportSchema>;
