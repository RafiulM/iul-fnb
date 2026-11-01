import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthForm, SIGN_UP_CLOSED_MSG } from "@/components/auth-form";
import { siteConfig } from "@/config/site";

// ?daftar=tutup: sent here from /sign-up after the owner account exists.
const searchSchema = z.object({
  daftar: z.literal("tutup").optional().catch(undefined),
});

export const Route = createFileRoute("/_auth/sign-in")({
  head: () => ({ meta: [{ title: `Masuk | ${siteConfig.name}` }] }),
  validateSearch: searchSchema,
  component: Page,
});

function Page() {
  const { signUpOpen } = Route.useRouteContext();
  const { daftar } = Route.useSearch();
  return (
    <AuthForm
      key="sign-in"
      mode="sign-in"
      signUpOpen={signUpOpen}
      notice={daftar === "tutup" ? SIGN_UP_CLOSED_MSG : undefined}
    />
  );
}
