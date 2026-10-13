import { z } from "zod";
import { text } from "./common";

/**
 * Until file uploads exist, the logo is stored inline as a small data URL
 * (the web app downsizes it first). Keeps PATCH bodies under the API's
 * 100 kB limit.
 */
export const LOGO_DATA_URL_MAX = 60_000;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM.");
const percent = z.number().min(0).max(100);

const hours = z
  .array(
    z
      .object({ open: z.boolean(), from: time, to: time })
      .strict()
      .refine((h) => !h.open || h.to > h.from, {
        message: "Closing time must be after opening time.",
        path: ["to"],
      }),
  )
  .length(7);

const receipt = z
  .object({
    showLogo: z.boolean(),
    showAddress: z.boolean(),
    showTable: z.boolean(),
    showCashier: z.boolean(),
    showNotes: z.boolean(),
    header: text(60),
    footer: text(80),
    paperMm: z.union([z.literal(58), z.literal(80)]),
  })
  .strict();

const fields = {
  cafeName: text(40).min(1),
  logoUrl: z
    .string()
    .trim()
    .max(LOGO_DATA_URL_MAX)
    .refine(
      (v) =>
        (v.length <= 500 && /^https:\/\//i.test(v)) ||
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v),
      "Use an https:// URL or a small PNG, JPEG, or WebP image.",
    )
    .nullable(),
  address: text(140),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\+?[0-9][0-9\s-]{5,18}$/.test(v),
      "Use digits, spaces, or dashes.",
    ),
  instagram: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ""))
    .refine(
      (v) => v === "" || /^[A-Za-z0-9._]{1,30}$/.test(v),
      "Use letters, digits, dots, or underscores.",
    ),
  hours,
  taxPercent: percent,
  servicePercent: percent,
  taxInclusive: z.boolean(),
  receipt,
};

/** PATCH /api/settings: any subset; the web app may send the whole object. */
export const updateSettingsSchema = z
  .object({
    cafeName: fields.cafeName.optional(),
    logoUrl: fields.logoUrl.optional(),
    address: fields.address.optional(),
    phone: fields.phone.optional(),
    instagram: fields.instagram.optional(),
    hours: fields.hours.optional(),
    taxPercent: fields.taxPercent.optional(),
    servicePercent: fields.servicePercent.optional(),
    taxInclusive: fields.taxInclusive.optional(),
    receipt: fields.receipt.optional(),
  })
  .strict()
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    "Provide a setting to update.",
  );

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
