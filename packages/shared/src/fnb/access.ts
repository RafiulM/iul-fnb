// What staff may do in the Kasir + Dashboard app (PRD "Atur Peran Pengguna").
// Pemilik (OWNER) may do everything; the owner chooses what a Kasir (CASHIER)
// may do. The API enforces this on every request; the web app only reads it
// to hide controls. No browser- or Node-only code here.

export const STAFF_PERMISSION_KEYS = [
  "pos", // open the cashier board and process orders
  "payment", // take payment and print receipts
  "stock_view", // see ingredient stock
  "stock_in", // record incoming stock
  "menu", // change menus, prices, availability
  "tables", // manage tables and QR codes
  "report", // sales dashboard, history, exports
  "staff", // staff accounts and permissions
  "settings", // cafe settings
] as const;

export type StaffPermissionKey = (typeof STAFF_PERMISSION_KEYS)[number];

export type StaffPermissionMatrix = Record<StaffPermissionKey, boolean>;

/** A key that only works together with another one. */
export const PERMISSION_REQUIRES: Partial<
  Record<StaffPermissionKey, StaffPermissionKey>
> = {
  payment: "pos",
  stock_in: "stock_view",
};

export const ALL_PERMISSIONS = Object.fromEntries(
  STAFF_PERMISSION_KEYS.map((key) => [key, true]),
) as StaffPermissionMatrix;

export const DEFAULT_CASHIER_PERMISSIONS: StaffPermissionMatrix = {
  pos: true,
  payment: true,
  stock_view: true,
  stock_in: true,
  menu: false,
  tables: false,
  report: false,
  staff: false,
  settings: false,
};

/** Clears keys whose required key is off (unchecking "pos" clears "payment"). */
export function normalizePermissions(
  matrix: StaffPermissionMatrix,
): StaffPermissionMatrix {
  const out = { ...matrix };
  for (const [key, parent] of Object.entries(PERMISSION_REQUIRES))
    if (parent && !out[parent]) out[key as StaffPermissionKey] = false;
  return out;
}

export type StaffPermissionsDto = {
  OWNER: StaffPermissionMatrix;
  CASHIER: StaffPermissionMatrix;
};
