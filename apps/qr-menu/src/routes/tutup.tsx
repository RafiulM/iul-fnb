import { createFileRoute } from "@tanstack/react-router";
import { cafeQuery } from "@/features/catalog/queries";
import { ClosedPage } from "@/features/checkout/components/closed-page";

// Port of design/src/pages/pelanggan-tutup.page.html. Client-only: the customer
// session (table, cart, last order) lives in this phone's localStorage.
export const Route = createFileRoute("/tutup")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(cafeQuery()),
  component: Page,
});

function Page() {
  return (
    <div data-page="pelanggan-tutup">
      <ClosedPage />
    </div>
  );
}
