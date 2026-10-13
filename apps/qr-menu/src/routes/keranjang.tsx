import { createFileRoute } from "@tanstack/react-router";
import { cafeQuery, menuQuery } from "@/features/catalog/queries";
import { CartPage } from "@/features/checkout/components/cart-page";

// Port of design/src/pages/pelanggan-keranjang.page.html. Client-only: the customer
// session (table, cart, last order) lives in this phone's localStorage.
export const Route = createFileRoute("/keranjang")({
  ssr: false,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(cafeQuery()),
      context.queryClient.ensureQueryData(menuQuery()),
    ]),
  component: Page,
});

function Page() {
  return (
    <div data-page="pelanggan-keranjang">
      <CartPage />
    </div>
  );
}
