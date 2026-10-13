import { createFileRoute, redirect } from "@tanstack/react-router";
import { MenuDetail } from "@/features/browse/components/menu-detail";
import { cafeQuery, menuQuery } from "@/features/catalog/queries";

// Port of design/src/pages/pelanggan-menu.page.html. Client-only: the customer
// session (table, cart, last order) lives in this phone's localStorage.
export const Route = createFileRoute("/menu/$menuId")({
  ssr: false,
  // ?edit=<lineKey>: the cart line being changed (opened from the cart).
  validateSearch: (search: Record<string, unknown>): { edit?: string } =>
    search.edit == null ? {} : { edit: String(search.edit) },
  loader: async ({ context, params }) => {
    const [{ menus }] = await Promise.all([
      context.queryClient.ensureQueryData(menuQuery()),
      context.queryClient.ensureQueryData(cafeQuery()),
    ]);
    // Unknown menu (old link) → back to the menu list
    if (!menus.some((m) => m.id === params.menuId))
      throw redirect({ to: "/", replace: true });
  },
  component: Page,
});

function Page() {
  const { menuId } = Route.useParams();
  const { edit } = Route.useSearch();
  return (
    <div data-page="pelanggan-menu">
      <MenuDetail key={`${menuId}|${edit ?? ""}`} menuId={menuId} edit={edit} />
    </div>
  );
}
