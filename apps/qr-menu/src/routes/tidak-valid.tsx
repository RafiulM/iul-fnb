import { createFileRoute } from "@tanstack/react-router";
import { cafeQuery } from "@/features/catalog/queries";
import { InvalidTablePage } from "@/features/checkout/components/invalid-table-page";

// Port of design/src/pages/pelanggan-tidak-valid.page.html. Client-only: the customer
// session (table, cart, last order) lives in this phone's localStorage.
export const Route = createFileRoute("/tidak-valid")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(cafeQuery()),
  component: Page,
});

function Page() {
  return (
    <div data-page="pelanggan-tidak-valid">
      <InvalidTablePage />
    </div>
  );
}
