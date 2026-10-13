import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import {
  RiwayatPage,
  savedRange,
} from "@/features/riwayat/components/riwayat-page";
import { rangeDates } from "@/features/riwayat/filters";
import {
  todayOrdersQuery,
  transactionsPeriodQuery,
} from "@/features/orders/queries";
import { settingsQuery } from "@/features/settings/queries";

export const Route = createFileRoute("/_protected/riwayat")({
  head: () => ({ meta: [{ title: `Riwayat Transaksi | ${siteConfig.name}` }] }),
  loader: ({ context }) => {
    const { from, to } = rangeDates(savedRange(), Date.now());
    return Promise.all([
      context.queryClient.ensureQueryData(transactionsPeriodQuery(from, to)),
      context.queryClient.ensureQueryData(todayOrdersQuery()),
      context.queryClient.ensureQueryData(settingsQuery()),
    ]);
  },
  component: RiwayatPage,
});
