import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { siteConfig } from "@/config/site";
import { StafPage } from "@/components/fnb/shell";
import { ManualOrder } from "@/features/kasir-manual/components/manual-order";
import { manualDraftQuery } from "@/features/kasir-manual/queries";
import { categoriesQuery, menusQuery } from "@/features/menu/queries";
import { todayOrdersQuery } from "@/features/orders/queries";
import { settingsQuery } from "@/features/settings/queries";
import { tablesQuery } from "@/features/tables/queries";

export const Route = createFileRoute("/_protected/kasir/manual")({
  head: () => ({ meta: [{ title: `Pesanan Manual | ${siteConfig.name}` }] }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(menusQuery()),
      queryClient.ensureQueryData(categoriesQuery()),
      queryClient.ensureQueryData(tablesQuery()),
      queryClient.ensureQueryData(settingsQuery()),
      queryClient.ensureQueryData(todayOrdersQuery()),
      queryClient.ensureQueryData(manualDraftQuery()),
    ]),
  component: Page,
});

function Page() {
  const { session } = Route.useRouteContext();
  return (
    <StafPage
      id="kasir-manual"
      title="Pesanan Manual"
      actions={
        <Link className="l-staf-btn" to="/kasir">
          <ArrowLeft aria-hidden="true" />
          Kembali ke pesanan
        </Link>
      }
    >
      <ManualOrder cashierName={session.user.name} />
    </StafPage>
  );
}
