// IUL FnB data contract (PRD §6), shared by the QR Menu app, the Kasir +
// Dashboard app, and later the API. Timestamps cross the wire as ISO strings.

export type StaffRole = "OWNER" | "CASHIER";

export type OrderStatus =
  "MENUNGGU" | "DIPROSES" | "SIAP" | "DIANTAR" | "SELESAI" | "DIBATALKAN";
export type OrderType = "QR" | "MANUAL";
export type PaymentStatus = "BELUM" | "LUNAS";
export type PaymentMethod = "CASH" | "NON_CASH";

export type StockUnit = "gram" | "ml" | "pcs" | "botol";
export type StockStatus = "AMAN" | "MENIPIS" | "HABIS";
export type StockMovementType = "IN" | "OUT" | "ADJUST";

export type MenuCategoryDto = {
  id: string;
  name: string;
  sortOrder: number;
  /** Background tint for menu tiles in this category. */
  tile: string;
};

export type MenuDto = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  /** An emoji placeholder until real photos are uploaded. */
  imageUrl: string;
  isAvailable: boolean;
  tags: string[];
  createdAt: string;
};

export type TableDto = {
  id: string;
  tableNumber: string;
  /** Unique token printed in the table's QR code. */
  qrCode: string;
  area: string;
  isActive: boolean;
};

export type IngredientDto = {
  id: string;
  name: string;
  unit: StockUnit;
  stockQty: number;
  minStock: number;
};

export type RecipeItemDto = {
  id: string;
  menuId: string;
  ingredientId: string;
  qtyUsed: number;
};

export type StockMovementDto = {
  id: string;
  ingredientId: string;
  /** Positive for IN, negative for OUT. */
  qty: number;
  type: StockMovementType;
  note: string;
  createdAt: string;
  createdBy: string | null;
};

export type OrderItemDto = {
  id: string;
  menuId: string;
  /** Name and price as ordered, so later menu edits never rewrite history. */
  name: string;
  imageUrl: string;
  qty: number;
  note: string;
  price: number;
};

export type OrderDto = {
  id: string;
  /** Human-facing order number, e.g. "A-027". */
  code: string;
  tableId: string | null;
  tableNumber: string | null;
  orderType: OrderType;
  status: OrderStatus;
  customerName: string | null;
  items: OrderItemDto[];
  subtotal: number;
  tax: number;
  service: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  /** E-wallet/QRIS/card label for non-cash payments. */
  paymentChannel: string | null;
  paidAmount: number | null;
  cancelReason: string | null;
  cashierName: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  /** When it became SELESAI or DIBATALKAN. */
  completedAt: string | null;
};

export type StaffDto = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  /** Avatar color. */
  color: string;
};

export type OpeningHoursDto = { open: boolean; from: string; to: string };

export type ReceiptFormatDto = {
  showLogo: boolean;
  showAddress: boolean;
  showTable: boolean;
  showCashier: boolean;
  showNotes: boolean;
  header: string;
  footer: string;
  paperMm: 58 | 80;
};

export type CafeSettingsDto = {
  cafeName: string;
  logoUrl: string | null;
  address: string;
  phone: string;
  instagram: string;
  /** Monday first, seven entries. */
  hours: OpeningHoursDto[];
  taxPercent: number;
  servicePercent: number;
  /** Prices already include tax. */
  taxInclusive: boolean;
  receipt: ReceiptFormatDto;
};

// Request bodies (frontend-first: the API implements these later).

export type CreateOrderItemInput = {
  menuId: string;
  qty: number;
  note: string;
};

export type CreateQrOrderInput = {
  qrCode: string;
  items: CreateOrderItemInput[];
};

export type CreateManualOrderInput = {
  tableId: string | null;
  customerName: string | null;
  items: CreateOrderItemInput[];
};

export type PayOrderInput = {
  method: PaymentMethod;
  channel: string | null;
  paidAmount: number;
};
