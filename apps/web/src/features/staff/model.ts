import type { PermissionKey } from "@starter/shared/fnb/fixtures";
import type { StaffAccountDto } from "@starter/shared/fnb/api";
import type { StaffDto, StaffRole } from "@starter/shared/fnb/types";

// Page rules from design/src/pages/staf.page.html, shared by the api and the
// components (the API enforces the same rules).

export type PermissionRow = {
  key: PermissionKey;
  label: string;
  OWNER: boolean;
  CASHIER: boolean;
};

/** Cashier column of the permission matrix (the unsaved draft or the saved state). */
export type CashierAccess = Record<PermissionKey, boolean>;

/** A staff account; `invited` until the owner sets its password. */
export type StaffMember = StaffAccountDto;

export type StaffInput = { name: string; email: string; role: StaffRole };

export const PERM_DESC: Record<PermissionKey, string> = {
  pos: "Melihat pesanan masuk, mencatat pesanan manual, dan mengubah status pesanan.",
  payment: "Mencatat pembayaran tunai/non-tunai dan mencetak struk.",
  stock_view: "Membuka halaman Stok Bahan dan melihat peringatan stok menipis.",
  stock_in: "Menambah stok saat bahan datang dari pemasok atau belanja.",
  menu: "Menambah menu, mengubah harga & foto, menandai menu habis.",
  tables: "Menambah meja dan mencetak QR untuk tiap meja.",
  report: "Membuka dashboard penjualan dan mengunduh laporan.",
  staff: "Menambah, mengubah, dan menonaktifkan akun staf.",
  settings: "Mengubah profil kafe, jam buka, pajak, dan format struk.",
};

export const OPS: PermissionKey[] = [
  "pos",
  "payment",
  "stock_view",
  "stock_in",
];
export const SENSITIVE = new Set<PermissionKey>(["staff", "settings"]);
/** A child access needs its parent access. */
export const REQUIRES: Partial<Record<PermissionKey, PermissionKey>> = {
  payment: "pos",
  stock_in: "stock_view",
};
export const OWNER_ONLY_PAGES = [
  "Menu & Meja",
  "Penjualan",
  "Akun & Staf",
  "Pengaturan",
];
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The oldest owner account: always active, role locked. */
export function primaryOwnerId(staff: StaffDto[]) {
  return staff
    .filter((s) => s.role === "OWNER")
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0]?.id;
}

/** The signed-in owner: matched by email, else the first owner. */
export function findMe<T extends StaffDto>(staff: T[], email: string) {
  const e = email.trim().toLowerCase();
  return (
    staff.find((s) => s.email.toLowerCase() === e) ??
    staff.find((s) => s.role === "OWNER") ??
    staff[0]
  );
}

/** Why an active account cannot be switched off (null = it can). */
export function deactivateBlock(
  s: StaffDto,
  staff: StaffDto[],
  meId: string | undefined,
): { title: string; note: string } | null {
  if (s.id === primaryOwnerId(staff))
    return {
      title: "Akun pemilik utama selalu aktif",
      note: "Akun pemilik utama",
    };
  if (!s.isActive) return null;
  if (s.id === meId)
    return {
      title: "Anda tidak bisa menonaktifkan akun sendiri",
      note: "Akun Anda",
    };
  if (
    s.role === "OWNER" &&
    staff.filter((x) => x.role === "OWNER" && x.isActive).length <= 1
  )
    return {
      title: "Harus ada minimal satu pemilik aktif",
      note: "Pemilik aktif terakhir",
    };
  return null;
}

export const cashierAccess = (perms: PermissionRow[]) =>
  Object.fromEntries(perms.map((p) => [p.key, p.CASHIER])) as CashierAccess;
