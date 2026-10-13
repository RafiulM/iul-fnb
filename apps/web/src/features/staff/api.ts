import { PERMISSIONS } from "@starter/shared/fnb/fixtures";
import {
  normalizePermissions,
  type StaffPermissionsDto,
} from "@starter/shared/fnb/access";
import type { StaffAccountDto } from "@starter/shared/fnb/api";
import type { DataResponse } from "@starter/shared/types";
import { apiFetch } from "@/lib/api/client";
import type {
  CashierAccess,
  PermissionRow,
  StaffInput,
  StaffMember,
} from "./model";

// /api/staff (Better Auth users with a cafe role) and the Kasir permission
// matrix. No email provider yet: the owner sets passwords directly.

const path = (id: string) => `/api/staff/${encodeURIComponent(id)}`;

export async function listStaff(): Promise<StaffMember[]> {
  return (await apiFetch<DataResponse<StaffAccountDto[]>>("/api/staff")).data;
}

/** Matrix rows in the page's order, labelled from the shared fixture. */
const toRows = (dto: StaffPermissionsDto): PermissionRow[] =>
  PERMISSIONS.map((p) => ({
    key: p.key,
    label: p.label,
    OWNER: dto.OWNER[p.key],
    CASHIER: dto.CASHIER[p.key],
  }));

/** GET /api/staff/permissions */
export async function getPermissions() {
  const res = await apiFetch<DataResponse<StaffPermissionsDto>>(
    "/api/staff/permissions",
  );
  return toRows(res.data);
}

/** POST /api/staff. Without a password the account stays "invited". */
export async function createStaff(input: StaffInput & { password?: string }) {
  const res = await apiFetch<DataResponse<StaffAccountDto>>("/api/staff", {
    method: "POST",
    body: input,
  });
  return res.data;
}

/** PATCH /api/staff/:id — sends only what changed. */
export async function updateStaff(before: StaffMember, input: StaffInput) {
  const emailChanged = before.email.toLowerCase() !== input.email;
  const roleChanged = before.role !== input.role;
  const res = await apiFetch<DataResponse<StaffAccountDto>>(path(before.id), {
    method: "PATCH",
    body: {
      name: input.name,
      ...(emailChanged ? { email: input.email } : {}),
      ...(roleChanged ? { role: input.role } : {}),
    },
  });
  return { staff: res.data, emailChanged, roleChanged };
}

/** PATCH /api/staff/:id { isActive }; deactivating signs the account out. */
export async function setStaffActive(id: string, active: boolean) {
  const res = await apiFetch<DataResponse<StaffAccountDto>>(path(id), {
    method: "PATCH",
    body: { isActive: active },
  });
  return res.data;
}

/** POST /api/staff/:id/password — also ends the account's sessions. */
export async function setStaffPassword(id: string, password: string) {
  await apiFetch<void>(`${path(id)}/password`, {
    method: "POST",
    body: { password },
  });
}

/** PATCH /api/staff/permissions (owners always keep full access). */
export async function savePermissions(cashier: CashierAccess) {
  const res = await apiFetch<DataResponse<StaffPermissionsDto>>(
    "/api/staff/permissions",
    { method: "PATCH", body: normalizePermissions(cashier) },
  );
  return toRows(res.data);
}
