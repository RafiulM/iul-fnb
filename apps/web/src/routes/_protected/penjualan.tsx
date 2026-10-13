import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { transactionsQuery } from "@/features/orders/queries";
import { settingsQuery } from "@/features/settings/queries";
import {
  SalesDashboard,
  SalesLocked,
} from "@/features/sales/components/sales-page";

export const Route = createFileRoute("/_protected/penjualan")({
  head: () => ({ meta: [{ title: `Penjualan | ${siteConfig.name}` }] }),
  // `?jam=07:30` previews the dashboard as of that time today (prototype preview).
  validateSearch: (search: Record<string, unknown>): { jam?: string } =>
    typeof search.jam === "string" ? { jam: search.jam } : {},
  loader: async ({ context }) => {
    if (context.role !== "OWNER") return;
    await Promise.all([
      context.queryClient.ensureQueryData(transactionsQuery()),
      context.queryClient.ensureQueryData(settingsQuery()),
    ]);
  },
  component: Page,
});

function Page() {
  const { session, role } = Route.useRouteContext();
  const { jam } = Route.useSearch();
  if (role === "CASHIER") return <SalesLocked userName={session.user.name} />;
  return <SalesDashboard jam={jam} />;
}
