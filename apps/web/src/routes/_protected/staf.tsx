import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { StaffScreen } from "@/features/staff/components/staff-screen";
import {
  staffMembersQuery,
  staffPermissionsQuery,
} from "@/features/staff/queries";

// design/src/pages/staf.page.html — owner only; cashiers see the locked state.
export const Route = createFileRoute("/_protected/staf")({
  head: () => ({ meta: [{ title: `Akun & Staf | ${siteConfig.name}` }] }),
  loader: ({ context }) =>
    context.role === "OWNER"
      ? Promise.all([
          context.queryClient.ensureQueryData(staffMembersQuery()),
          context.queryClient.ensureQueryData(staffPermissionsQuery()),
        ])
      : undefined,
  component: Page,
});

function Page() {
  const { session, role } = Route.useRouteContext();
  return <StaffScreen role={role} user={session.user} />;
}
