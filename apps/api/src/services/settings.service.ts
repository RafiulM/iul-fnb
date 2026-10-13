import { eq } from "drizzle-orm";
import {
  ALL_PERMISSIONS,
  DEFAULT_CASHIER_PERMISSIONS,
  normalizePermissions,
  type StaffPermissionMatrix,
  type StaffPermissionsDto,
} from "@starter/shared/fnb/access";
import type { CafeSettingsDto } from "@starter/shared/fnb/types";
import type { PublicCafeDto } from "@starter/shared/fnb/api";
import type { UpdateSettingsInput } from "@starter/shared/validators/fnb/settings";
import { siteConfig } from "@starter/shared/site";
import { db, type DbOrTx } from "../db";
import { cafeSettings } from "../db/schema";

// Used until the owner saves settings for the first time.
const DEFAULTS: Omit<CafeSettingsDto, "cafeName"> = {
  logoUrl: null,
  address: "",
  phone: "",
  instagram: "",
  hours: Array.from({ length: 7 }, () => ({
    open: true,
    from: "08:00",
    to: "22:00",
  })),
  taxPercent: 10,
  servicePercent: 0,
  taxInclusive: false,
  receipt: {
    showLogo: true,
    showAddress: true,
    showTable: true,
    showCashier: true,
    showNotes: true,
    header: "",
    footer: "Terima kasih, sampai jumpa lagi!",
    paperMm: 80,
  },
};

function toDto(row: typeof cafeSettings.$inferSelect): CafeSettingsDto {
  return {
    cafeName: row.cafeName,
    logoUrl: row.logoUrl,
    address: row.address,
    phone: row.phone,
    instagram: row.instagram,
    hours: row.hours,
    taxPercent: row.taxPercent,
    servicePercent: row.servicePercent,
    taxInclusive: row.taxInclusive,
    receipt: row.receipt,
  };
}

/** The cafe settings, creating the default row on first use. */
export async function getSettings(conn: DbOrTx = db): Promise<CafeSettingsDto> {
  const [row] = await conn
    .select()
    .from(cafeSettings)
    .where(eq(cafeSettings.id, 1))
    .limit(1);
  if (row) return toDto(row);
  const [created] = await conn
    .insert(cafeSettings)
    .values({ id: 1, cafeName: siteConfig.name, ...DEFAULTS })
    .onConflictDoNothing()
    .returning();
  return created ? toDto(created) : getSettings(conn);
}

export async function getPublicCafe(): Promise<PublicCafeDto> {
  const settings: Partial<CafeSettingsDto> = await getSettings();
  delete settings.receipt;
  return settings as PublicCafeDto;
}

export async function updateSettings(input: UpdateSettingsInput) {
  await getSettings();
  const [row] = await db
    .update(cafeSettings)
    .set(input)
    .where(eq(cafeSettings.id, 1))
    .returning();
  return toDto(row!);
}

/** What a Kasir may do. Pemilik always has every permission. */
export async function getStaffPermissions(): Promise<StaffPermissionsDto> {
  await getSettings();
  const [row] = await db
    .select({ cashier: cafeSettings.cashierPermissions })
    .from(cafeSettings)
    .where(eq(cafeSettings.id, 1));
  return {
    OWNER: ALL_PERMISSIONS,
    CASHIER: normalizePermissions({
      ...DEFAULT_CASHIER_PERMISSIONS,
      ...row?.cashier,
    }),
  };
}

export async function updateCashierPermissions(matrix: StaffPermissionMatrix) {
  await getSettings();
  await db
    .update(cafeSettings)
    .set({ cashierPermissions: normalizePermissions(matrix) })
    .where(eq(cafeSettings.id, 1));
  return getStaffPermissions();
}
