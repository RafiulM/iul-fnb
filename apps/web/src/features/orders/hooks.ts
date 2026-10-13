import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type {
  CreateManualOrderInput,
  PayOrderInput,
} from "@starter/shared/fnb/types";
import { menuKeys } from "@/features/menu/queries";
import { stockKeys } from "@/features/stock/queries";
import { advanceOrder, cancelOrder, createManualOrder, payOrder } from "./api";
import {
  orderKeys,
  todayOrdersQuery,
  transactionsPeriodQuery,
  transactionsQuery,
} from "./queries";

// Finishing an order deducts stock (and may mark menus habis), so order
// mutations refresh stock and menus too.
function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      queryClient.invalidateQueries({ queryKey: stockKeys.all }),
      queryClient.invalidateQueries({ queryKey: menuKeys.all }),
    ]);
}

/**
 * Today's orders; polls like a live board while mounted, also in a
 * background tab so new QR orders still chime.
 */
export function useTodayOrders(options: { live?: boolean } = {}) {
  return useSuspenseQuery({
    ...todayOrdersQuery(),
    refetchInterval: options.live ? 5000 : false,
    refetchIntervalInBackground: options.live,
  });
}

export function useTodayOrdersMaybe() {
  return useQuery(todayOrdersQuery());
}

export function useTransactions() {
  return useSuspenseQuery(transactionsQuery());
}

export function useTransactionsPeriod(from: string, to: string) {
  return useSuspenseQuery(transactionsPeriodQuery(from, to));
}

export function useAdvanceOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({ mutationFn: advanceOrder, onSuccess: invalidate });
}

export function useCancelOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ code, reason }: { code: string; reason: string }) =>
      cancelOrder(code, reason),
    onSuccess: invalidate,
  });
}

export function usePayOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: ({ code, input }: { code: string; input: PayOrderInput }) =>
      payOrder(code, input),
    onSuccess: invalidate,
  });
}

export function useCreateManualOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (input: CreateManualOrderInput) => createManualOrder(input),
    onSuccess: invalidate,
  });
}
