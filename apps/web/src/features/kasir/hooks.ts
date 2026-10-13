import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { OrderDto } from "@starter/shared/fnb/types";
import { orderKeys } from "@/features/orders/queries";

/**
 * Calls `onNew` for every QR order that arrives (status MENUNGGU) while the
 * board is mounted: each fetch of today's orders is compared with the
 * previous one. Orders already there when the board opens are not "new".
 */
export function useNewQrOrders(onNew: (order: OrderDto) => void) {
  const queryClient = useQueryClient();
  const callback = useRef(onNew);
  useEffect(() => {
    callback.current = onNew;
  });

  useEffect(() => {
    const key = JSON.stringify(orderKeys.today());
    const codes = (list: OrderDto[] | undefined) =>
      new Set((list ?? []).map((o) => o.code));
    let prev = codes(queryClient.getQueryData<OrderDto[]>(orderKeys.today()));
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") return;
      if (JSON.stringify(event.query.queryKey) !== key) return;
      const list = event.query.state.data as OrderDto[] | undefined;
      for (const o of list ?? []) {
        if (prev.has(o.code)) continue;
        if (o.orderType === "QR" && o.status === "MENUNGGU")
          callback.current(o);
      }
      prev = codes(list);
    });
  }, [queryClient]);
}
