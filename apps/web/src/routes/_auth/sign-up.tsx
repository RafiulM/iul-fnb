import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import { siteConfig } from "@/config/site";

// Only for the cafe's first account (the owner). Once it exists, staff
// accounts come from Akun & Staf, so this page sends visitors to sign-in.
export const Route = createFileRoute("/_auth/sign-up")({
  head: () => ({ meta: [{ title: `Buat akun | ${siteConfig.name}` }] }),
  beforeLoad: ({ context }) => {
    if (context.signUpOpen === false)
      throw redirect({ to: "/sign-in", search: { daftar: "tutup" } });
  },
  component: () => <AuthForm key="sign-up" mode="sign-up" signUpOpen />,
});
