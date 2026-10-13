import { hhmm, stockStatus, tgl } from "@starter/shared/fnb/domain";
import type {
  IngredientDto,
  MenuDto,
  RecipeItemDto,
  StockMovementDto,
  StockStatus,
  StockUnit,
} from "@starter/shared/fnb/types";

// Pure helpers for the Stok Bahan screen (ported from stok.page.html).

export const RANK: Record<StockStatus, number> = {
  HABIS: 0,
  MENIPIS: 1,
  AMAN: 2,
};
export const UNIT_NAME: Record<StockUnit, string> = {
  gram: "gram",
  ml: "ml",
  pcs: "pcs",
  botol: "botol",
};
export const UNIT_HINT: Record<StockUnit, string> = {
  gram: "Isi dalam gram · 1 kg = 1.000 g",
  ml: "Isi dalam ml · 1 L = 1.000 ml",
  pcs: "Isi jumlah buah / potong",
  botol: "Isi jumlah botol",
};
export const QUICK: Record<StockUnit, number[]> = {
  gram: [500, 1000, 5000],
  ml: [1000, 2000, 5000],
  pcs: [6, 12, 24],
  botol: [12, 24, 48],
};
export const UNITS: { value: StockUnit; label: string }[] = [
  { value: "gram", label: "gram (g)" },
  { value: "ml", label: "mililiter (ml)" },
  { value: "pcs", label: "pcs (buah / potong)" },
  { value: "botol", label: "botol" },
];

export const DAY = 864e5;
export const r2 = (n: number) => Math.round(n * 100) / 100;

type Level = Pick<IngredientDto, "stockQty" | "minStock">;
export const ratio = (i: Level) =>
  i.minStock > 0 ? i.stockQty / i.minStock : i.stockQty > 0 ? 99 : 0;
export const scaleMax = (i: Level) => Math.max(i.minStock * 2.5, i.stockQty, 1);
export const pct = (v: number, max: number) =>
  Math.max(0, Math.min(100, (v / max) * 100)).toFixed(1);

export const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "id");
export const byStatus = (a: IngredientDto, b: IngredientDto) =>
  RANK[stockStatus(a)] - RANK[stockStatus(b)];

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: string | number | Date) => {
  const x = new Date(d);
  return x.getFullYear() + "-" + pad(x.getMonth() + 1) + "-" + pad(x.getDate());
};
const sameDay = (a: string | number | Date, b: number) =>
  isoDay(a) === isoDay(b);
export const when = (d: string | number, now: number) =>
  sameDay(d, now)
    ? hhmm(d)
    : sameDay(d, now - DAY)
      ? "Kemarin " + hhmm(d)
      : tgl(d, { day: "numeric", month: "short" }) + " " + hhmm(d);
export const dayLabel = (d: string | number, now: number) =>
  sameDay(d, now)
    ? "Hari ini"
    : sameDay(d, now - DAY)
      ? "Kemarin"
      : tgl(d, { weekday: "long", day: "numeric", month: "short" });

export const joinList = (a: string[]) =>
  a.length < 2
    ? (a[0] ?? "")
    : a.slice(0, -1).join(", ") + " & " + a[a.length - 1];

export const firstName = (name: string | null) =>
  (name ?? "").split(" ")[0] ?? "";

/** Menus that cannot be sold because a recipe ingredient is short. */
export function blockedMenuIds(
  store: {
    menus: MenuDto[];
    recipeItems: RecipeItemDto[];
    ingredients: IngredientDto[];
  },
  stockOf: (ingredientId: string) => number | undefined = (id) =>
    store.ingredients.find((i) => i.id === id)?.stockQty,
) {
  return store.menus
    .filter((m) => {
      const recipe = store.recipeItems.filter((r) => r.menuId === m.id);
      return (
        recipe.length > 0 &&
        recipe.some((r) => {
          const q = stockOf(r.ingredientId);
          return q === undefined || q < r.qtyUsed;
        })
      );
    })
    .map((m) => m.id);
}

/* ---------- Movement history ---------- */

export type MoveGroup = {
  key: string;
  /** "sale": one order (several ingredients); "single": one IN/ADJUST row. */
  kind: "sale" | "single";
  type: StockMovementDto["type"];
  /** Sale: "Penjualan A-026 · 2× Kopi Susu Gula Aren"; single: the note. */
  title: string;
  note: string;
  code: string | null;
  createdAt: string;
  createdBy: string | null;
  ids: string[];
  /** Per ingredient, absolute quantities, signed by `dir`. */
  lines: { ingredientId: string; qty: number }[];
  dir: "in" | "out";
};

// consumeStockForOrder writes "Penjualan A-027 · Kopi Susu ×2" per recipe line.
const SALE = /^Penjualan (\S+) · (.+) ×(\d+(?:[.,]\d+)?)$/;

/** Newest first; one entry per sale (several ingredients at once). */
export function groupMovements(moves: StockMovementDto[]): MoveGroup[] {
  const sorted = [...moves].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const groups: MoveGroup[] = [];
  const sales = new Map<
    string,
    { group: MoveGroup; items: Map<string, string> }
  >();
  for (const m of sorted) {
    if (m.type !== "OUT") {
      groups.push({
        key: m.id,
        kind: "single",
        type: m.type,
        title: m.note,
        note: m.note,
        code: null,
        createdAt: m.createdAt,
        createdBy: m.createdBy,
        ids: [m.id],
        lines: [{ ingredientId: m.ingredientId, qty: Math.abs(m.qty) }],
        dir: m.qty < 0 ? "out" : "in",
      });
      continue;
    }
    const sale = SALE.exec(m.note);
    const code = sale?.[1] ?? null;
    const key = `${code ?? m.note}|${m.createdAt}`;
    let entry = sales.get(key);
    if (!entry) {
      entry = {
        group: {
          key,
          kind: "sale",
          type: "OUT",
          title: m.note,
          note: m.note,
          code,
          createdAt: m.createdAt,
          createdBy: m.createdBy,
          ids: [],
          lines: [],
          dir: "out",
        },
        items: new Map(),
      };
      sales.set(key, entry);
      groups.push(entry.group);
    }
    const g = entry.group;
    g.ids.push(m.id);
    const line = g.lines.find((l) => l.ingredientId === m.ingredientId);
    if (line) line.qty = r2(line.qty + Math.abs(m.qty));
    else g.lines.push({ ingredientId: m.ingredientId, qty: Math.abs(m.qty) });
    if (sale) {
      entry.items.set(sale[2]!, sale[3]!);
      g.title =
        `Penjualan ${code} · ` +
        [...entry.items].map(([name, q]) => `${q}× ${name}`).join(", ");
    }
  }
  return groups;
}
