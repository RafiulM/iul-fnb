import type { PublicOrderDto } from "@starter/shared/fnb/api";
import type { CreateQrOrderInput } from "@starter/shared/fnb/types";
import { publicFetch } from "@/lib/api";

/**
 * Send the cart to the cashier: POST /api/public/orders → the order, waiting
 * for the cashier (MENUNGGU, unpaid). Prices come from the menu.
 */
export function createQrOrder(input: CreateQrOrderInput) {
  return publicFetch<PublicOrderDto>("/api/public/orders", {
    method: "POST",
    body: input,
  });
}

/** GET /api/public/orders/:id: tracking by the order's unguessable id. */
export function getOrder(id: string) {
  return publicFetch<PublicOrderDto>(
    `/api/public/orders/${encodeURIComponent(id)}`,
  );
}
