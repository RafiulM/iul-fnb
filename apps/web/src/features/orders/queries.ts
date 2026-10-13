import { queryOptions } from "@tanstack/react-query";
import {
  getOrder,
  listTodayOrders,
  listTransactions,
  listTransactionsBetween,
} from "./api";

export const orderKeys = {
  all: ["orders"] as const,
  today: () => [...orderKeys.all, "today"] as const,
  detail: (code: string) => [...orderKeys.all, "detail", code] as const,
  transactions: () => [...orderKeys.all, "transactions"] as const,
  period: (from: string, to: string) =>
    [...orderKeys.transactions(), "period", from, to] as const,
};

export function todayOrdersQuery() {
  return queryOptions({
    queryKey: orderKeys.today(),
    queryFn: listTodayOrders,
  });
}

export function orderQuery(code: string) {
  return queryOptions({
    queryKey: orderKeys.detail(code),
    queryFn: () => getOrder(code),
  });
}

export function transactionsQuery() {
  return queryOptions({
    queryKey: orderKeys.transactions(),
    queryFn: listTransactions,
  });
}

/** Transactions of the cafe days `from`..`to` (Riwayat's selected range). */
export function transactionsPeriodQuery(from: string, to: string) {
  return queryOptions({
    queryKey: orderKeys.period(from, to),
    queryFn: () => listTransactionsBetween(from, to),
  });
}
