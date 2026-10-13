import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  DEFAULT_CASHIER_PERMISSIONS,
  type StaffPermissionMatrix,
} from "@starter/shared/fnb/access";
import type {
  OpeningHoursDto,
  ReceiptFormatDto,
} from "@starter/shared/fnb/types";

const percent = (name: string) =>
  numeric(name, { precision: 5, scale: 2, mode: "number" });

// The cafe's settings: a single row with id 1.
export const cafeSettings = pgTable(
  "cafe_settings",
  {
    id: integer("id").primaryKey().default(1),
    cafeName: text("cafe_name").notNull(),
    logoUrl: text("logo_url"),
    address: text("address").notNull().default(""),
    phone: text("phone").notNull().default(""),
    instagram: text("instagram").notNull().default(""),
    // Monday first, seven entries.
    hours: jsonb("hours").$type<OpeningHoursDto[]>().notNull(),
    taxPercent: percent("tax_percent").notNull().default(0),
    servicePercent: percent("service_percent").notNull().default(0),
    taxInclusive: boolean("tax_inclusive").notNull().default(false),
    receipt: jsonb("receipt").$type<ReceiptFormatDto>().notNull(),
    // What a Kasir may do; the owner edits it on the staff screen.
    cashierPermissions: jsonb("cashier_permissions")
      .$type<StaffPermissionMatrix>()
      .notNull()
      .default(DEFAULT_CASHIER_PERMISSIONS),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [check("cafe_settings_singleton", sql`${t.id} = 1`)],
);
