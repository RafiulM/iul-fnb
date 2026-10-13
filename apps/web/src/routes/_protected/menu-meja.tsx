import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { MenuMejaPage } from "@/features/menu/components/menu-meja-page";
import { categoriesQuery, menusQuery } from "@/features/menu/queries";
import { settingsQuery } from "@/features/settings/queries";
import { ingredientsQuery, recipeItemsQuery } from "@/features/stock/queries";
import { tablesQuery, unprintedTablesQuery } from "@/features/tables/queries";

export const Route = createFileRoute("/_protected/menu-meja")({
  head: () => ({ meta: [{ title: `Menu & Meja | ${siteConfig.name}` }] }),
  loader: ({ context: { queryClient, role } }) => {
    // Cashiers only see the locked state; no data needed.
    if (role !== "OWNER") return;
    return Promise.all([
      queryClient.ensureQueryData(menusQuery()),
      queryClient.ensureQueryData(categoriesQuery()),
      queryClient.ensureQueryData(tablesQuery()),
      queryClient.ensureQueryData(unprintedTablesQuery()),
      queryClient.ensureQueryData(ingredientsQuery()),
      queryClient.ensureQueryData(recipeItemsQuery()),
      queryClient.ensureQueryData(settingsQuery()),
    ]).then(() => undefined);
  },
  component: Page,
});

function Page() {
  const { session, role } = Route.useRouteContext();
  return <MenuMejaPage role={role} userName={session.user.name} />;
}
