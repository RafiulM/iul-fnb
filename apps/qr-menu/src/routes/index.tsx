import { createFileRoute, redirect } from "@tanstack/react-router";
import { MenuHome } from "@/features/browse/components/menu-home";
import { mustClose } from "@/features/browse/hours";
import { applyUrlTable } from "@/features/browse/table";
import { cafeQuery, menuQuery } from "@/features/catalog/queries";
import { isOpenAt } from "@starter/shared/fnb/domain";
import {
  readSession,
  useCustomerSession,
  writeSession,
} from "@/features/session/store";

// Port of design/src/pages/pelanggan.page.html. Client-only: the customer
// session (table, cart, last order) lives in this phone's localStorage.
export const Route = createFileRoute("/")({
  ssr: false,
  // ?meja=07 from the table QR (numbers may arrive parsed as 7).
  validateSearch: (search: Record<string, unknown>): { meja?: string } =>
    search.meja == null ? {} : { meja: String(search.meja) },
  // Design applyUrlTable() + mustClose(): apply the QR table to the session,
  // then drop ?meja from the URL so a reload keeps the session's table.
  beforeLoad: async ({ search, context, preload }) => {
    const cafe = await context.queryClient.ensureQueryData(cafeQuery());
    if (preload) return;
    if (!(await applyUrlTable(search.meja)))
      throw redirect({ to: "/tidak-valid", replace: true });
    const session = readSession();
    if (mustClose(session, cafe))
      throw redirect({ to: "/tutup", replace: true });
    // "Lihat menu saja" lasts until the cafe opens; next closing shows /tutup again.
    if (session.browseOnly && isOpenAt(cafe))
      writeSession({ ...session, browseOnly: false });
    if (search.meja != null)
      throw redirect({ to: "/", search: {}, replace: true });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(menuQuery()),
  component: Page,
});

function Page() {
  // A new table (another QR scanned while open) starts the page fresh.
  const [session] = useCustomerSession();
  return (
    <div data-page="pelanggan">
      <MenuHome key={session.table} />
    </div>
  );
}
