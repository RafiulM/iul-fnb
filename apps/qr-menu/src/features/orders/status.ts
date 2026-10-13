import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PublicOrderDto } from "@starter/shared/fnb/api";
import type { OrderStatus } from "@starter/shared/fnb/types";
import { useCustomerSession } from "@/features/session/store";
import { getOrder } from "./api";

// The customer's tracking timeline follows the cashier board: the order is
// polled from the API while it is still moving.

export const STEP_KEYS: OrderStatus[] = [
  "MENUNGGU",
  "DIPROSES",
  "SIAP",
  "DIANTAR",
];

const POLL_MS = 5000;

const isOpen = (o: PublicOrderDto) =>
  o.status !== "SELESAI" && o.status !== "DIBATALKAN";

/** 0..3 = index into STEP_KEYS, plus when each step was reached. */
export function orderStep(o: PublicOrderDto) {
  const t = o.timeline;
  const times = [t.createdAt, t.acceptedAt, t.readyAt, t.deliveredAt];
  const idx =
    o.status === "SELESAI"
      ? 3
      : o.status === "DIBATALKAN"
        ? Math.max(0, times.filter(Boolean).length - 1)
        : Math.max(0, STEP_KEYS.indexOf(o.status));
  return { idx, times };
}

/**
 * Keeps the session's order in step with the API while a screen showing it
 * is open. Stops polling once the order is finished or cancelled.
 */
export function useTrackedOrder() {
  const [session, update] = useCustomerSession();
  const order = session.order;
  const { data } = useQuery({
    queryKey: ["order", order?.id],
    queryFn: () => getOrder(order!.id),
    enabled: !!order,
    initialData: order ?? undefined,
    initialDataUpdatedAt: 0,
    refetchInterval: (q) =>
      q.state.data && isOpen(q.state.data) ? POLL_MS : false,
    refetchIntervalInBackground: true,
  });
  useEffect(() => {
    if (!data || !order || data.id !== order.id) return;
    if (data.updatedAt === order.updatedAt && data.status === order.status)
      return;
    update((s) => {
      if (s.order?.id === data.id) s.order = data;
    });
  }, [data, order, update]);
  return order;
}
