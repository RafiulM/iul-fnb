// API response shapes added by the backend on top of ./types (PRD §6).
// Timestamps cross the wire as ISO strings.
import type {
  CafeSettingsDto,
  MenuCategoryDto,
  MenuDto,
  OrderDto,
  PaymentMethod,
  OrderType,
  StaffDto,
} from "./types";

/* ---------- Public (customer QR Menu app, no account) ---------- */

/** Cafe profile shown to customers: settings without the receipt format. */
export type PublicCafeDto = Omit<CafeSettingsDto, "receipt">;

export type PublicMenuDto = {
  categories: MenuCategoryDto[];
  menus: MenuDto[];
  /** Best sellers over the last 7 days, most popular first (max 4). */
  popularMenuIds: string[];
};

export type PublicTableDto = { tableNumber: string; area: string };

/** When each step of the customer's tracking timeline was reached. */
export type OrderTimelineDto = {
  createdAt: string;
  acceptedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
};

/** What the customer may see about their own order (tracked by its id). */
export type PublicOrderDto = Pick<
  OrderDto,
  | "id"
  | "code"
  | "tableNumber"
  | "status"
  | "items"
  | "subtotal"
  | "tax"
  | "service"
  | "totalAmount"
  | "paymentStatus"
  | "cancelReason"
  | "createdAt"
  | "updatedAt"
> & { timeline: OrderTimelineDto };

/* ---------- Staff app ---------- */

/** Board order plus its timeline (for "late" flags and receipts). */
export type StaffOrderDto = OrderDto & { timeline: OrderTimelineDto };

export type SalesSummaryDto = {
  /** Revenue of finished (SELESAI) orders. */
  revenue: number;
  orders: number;
  averageOrder: number;
  cancelled: number;
};

export type SalesBucketDto = {
  /** "YYYY-MM-DD" for daily buckets, "YYYY-MM-DDTHH" for hourly ones. */
  bucket: string;
  revenue: number;
  orders: number;
};

export type TopMenuDto = {
  menuId: string | null;
  name: string;
  imageUrl: string;
  qty: number;
  revenue: number;
};

export type SplitDto = { count: number; amount: number };

export type SalesReportDto = {
  /** Inclusive range in the cafe's time zone, "YYYY-MM-DD". */
  from: string;
  to: string;
  timeZone: string;
  summary: SalesSummaryDto;
  bucket: "hour" | "day";
  series: SalesBucketDto[];
  topMenus: TopMenuDto[];
  /** Total portions sold in the range, for "share of portions". */
  totalQty: number;
  payment: Record<PaymentMethod, SplitDto>;
  source: Record<OrderType, SplitDto>;
  /** Orders per weekday (0 = Sunday) and hour, summed over the range. */
  heatmap: { dow: number; hour: number; orders: number }[];
  /** One row per day: for the "daily" CSV export. */
  daily: {
    date: string;
    orders: number;
    revenue: number;
    cash: number;
    nonCash: number;
  }[];
};

/** A staff row plus whether the account can sign in yet. */
export type StaffAccountDto = StaffDto & {
  /** True until the owner sets a password for the account. */
  invited: boolean;
  /** The earliest owner: cannot be deactivated or demoted. */
  isPrimaryOwner: boolean;
};
