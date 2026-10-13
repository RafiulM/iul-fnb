import type { StaffOrderDto } from "@starter/shared/fnb/api";
import type {
  CreateManualOrderInput,
  PayOrderInput,
} from "@starter/shared/fnb/types";
import type { DataResponse, Paginated } from "@starter/shared/types";
import { apiFetch } from "@/lib/api/client";
import { cafeDate, cafeDaysAgo } from "@/lib/cafe-date";

// /api/orders and /api/transactions. Order flow: MENUNGGU → DIPROSES → SIAP →
// DIANTAR; paid + DIANTAR = SELESAI (the API enforces every step).

const path = (code: string) => `/api/orders/${encodeURIComponent(code)}`;

/** GET /api/orders?date=today — every order of today, oldest first. */
export async function listTodayOrders() {
  const res = await apiFetch<DataResponse<StaffOrderDto[]>>("/api/orders", {
    query: { date: "today" },
  });
  return res.data;
}

/** GET /api/orders/:code */
export async function getOrder(code: string) {
  return (await apiFetch<DataResponse<StaffOrderDto>>(path(code))).data;
}

/**
 * Days of history the dashboards read: "30 hari" or "Bulan ini" plus the
 * period before it for the comparison.
 */
export const HISTORY_DAYS = 62;
const PAGE_SIZE = 200;

/**
 * Finished and cancelled orders of the last HISTORY_DAYS cafe days, newest
 * first. Penjualan aggregates them in the browser.
 */
export function listTransactions() {
  return listTransactionsBetween(cafeDaysAgo(HISTORY_DAYS - 1), cafeDate());
}

/**
 * Finished and cancelled orders whose cafe day is between `from` and `to`
 * ("YYYY-MM-DD", inclusive), newest first. Every page of GET
 * /api/transactions is read so totals cover the whole period.
 */
export async function listTransactionsBetween(from: string, to: string) {
  const all: StaffOrderDto[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await apiFetch<Paginated<StaffOrderDto>>("/api/transactions", {
      query: { from, to, limit: PAGE_SIZE, offset },
    });
    all.push(...page.data);
    if (!page.meta.hasMore) return all;
  }
}

/** POST /api/orders/:code/advance — next step on the board. */
export async function advanceOrder(code: string) {
  const res = await apiFetch<DataResponse<StaffOrderDto>>(
    `${path(code)}/advance`,
    {
      method: "POST",
    },
  );
  return res.data;
}

/** POST /api/orders/:code/cancel */
export async function cancelOrder(code: string, reason: string) {
  const res = await apiFetch<DataResponse<StaffOrderDto>>(
    `${path(code)}/cancel`,
    {
      method: "POST",
      body: { reason },
    },
  );
  return res.data;
}

/** POST /api/orders/:code/payment */
export async function payOrder(code: string, input: PayOrderInput) {
  const res = await apiFetch<DataResponse<StaffOrderDto>>(
    `${path(code)}/payment`,
    {
      method: "POST",
      body: input,
    },
  );
  return res.data;
}

/** POST /api/orders — walk-in order recorded by the cashier; starts at DIPROSES. */
export async function createManualOrder(input: CreateManualOrderInput) {
  const res = await apiFetch<DataResponse<StaffOrderDto>>("/api/orders", {
    method: "POST",
    body: input,
  });
  return res.data;
}
