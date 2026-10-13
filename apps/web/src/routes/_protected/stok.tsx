import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { menusQuery } from "@/features/menu/queries";
import { StockPage } from "@/features/stock/components/stock-page";
import {
  ingredientsQuery,
  recipeItemsQuery,
  stockMovementsQuery,
} from "@/features/stock/queries";

export const Route = createFileRoute("/_protected/stok")({
  head: () => ({ meta: [{ title: `Stok Bahan | ${siteConfig.name}` }] }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(ingredientsQuery()),
      queryClient.ensureQueryData(recipeItemsQuery()),
      queryClient.ensureQueryData(stockMovementsQuery()),
      queryClient.ensureQueryData(menusQuery()),
    ]),
  component: Page,
});

function Page() {
  const { role } = Route.useRouteContext();
  return <StockPage role={role} />;
}
