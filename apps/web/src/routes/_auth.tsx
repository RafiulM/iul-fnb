import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { AuthBrandPanel } from "@/components/auth-form";
import { siteConfig } from "@/config/site";
import { registrationQuery } from "@/features/registration/queries";

// Pathless layout for /sign-in and /sign-up (design page "login"), rendered on
// the server. Signed-in visitors go straight to the app.
//
// `signUpOpen`: public sign-up only creates the cafe's first account (the
// owner); null when the API could not say (the form then reports the error).
export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context }) => {
    if (context.session) throw redirect({ to: siteConfig.homePath });
    const signUpOpen = await context.queryClient
      .fetchQuery(registrationQuery())
      .then(
        (r) => r.open,
        () => null,
      );
    return { signUpOpen };
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
