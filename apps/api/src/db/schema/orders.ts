import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { textId } from "./_id";
import { menus } from "./menu";
import { cafeTables } from "./tables";
import { user } from "./user";

const at = (name: string) => timestamp(name, { withTimezone: true });

export const orders = pgTable(
  "orders",
  {
    id: textId(),
    // "A-027": seq of the cafe-local business day, which resets daily.
    code: text("code").notNull(),
    businessDate: date("business_date", { mode: "string" }).notNull(),
    seq: integer("seq").notNull(),
    tableId: text("table_id").references(() => cafeTables.id, {
      onDelete: "set null",
    }),
    // Snapshot, so renaming or deleting a table never rewrites history.
    tableNumber: text("table_number"),
    // QR | MANUAL
    orderType: text("order_type").notNull(),
    // MENUNGGU | DIPROSES | SIAP | DIANTAR | SELESAI | DIBATALKAN
    status: text("status").notNull(),
    customerName: text("customer_name"),
    // Whole rupiah, computed by the server from menu prices and settings.
    subtotal: integer("subtotal").notNull(),
    tax: integer("tax").notNull(),
    service: integer("service").notNull(),
    totalAmount: integer("total_amount").notNull(),
    // BELUM | LUNAS
    paymentStatus: text("payment_status").notNull().default("BELUM"),
    // CASH | NON_CASH
    paymentMethod: text("payment_method"),
    paymentChannel: text("payment_channel"),
    paidAmount: integer("paid_amount"),
    cancelReason: text("cancel_reason"),
    cashierId: text("cashier_id").references(() => user.id, {
      onDelete: "set null",
    }),
    cashierName: text("cashier_name"),
    createdAt: at("created_at").defaultNow().notNull(),
    updatedAt: at("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    acceptedAt: at("accepted_at"),
    readyAt: at("ready_at"),
    deliveredAt: at("delivered_at"),
    paidAt: at("paid_at"),
    // When it became SELESAI or DIBATALKAN.
    completedAt: at("completed_at"),
    // Set once the sale's ingredients were deducted, so it happens once.
    stockDeductedAt: at("stock_deducted_at"),
  },
  (t) => [
    uniqueIndex("orders_business_date_seq_uq").on(t.businessDate, t.seq),
    index("orders_business_date_idx").on(t.businessDate, t.createdAt),
    index("orders_created_idx").on(t.createdAt.desc(), t.id.desc()),
    index("orders_table_status_idx").on(t.tableId, t.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: textId(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // Kept as a plain reference: deleting a menu keeps sales history.
    menuId: text("menu_id").references(() => menus.id, {
      onDelete: "set null",
    }),
    // Name, photo, and price as ordered.
    name: text("name").notNull(),
    imageUrl: text("image_url").notNull().default(""),
    qty: integer("qty").notNull(),
    note: text("note").notNull().default(""),
    price: integer("price").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId, t.position),
    index("order_items_menu_idx").on(t.menuId),
  ],
);

// One row per business day; incremented atomically for each new order.
export const orderCounters = pgTable("order_counters", {
  businessDate: date("business_date", { mode: "string" }).primaryKey(),
  lastSeq: integer("last_seq").notNull().default(0),
});
