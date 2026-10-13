import { staffRoleOf } from "@starter/shared/permissions";
import type { StaffRole } from "@starter/shared/fnb/types";

// Maps the Better Auth role onto the PRD roles: "owner" and "admin" act as
// Pemilik (OWNER), "cashier" as Kasir. Accounts without a staff role get no
// cafe access from the API; the UI shows them as Kasir. Promote an account
// with `pnpm role:set <email> owner`.
export function staffRole(role: string | null | undefined): StaffRole {
  return staffRoleOf(role) ?? "CASHIER";
}
