import { createFileRoute, redirect } from "@tanstack/react-router";
import { isOpenAt } from "@starter/shared/fnb/domain";
import { cafeQuery } from "@/features/catalog/queries";
import { ClosedPage } from "@/features/checkout/components/closed-page";

// Port of design/src/pages/pelanggan-tutup.page.html. Client-only: the customer
// session (table, cart, last order) lives in this phone's localStorage.
export const Route = createFileRoute("/tutup")({
  ssr: false,
  // Only outside opening hours: an old link or tab goes back to the menu.
  beforeLoad: async ({ context, preload }) => {
    const cafe = await context.queryClient.ensureQueryData(cafeQuery());
    if (!preload && isOpenAt(cafe)) throw redirect({ to: "/", replace: true });
  },
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
