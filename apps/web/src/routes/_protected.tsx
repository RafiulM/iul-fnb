import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { StafRail } from "@/components/fnb/shell";
import { staffRole } from "@/lib/staff-role";

// Signed-in Kasir + Dashboard screens inside the "staf" layout.
//
// Live cashier boards that also keep device-local state (manual-order draft,
// unprinted QR list) in localStorage, so this subtree renders on the client
// only (`ssr: false`; the server sends the pending screen). Data comes from
// the API through each feature's api.ts.
export const Route = createFileRoute("/_protected")({
  ssr: false,
  beforeLoad: ({ context }) => {
    if (!context.session) throw redirect({ to: "/sign-in" });
    return {
      session: context.session,
      role: staffRole(context.session.user.role),
    };
  },
  pendingComponent: () => (
    <div className="l-staf-empty" role="status" style={{ minHeight: "60vh" }}>
      Memuat…
    </div>
  ),
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { session, role } = Route.useRouteContext();
  return (
    <div className="l-staf">
      <a className="l-staf-skip" href="#main-content">
        Lewati ke konten utama
      </a>
      <StafRail user={session.user} role={role} />
      <div className="l-staf-main" id="main-content" tabIndex={-1}>
        <Outlet />
      </div>
    </div>
  );
}
