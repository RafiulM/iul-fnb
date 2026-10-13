import { useCallback, useSyncExternalStore } from "react";
import type { PublicOrderDto } from "@starter/shared/fnb/api";

// The customer's session on this phone (design: localStorage "iulfnb:cust",
// v1): which table they scanned, their cart, and their last order. Shared by
// every customer screen. Screens read it with useCustomerSession() and change
// it with update(draft => { … }).

export type CartLine = { menuId: string; qty: number; note: string };

export type CustomerSession = {
  v: 1;
  /** Table number from the QR ("07"). */
  table: string;
  /** What the QR carried (token or number), sent with orders. */
  qr: string;
  cart: CartLine[];
  /** Order sent from this table, tracked on the status screen. */
  order: PublicOrderDto | null;
  /** Cafe closed: customer chose "lihat menu saja" (browse only). */
  browseOnly: boolean;
  /** Prototype escape hatch: order even outside opening hours. */
  forceOpen: boolean;
  /** Table number from an invalid/inactive QR, for the "tidak valid" screen. */
  invalidTable: string | null;
  updatedAt: string;
};

const KEY = "iulfnb:cust";

export const emptySession = (table = "", qr = table): CustomerSession => ({
  v: 1,
  table,
  qr,
  cart: [],
  order: null,
  browseOnly: false,
  forceOpen: false,
  invalidTable: null,
  updatedAt: new Date().toISOString(),
});

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: CustomerSession } | undefined;

function read(): CustomerSession {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  if (cache && cache.raw === raw) return cache.value;
  let value = emptySession();
  try {
    const parsed = raw ? (JSON.parse(raw) as CustomerSession) : null;
    if (parsed?.v === 1) {
      value = { ...emptySession(), ...parsed };
      value.qr ||= value.table;
    }
    // Orders saved by the prototype (no API id/timeline) cannot be tracked.
    if (value.order && !value.order.timeline) value.order = null;
  } catch {
    /* corrupt: start over */
  }
  cache = { raw, value };
  return value;
}

export function writeSession(next: CustomerSession) {
  const value = { ...next, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage blocked: keep in memory */
  }
  cache = { raw: JSON.stringify(value), value };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    removeEventListener("storage", onStorage);
  };
}

const serverSnapshot = emptySession();

/** `const [session, update] = useCustomerSession(); update(s => { s.cart.push(…) })` */
export function useCustomerSession() {
  const session = useSyncExternalStore(subscribe, read, () => serverSnapshot);
  const update = useCallback((mutate: (draft: CustomerSession) => void) => {
    const draft = structuredClone(read());
    mutate(draft);
    writeSession(draft);
  }, []);
  return [session, update] as const;
}

export const readSession = read;
