import { useMutation } from "@tanstack/react-query";
import { createQrOrder } from "@/features/orders/api";

/** Send the cart to the cashier (POST /api/public/orders). */
export const useSendOrder = () => useMutation({ mutationFn: createQrOrder });
