import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { StafPage } from "@/components/fnb/shell";
import { Payment } from "@/features/kasir-bayar/components/payment";
import { todayOrdersQuery } from "@/features/orders/queries";
import { settingsQuery } from "@/features/settings/queries";

// ?code=A-108 opens that order (the prototype's pay_code).
const searchSchema = z.object({
  code: z.string().trim().min(1).max(20).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/kasir/bayar")({
  head: () => ({ meta: [{ title: `Pembayaran | ${siteConfig.name}` }] }),
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(todayOrdersQuery()),
      queryClient.ensureQueryData(settingsQuery()),
    ]),
  component: Page,
});

function Page() {
  const { session } = Route.useRouteContext();
  const { code } = Route.useSearch();
  return (
    <StafPage
      id="kasir-bayar"
      title="Pembayaran"
      actions={
        <Link className="l-staf-btn" to="/kasir">
          <ArrowLeft aria-hidden="true" />
          Kembali ke pesanan
        </Link>
      }
    >
      <Payment code={code} cashierName={session.user.name} />
    </StafPage>
  );
}
