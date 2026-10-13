import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { textId } from "./_id";

// Cafe tables ("meja"). The SQL name is cafe_tables to avoid confusion with
// database tables.
export const cafeTables = pgTable("cafe_tables", {
  id: textId(),
  tableNumber: text("table_number").notNull().unique(),
  // Unguessable token printed in the table's QR code.
  qrCode: text("qr_code").notNull().unique(),
  area: text("area").notNull().default("Dalam"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
