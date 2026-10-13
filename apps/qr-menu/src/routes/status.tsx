import { createFileRoute } from "@tanstack/react-router";
import { cafeQuery } from "@/features/catalog/queries";
import { StatusPage } from "@/features/checkout/components/status-page";

// Port of design/src/pages/pelanggan-status.page.html. Client-only: the customer
// session (table, cart, last order) lives in this phone's localStorage.
export const Route = createFileRoute("/status")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(cafeQuery()),
  component: Page,
});

function Page() {
  return (
    <div data-page="pelanggan-status">
      <StatusPage />
    </div>
  );
}
