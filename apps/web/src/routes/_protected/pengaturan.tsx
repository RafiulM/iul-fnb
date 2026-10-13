import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { categoriesQuery, menusQuery } from "@/features/menu/queries";
import { PengaturanLocked } from "@/features/settings/components/pengaturan-locked";
import { PengaturanPage } from "@/features/settings/components/pengaturan-page";
import { settingsQuery } from "@/features/settings/queries";

export const Route = createFileRoute("/_protected/pengaturan")({
  head: () => ({ meta: [{ title: `Pengaturan Kafe | ${siteConfig.name}` }] }),
  loader: ({ context }) => {
    if (context.role !== "OWNER") return;
    return Promise.all([
      context.queryClient.ensureQueryData(settingsQuery()),
      context.queryClient.ensureQueryData(menusQuery()),
      context.queryClient.ensureQueryData(categoriesQuery()),
    ]);
  },
  component: Page,
});

function Page() {
  const { session, role } = Route.useRouteContext();
  // Owner-only (PRD Fase 4): cashiers see the prototype's locked state.
  if (role === "CASHIER")
    return <PengaturanLocked userName={session.user.name} />;
  return <PengaturanPage userName={session.user.name} />;
}
