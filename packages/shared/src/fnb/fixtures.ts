// SAMPLE DATA for the frontend-first phase (ported from the desainpakeai
// prototype). Both apps read it through their mock api layer until the API
// serves real rows; the API can reuse it as a development seed.
import { orderCode, orderTotals, rng } from "./domain";
import type {
  CafeSettingsDto,
  IngredientDto,
  MenuCategoryDto,
  MenuDto,
  OrderDto,
  OrderItemDto,
  OrderStatus,
  PaymentMethod,
  RecipeItemDto,
  StaffDto,
  StaffRole,
  StockUnit,
  TableDto,
} from "./types";

const CREATED = "2025-02-03T08:00:00.000Z";

export const SETTINGS: CafeSettingsDto = {
  cafeName: "Kedai Senja",
  logoUrl: null,
  address: "Jl. Kaliurang Km 5, Yogyakarta",
  phone: "0812-2700-1234",
  instagram: "kedaisenja.jogja",
  // Monday → Sunday; Saturday stays open later.
  hours: Array.from({ length: 7 }, (_, i) => ({
    open: true,
    from: "08:00",
    to: i === 5 ? "23:00" : "22:00",
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

export const CATEGORIES: MenuCategoryDto[] = [
  { id: "makanan", name: "Makanan", sortOrder: 1, tile: "#FCE6D4" },
  { id: "minuman", name: "Minuman", sortOrder: 2, tile: "#E2EEDD" },
  { id: "lainnya", name: "Camilan & Lainnya", sortOrder: 3, tile: "#F7E9BE" },
];

type MenuSeed = [
  id: string,
  categoryId: string,
  name: string,
  price: number,
  imageUrl: string,
  isAvailable: boolean,
  tags: string[],
  description: string,
];

const MENU_SEED: MenuSeed[] = [
  [
    "m1",
    "makanan",
    "Nasi Goreng Kampung",
    32000,
    "🍳",
    true,
    ["Terlaris"],
    "Nasi goreng bumbu terasi, telur ceplok, ayam suwir, dan kerupuk udang.",
  ],
  [
    "m2",
    "makanan",
    "Ayam Geprek Sambal Matah",
    35000,
    "🍗",
    true,
    ["Pedas"],
    "Ayam krispi digeprek dengan sambal matah segar dan nasi hangat.",
  ],
  [
    "m3",
    "makanan",
    "Mie Goreng Jawa",
    30000,
    "🍜",
    true,
    [],
    "Mie kuning dimasak di atas arang dengan sayur, telur, dan bawang goreng.",
  ],
  [
    "m4",
    "makanan",
    "Rice Bowl Chicken Teriyaki",
    36000,
    "🍱",
    true,
    ["Baru"],
    "Potongan ayam saus teriyaki, salad kol, wijen sangrai, dan nasi pulen.",
  ],
  [
    "m5",
    "makanan",
    "Nasi Ayam Bakar Madu",
    38000,
    "🍖",
    false,
    [],
    "Ayam bakar olesan madu, lalapan segar, dan sambal bawang.",
  ],
  [
    "d1",
    "minuman",
    "Kopi Susu Gula Aren",
    22000,
    "☕",
    true,
    ["Terlaris"],
    "Espresso, susu segar, dan gula aren asli. Tersedia panas atau dingin.",
  ],
  [
    "d2",
    "minuman",
    "Es Americano",
    20000,
    "🧊",
    true,
    [],
    "Double shot espresso dengan air dingin. Ringan, bersih, tanpa gula.",
  ],
  [
    "d3",
    "minuman",
    "Matcha Latte",
    28000,
    "🍵",
    true,
    ["Baru"],
    "Matcha Jepang premium dengan susu segar yang lembut.",
  ],
  [
    "d4",
    "minuman",
    "Es Teh Manis",
    10000,
    "🥤",
    true,
    [],
    "Teh melati diseduh segar setiap pagi.",
  ],
  [
    "d5",
    "minuman",
    "Lemon Tea",
    15000,
    "🍋",
    true,
    [],
    "Teh hitam dengan perasan lemon segar dan sedikit madu.",
  ],
  [
    "d6",
    "minuman",
    "Jus Alpukat",
    25000,
    "🥑",
    false,
    [],
    "Alpukat mentega dengan susu cokelat kental manis.",
  ],
  [
    "s1",
    "lainnya",
    "Kentang Goreng",
    20000,
    "🍟",
    true,
    ["Terlaris"],
    "Kentang goreng renyah dengan saus sambal dan mayones.",
  ],
  [
    "s2",
    "lainnya",
    "Pisang Goreng Keju",
    18000,
    "🍌",
    true,
    [],
    "Pisang kepok goreng tepung dengan parutan keju dan susu.",
  ],
  [
    "s3",
    "lainnya",
    "Roti Bakar Cokelat Keju",
    22000,
    "🍞",
    true,
    [],
    "Roti tebal dipanggang mentega, isi cokelat dan keju.",
  ],
  [
    "s4",
    "lainnya",
    "Croissant Butter",
    24000,
    "🥐",
    true,
    [],
    "Croissant mentega dipanggang setiap pagi.",
  ],
  [
    "s5",
    "lainnya",
    "Air Mineral",
    8000,
    "💧",
    true,
    [],
    "Air mineral botol 600 ml.",
  ],
];

export const MENUS: MenuDto[] = MENU_SEED.map(
  ([
    id,
    categoryId,
    name,
    price,
    imageUrl,
    isAvailable,
    tags,
    description,
  ]) => ({
    id,
    categoryId,
    name,
    description,
    price,
    imageUrl,
    isAvailable,
    tags,
    createdAt: CREATED,
  }),
);

/** Popularity weights for generated sales history. */
export const MENU_WEIGHT: Record<string, number> = {
  m1: 9,
  m2: 7,
  m3: 5,
  m4: 5,
  m5: 3,
  d1: 12,
  d2: 6,
  d3: 5,
  d4: 8,
  d5: 4,
  d6: 2,
  s1: 8,
  s2: 4,
  s3: 4,
  s4: 3,
  s5: 4,
};

/** Menus suggested first on the customer menu. */
export const POPULAR_MENU_IDS = ["d1", "m1", "s1", "m2"];

/** Quick note chips per category on the customer menu. */
export const NOTE_CHIPS: Record<string, string[]> = {
  makanan: ["Tidak pedas", "Ekstra pedas", "Tanpa bawang", "Dibungkus"],
  minuman: ["Tanpa gula", "Gula sedikit", "Es sedikit", "Panas"],
  lainnya: ["Saus terpisah", "Dibungkus"],
};

export const TABLES: TableDto[] = Array.from({ length: 12 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: "t" + n,
    tableNumber: n,
    qrCode: "ks-" + (0x3a7f1 + i * 977).toString(16),
    area: i < 8 ? "Dalam" : "Teras",
    isActive: n !== "12",
  };
});

type IngredientSeed = [string, string, StockUnit, number, number];
const INGREDIENT_SEED: IngredientSeed[] = [
  ["i1", "Biji kopi espresso", "gram", 1850, 1000],
  ["i2", "Susu segar", "ml", 4200, 5000],
  ["i3", "Gula aren cair", "ml", 900, 800],
  ["i4", "Bubuk matcha", "gram", 120, 200],
  ["i5", "Teh melati", "gram", 650, 300],
  ["i6", "Gula pasir", "gram", 3200, 1000],
  ["i7", "Lemon", "pcs", 14, 10],
  ["i8", "Alpukat", "pcs", 0, 6],
  ["i9", "Beras", "gram", 12000, 5000],
  ["i10", "Ayam fillet", "gram", 3200, 2000],
  ["i11", "Ayam potong (bakar)", "pcs", 0, 8],
  ["i12", "Telur", "pcs", 42, 30],
  ["i13", "Mie kuning", "gram", 2400, 1500],
  ["i14", "Kentang beku", "gram", 1100, 2000],
  ["i15", "Pisang kepok", "pcs", 18, 12],
  ["i16", "Roti tawar tebal", "pcs", 10, 8],
  ["i17", "Croissant beku", "pcs", 16, 10],
  ["i18", "Keju cheddar", "gram", 600, 300],
  ["i19", "Air mineral 600 ml", "botol", 36, 24],
  ["i20", "Minyak goreng", "ml", 8000, 5000],
];

export const INGREDIENTS: IngredientDto[] = INGREDIENT_SEED.map(
  ([id, name, unit, stockQty, minStock]) => ({
    id,
    name,
    unit,
    stockQty,
    minStock,
  }),
);

export const RECIPE_ITEMS: RecipeItemDto[] = (
  [
    ["m1", "i9", 150],
    ["m1", "i12", 1],
    ["m1", "i10", 50],
    ["m1", "i20", 20],
    ["m2", "i10", 150],
    ["m2", "i9", 150],
    ["m2", "i20", 60],
    ["m3", "i13", 120],
    ["m3", "i12", 1],
    ["m3", "i20", 20],
    ["m4", "i10", 120],
    ["m4", "i9", 150],
    ["m5", "i11", 1],
    ["m5", "i9", 150],
    ["d1", "i1", 18],
    ["d1", "i2", 150],
    ["d1", "i3", 25],
    ["d2", "i1", 18],
    ["d3", "i4", 6],
    ["d3", "i2", 180],
    ["d4", "i5", 5],
    ["d4", "i6", 20],
    ["d5", "i5", 5],
    ["d5", "i7", 1],
    ["d6", "i8", 1],
    ["d6", "i2", 50],
    ["s1", "i14", 150],
    ["s1", "i20", 40],
    ["s2", "i15", 2],
    ["s2", "i18", 20],
    ["s2", "i20", 40],
    ["s3", "i16", 2],
    ["s3", "i18", 20],
    ["s4", "i17", 1],
    ["s5", "i19", 1],
  ] as const
).map(([menuId, ingredientId, qtyUsed], i) => ({
  id: "r" + (i + 1),
  menuId,
  ingredientId,
  qtyUsed,
}));

type StaffSeed = [
  string,
  string,
  string,
  StaffRole,
  boolean,
  string,
  number,
  string,
];
const STAFF_SEED: StaffSeed[] = [
  // last login given as minutes ago
  [
    "u1",
    "Iul Rahman",
    "iul@kedaisenja.id",
    "OWNER",
    true,
    "2025-02-03",
    6,
    "#D2552A",
  ],
  [
    "u2",
    "Rina Kartika",
    "rina@kedaisenja.id",
    "CASHIER",
    true,
    "2025-03-10",
    42,
    "#2F7D50",
  ],
  [
    "u3",
    "Dimas Pratama",
    "dimas@kedaisenja.id",
    "CASHIER",
    true,
    "2025-08-21",
    26 * 60,
    "#2C5597",
  ],
  [
    "u4",
    "Sari Wulandari",
    "sari@kedaisenja.id",
    "CASHIER",
    false,
    "2025-04-02",
    40 * 1440,
    "#9A6212",
  ],
];

export function seedStaff(now = Date.now()): StaffDto[] {
  return STAFF_SEED.map(
    ([id, name, email, role, isActive, created, lastMins, color]) => ({
      id,
      name,
      email,
      role,
      isActive,
      createdAt: new Date(created).toISOString(),
      lastLoginAt: new Date(now - lastMins * 60e3).toISOString(),
      color,
    }),
  );
}

export type PermissionKey =
  | "pos"
  | "payment"
  | "stock_view"
  | "stock_in"
  | "menu"
  | "tables"
  | "report"
  | "staff"
  | "settings";

/** What each role may do (PRD "Atur Peran Pengguna"). */
export const PERMISSIONS: {
  key: PermissionKey;
  label: string;
  OWNER: boolean;
  CASHIER: boolean;
}[] = [
  {
    key: "pos",
    label: "Buka layar kasir & proses pesanan",
    OWNER: true,
    CASHIER: true,
  },
  {
    key: "payment",
    label: "Terima pembayaran & cetak struk",
    OWNER: true,
    CASHIER: true,
  },
  {
    key: "stock_view",
    label: "Lihat sisa stok bahan",
    OWNER: true,
    CASHIER: true,
  },
  { key: "stock_in", label: "Catat bahan masuk", OWNER: true, CASHIER: true },
  {
    key: "menu",
    label: "Ubah menu, harga & ketersediaan",
    OWNER: true,
    CASHIER: false,
  },
  { key: "tables", label: "Atur meja & cetak QR", OWNER: true, CASHIER: false },
  {
    key: "report",
    label: "Lihat laporan penjualan",
    OWNER: true,
    CASHIER: false,
  },
  { key: "staff", label: "Kelola akun staf", OWNER: true, CASHIER: false },
  {
    key: "settings",
    label: "Ubah pengaturan kafe",
    OWNER: true,
    CASHIER: false,
  },
];

/* ---------- Orders ---------- */

const menuById = new Map(MENUS.map((m) => [m.id, m]));
const tableByNumber = new Map(TABLES.map((t) => [t.tableNumber, t]));

function itemFor(
  menuId: string,
  qty: number,
  note = "",
  key = "",
): OrderItemDto {
  const m = menuById.get(menuId)!;
  return {
    id: `${key}-${menuId}`,
    menuId,
    name: m.name,
    imageUrl: m.imageUrl,
    qty,
    note,
    price: m.price,
  };
}

type OrderInit = {
  /** Defaults to "o-<code>"; history rows add the day so ids stay unique. */
  id?: string;
  seq: number;
  orderType: "QR" | "MANUAL";
  table: string | null;
  items: [menuId: string, qty: number, note?: string][];
  status: OrderStatus;
  createdAt: Date;
  customerName?: string;
  paid?: { method: PaymentMethod; channel?: string; amount?: number };
  cashierName?: string;
  cancelReason?: string;
};

const later = (from: Date, mins: number) =>
  new Date(Math.min(from.getTime() + mins * 60000, Date.now())).toISOString();

export function buildOrder(o: OrderInit, settings = SETTINGS): OrderDto {
  const code = orderCode(o.seq);
  const items = o.items.map(([menuId, qty, note]) =>
    itemFor(menuId, qty, note, code),
  );
  const t = orderTotals(items, settings);
  const table = o.table ? tableByNumber.get(o.table) : undefined;
  const at = o.createdAt.toISOString();
  return {
    id: o.id ?? "o-" + code,
    code,
    tableId: table?.id ?? null,
    tableNumber: o.table,
    orderType: o.orderType,
    status: o.status,
    customerName: o.customerName ?? null,
    items,
    subtotal: t.subtotal,
    tax: t.tax,
    service: t.service,
    totalAmount: t.total,
    paymentStatus: o.paid ? "LUNAS" : "BELUM",
    paymentMethod: o.paid?.method ?? null,
    paymentChannel: o.paid?.channel ?? null,
    paidAmount: o.paid ? (o.paid.amount ?? t.total) : null,
    cancelReason: o.cancelReason ?? null,
    cashierName: o.cashierName ?? null,
    createdAt: at,
    updatedAt: at,
    // Finished history: paid ~20 min and closed ~25 min after ordering (never
    // in the future); an order paid upfront on the board was paid at once.
    paidAt: o.paid ? later(o.createdAt, o.status === "SELESAI" ? 20 : 1) : null,
    completedAt:
      o.status === "SELESAI" || o.status === "DIBATALKAN"
        ? later(o.createdAt, 25)
        : null,
  };
}

/** Today's open orders on the cashier board (A-101…A-107; new orders continue at A-108). */
export function seedActiveOrders(now = Date.now()): OrderDto[] {
  const ago = (m: number) => new Date(now - m * 60000);
  const rows: OrderInit[] = [
    {
      seq: 101,
      orderType: "QR",
      table: "05",
      items: [
        ["m3", 1],
        ["d2", 1],
        ["s5", 1],
      ],
      status: "DIANTAR",
      createdAt: ago(38),
    },
    {
      seq: 102,
      orderType: "QR",
      table: "02",
      items: [
        ["m4", 2],
        ["d5", 2],
      ],
      status: "DIANTAR",
      createdAt: ago(31),
    },
    {
      seq: 103,
      orderType: "QR",
      table: "09",
      items: [
        ["d1", 2, "1 panas, 1 dingin"],
        ["s1", 1],
      ],
      status: "SIAP",
      createdAt: ago(19),
    },
    {
      seq: 104,
      orderType: "MANUAL",
      table: null,
      customerName: "Budi",
      items: [
        ["m1", 1, "Dibungkus"],
        ["d4", 1],
      ],
      status: "DIPROSES",
      paid: { method: "NON_CASH", channel: "QRIS", amount: 46200 },
      cashierName: "Rina Kartika",
      createdAt: ago(14),
    },
    {
      seq: 105,
      orderType: "QR",
      table: "07",
      items: [
        ["m2", 1, "Ekstra pedas"],
        ["d4", 2],
      ],
      status: "DIPROSES",
      createdAt: ago(17),
    },
    {
      seq: 106,
      orderType: "QR",
      table: "03",
      items: [
        ["m1", 2, "Tidak pedas"],
        ["d3", 1],
        ["s2", 1],
      ],
      status: "MENUNGGU",
      createdAt: ago(3),
    },
    {
      seq: 107,
      orderType: "QR",
      table: "10",
      items: [
        ["d1", 1, "Es sedikit"],
        ["s4", 1],
      ],
      status: "MENUNGGU",
      createdAt: ago(1),
    },
  ];
  return rows.map((r) => buildOrder(r));
}

/** Last order number already used today. */
export const LAST_ORDER_SEQ = 107;

/**
 * Deterministic finished-order history for `days` days up to now (newest
 * first), for the sales dashboard and transaction history.
 */
export function generateTransactions(days = 60, now = Date.now()): OrderDto[] {
  const r = rng(20261011);
  const pool = MENUS.flatMap(
    (m) => Array(MENU_WEIGHT[m.id] || 1).fill(m) as MenuDto[],
  );
  const pickMenu = () => pool[Math.floor(r() * pool.length)]!;
  // Busy hours between 08:00 and 22:00.
  const hourW = [
    0, 0, 0, 0, 0, 0, 0, 0, 3, 4, 5, 7, 10, 9, 6, 5, 6, 8, 10, 9, 7, 5, 3, 0,
  ];
  const hourPool = hourW.flatMap((w, h) => Array(w).fill(h) as number[]);
  const cashiers = STAFF_SEED.filter((s) => s[3] === "CASHIER").map(
    (s) => s[1],
  );
  const out: OrderDto[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(today);
    day.setDate(today.getDate() - d);
    const dow = day.getDay();
    const dayKey = `${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, "0")}${String(day.getDate()).padStart(2, "0")}`;
    const weekend = dow === 0 || dow === 6;
    const trend = 1 + ((days - d) / days) * 0.12;
    const n = Math.round((weekend ? 58 : 40) * trend * (0.85 + r() * 0.3));
    const times = Array.from({ length: n }, () => {
      const t = new Date(day);
      t.setHours(
        hourPool[Math.floor(r() * hourPool.length)]!,
        Math.floor(r() * 60),
        Math.floor(r() * 60),
      );
      return t;
    })
      .filter((t) => t.getTime() <= now)
      .sort((a, b) => a.getTime() - b.getTime());
    times.forEach((t, i) => {
      const lines = new Map<string, [string, number]>();
      const k = 1 + Math.floor(r() * r() * 4);
      for (let j = 0; j < k; j++) {
        const m = pickMenu();
        const line = lines.get(m.id) ?? [m.id, 0];
        line[1] += r() < 0.8 ? 1 : 2;
        lines.set(m.id, line);
      }
      const qr = r() < 0.7;
      const cancelled = r() < 0.02;
      const table =
        qr || r() < 0.5 ? TABLES[Math.floor(r() * 11)]!.tableNumber : null;
      const method: PaymentMethod = r() < 0.4 ? "CASH" : "NON_CASH";
      const cashierName = cashiers[Math.floor(r() * 2)]!;
      out.push(
        buildOrder({
          id: `o-${dayKey}-${orderCode(i + 1)}`,
          seq: i + 1,
          orderType: qr ? "QR" : "MANUAL",
          table,
          items: [...lines.values()],
          status: cancelled ? "DIBATALKAN" : "SELESAI",
          createdAt: t,
          paid: cancelled
            ? undefined
            : { method, channel: method === "NON_CASH" ? "QRIS" : undefined },
          cashierName,
          cancelReason: cancelled ? "Pelanggan membatalkan" : undefined,
        }),
      );
    });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
