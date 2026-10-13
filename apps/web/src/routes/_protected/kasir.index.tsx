import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { KasirScreen } from "@/features/kasir/components/kasir-screen";
import { todayOrdersQuery } from "@/features/orders/queries";
import { settingsQuery } from "@/features/settings/queries";

// `flash`: a one-off toast from another Kasir screen, e.g.
// navigate({ to: "/kasir", search: { flash: "A-108 dicatat — …" } }).
// It is removed from the URL once shown.
const searchSchema = z.object({
  flash: z.string().max(200).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/kasir/")({
  head: () => ({ meta: [{ title: `Pesanan | ${siteConfig.name}` }] }),
  validateSearch: searchSchema,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(todayOrdersQuery()),
      context.queryClient.ensureQueryData(settingsQuery()),
    ]),
  component: Page,
});

function Page() {
  const { session } = Route.useRouteContext();
  const { flash } = Route.useSearch();
  const navigate = Route.useNavigate();
  const clearFlash = useCallback(
    () => void navigate({ search: {}, replace: true }),
    [navigate],
  );
  return (
    <KasirScreen
      cashierName={session.user.name}
      flash={flash}
      onFlashShown={clearFlash}
    />
  );
}
