import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { AuthBrandPanel } from "@/components/auth-form";
import { siteConfig } from "@/config/site";

// Pathless layout for /sign-in and /sign-up (design page "login"), rendered on
// the server. Signed-in visitors go straight to the app.
export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: siteConfig.homePath });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const signingUp = useLocation({
    select: (location) => location.pathname.startsWith("/sign-up"),
  });
  return (
    <div data-page="login">
      <main
        id="main-content"
        className="p-login"
        aria-label={signingUp ? "Buat akun" : "Masuk"}
      >
        <AuthBrandPanel />
        <div className="lg-main">
          <Outlet />
          <p className="lg-foot">
            Didukung oleh <strong>{siteConfig.name}</strong>
          </p>
        </div>
      </main>
    </div>
  );
}
