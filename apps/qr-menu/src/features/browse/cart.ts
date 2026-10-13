import type { MenuDto } from "@starter/shared/fnb/types";
import type { CartLine } from "@/features/session/store";

// Cart rules shared by the customer screens (design: lineKey, quickAdd and
// the detail page's save). A cart line is one menu + one note; the same menu
// with the same note (case-insensitive) is merged into one line.

export const MAX_QTY = 50;
export const NOTE_MAX = 120;

export const lineKey = (menuId: string, note: string) =>
  menuId + "|" + note.trim().toLowerCase();

const clampQty = (n: number) => Math.max(1, Math.min(MAX_QTY, n));

/** Total portions of a menu across all its lines (any note). */
export const qtyOf = (cart: CartLine[], menuId: string) =>
  cart.filter((l) => l.menuId === menuId).reduce((a, l) => a + l.qty, 0);

/** Add `qty` of a menu with `note`; merges into an existing equal line. Mutates `cart`. */
export function addToCart(
  cart: CartLine[],
  menuId: string,
  qty: number,
  note = "",
) {
  const key = lineKey(menuId, note);
  const ex = cart.find((l) => lineKey(l.menuId, l.note) === key);
  if (ex) ex.qty = clampQty(ex.qty + qty);
  else cart.push({ menuId, qty: clampQty(qty), note });
}

/**
 * Replace the line `editKey` (opened from the cart) with new qty/note. If the
 * new note equals another line of the same menu, the two are merged. When the
 * line is gone (changed elsewhere) the portion is added instead. Mutates `cart`.
 */
export function saveCartLine(
  cart: CartLine[],
  editKey: string | null | undefined,
  menuId: string,
  qty: number,
  note: string,
): "merged" | "saved" | "added" {
  const idx = editKey
    ? cart.findIndex(
        (l) => l.menuId === menuId && lineKey(l.menuId, l.note) === editKey,
      )
    : -1;
  if (idx < 0) {
    addToCart(cart, menuId, qty, note);
    return "added";
  }
  const key = lineKey(menuId, note);
  const dup = cart.findIndex(
    (l, i) => i !== idx && lineKey(l.menuId, l.note) === key,
  );
  const other = dup >= 0 ? cart[dup] : undefined;
  if (other) {
    other.qty = clampQty(other.qty + qty);
    cart.splice(idx, 1);
    return "merged";
  }
  cart[idx] = { menuId, qty: clampQty(qty), note };
  return "saved";
}

/** Cart lines joined with their menu (lines whose menu was removed are dropped). */
export function cartLines(cart: CartLine[], menus: MenuDto[]) {
  const byId = new Map(menus.map((m) => [m.id, m]));
  return cart.flatMap((l) => {
    const m = byId.get(l.menuId);
    return m ? [{ ...l, key: lineKey(l.menuId, l.note), menu: m }] : [];
  });
}
