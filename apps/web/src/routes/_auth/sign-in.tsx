import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import { siteConfig } from "@/config/site";

export const Route = createFileRoute("/_auth/sign-in")({
  head: () => ({ meta: [{ title: `Masuk | ${siteConfig.name}` }] }),
  component: () => <AuthForm key="sign-in" mode="sign-in" />,
});
