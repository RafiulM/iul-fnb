import { z } from "zod";
import {
  STAFF_PERMISSION_KEYS,
  type StaffPermissionKey,
} from "../../fnb/access";
import { text } from "./common";

const email = z.string().trim().toLowerCase().max(80).pipe(z.email());
const password = z.string().min(8).max(128);
const role = z.enum(["OWNER", "CASHIER"]);

/**
 * Owner adds a staff account. Without a password the account is "invited":
 * it cannot sign in until the owner sets one (reset-password). Emailed
 * invitation links need an email provider, which this app does not have yet.
 */
export const createStaffSchema = z
  .object({ name: text(60).min(2), email, role, password: password.optional() })
  .strict();

export const updateStaffSchema = z
  .object({
    name: text(60).min(2).optional(),
    email: email.optional(),
    role: role.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    "Provide a field to update.",
  );

/** Owner sets a new password; the staff member's sessions end. */
export const resetStaffPasswordSchema = z.object({ password }).strict();

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type ResetStaffPasswordInput = z.infer<typeof resetStaffPasswordSchema>;

/** PATCH /api/staff/permissions: what a Kasir may do (Pemilik has all). */
export const updateCashierPermissionsSchema = z
  .object(
    Object.fromEntries(
      STAFF_PERMISSION_KEYS.map((key) => [key, z.boolean()]),
    ) as Record<StaffPermissionKey, z.ZodBoolean>,
  )
  .strict();

export type UpdateCashierPermissionsInput = z.infer<
  typeof updateCashierPermissionsSchema
>;
