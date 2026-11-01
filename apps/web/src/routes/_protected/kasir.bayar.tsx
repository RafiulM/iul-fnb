import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import { StafPage } from "@/components/fnb/shell";
import { Payment } from "@/features/kasir-bayar/components/payment";
import { todayOrdersQuery } from "@/features/orders/queries";
import { settingsQuery } from "@/features/settings/queries";
import { staffCan } from "@/features/staff/model";
import { staffPermissionsQuery } from "@/features/staff/queries";

// ?code=A-108 opens that order (the prototype's pay_code).
const searchSchema = z.object({
  code: z.string().trim().min(1).max(20).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/kasir/bayar")({
  head: () => ({ meta: [{ title: `Pembayaran | ${siteConfig.name}` }] }),
  validateSearch: searchSchema,
  // Payment and receipts need the Kasir "payment" permission (the API checks
  // it too); without it, back to the board with an explanation.
  beforeLoad: async ({ context: { queryClient, role } }) => {
    const perms = await queryClient.ensureQueryData(staffPermissionsQuery());
    if (!staffCan(perms, role, "payment"))
      throw redirect({
        to: "/kasir",
        search: {
          flash:
            "Akunmu belum diizinkan menerima pembayaran. Minta pemilik mengaktifkannya di Akun & Staf.",
        },
      });
  },
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
