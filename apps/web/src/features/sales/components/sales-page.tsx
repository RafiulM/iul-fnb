import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, Download, Lock } from "lucide-react";
import { ROLE_LABEL } from "@starter/shared/fnb/domain";
import { StafPage } from "@/components/fnb/shell";
import { useTransactions } from "@/features/orders/hooks";
import { useSettings } from "@/features/settings/hooks";
import { useNow } from "@/lib/use-now";
import {
  chartBuckets,
  heatData,
  metrics,
  period,
  referenceNow,
  toTx,
  txIn,
  vsText,
  type Metric,
  type RangeKey,
  type TxFilter,
} from "@/features/sales/aggregate";
import { ReportDialog } from "./report-dialog";
import { SalesChart } from "./sales-chart";
import { SalesHeatmap } from "./sales-heatmap";
import {
  Kpis,
  PaymentShare,
  PeriodLine,
  SourceShare,
  TopMenus,
} from "./sales-summary";
import { SalesTransactions } from "./sales-transactions";

// Port of design/src/pages/penjualan.page.html (owner-only sales dashboard).

type ViewState = {
  range: RangeKey;
  metric: Metric;
  tableView: boolean;
  filter: TxFilter;
  page: number;
};

// Survives navigating away and back, like the prototype's root.penjualanState.
let savedView: ViewState = {
  range: "7d",
  metric: "rev",
  tableView: false,
  filter: { q: "", method: "", status: "" },
  page: 1,
};

const RANGES: [RangeKey, string][] = [
  ["today", "Hari ini"],
  ["7d", "7 hari"],
  ["30d", "30 hari"],
];

/** Cashier accounts see the prototype's locked state instead of the data. */
export function SalesLocked({ userName }: { userName: string }) {
  return (
    <StafPage id="penjualan" title="Penjualan">
      <main
        aria-label="Penjualan"
        className="p-penjualan"
        data-node-id="penjualan"
      >
        <section
          className="l-staf-card pj-locked"
          aria-labelledby="penjualan-locked-title"
          data-node-id="penjualan.locked"
        >
          <div className="l-staf-empty">
            <Lock aria-hidden="true" />
            <h2 className="pj-sr" id="penjualan-locked-title">
              Akses terbatas
            </h2>
            <strong>Halaman ini khusus Pemilik</strong>
            <p>
              Akun <b>{userName}</b> ({ROLE_LABEL.CASHIER}) tidak punya akses ke{" "}
              <b>Penjualan</b>. Minta pemilik mengubah hak akses di menu Akun
              &amp; Staf.
            </p>
            <Link className="l-staf-btn" data-variant="primary" to="/kasir">
              <ClipboardList aria-hidden="true" />
              Kembali ke Pesanan
            </Link>
          </div>
        </section>
      </main>
    </StafPage>
  );
}

export function SalesDashboard({ jam }: { jam?: string }) {
  const { data: orders } = useTransactions();
  const { data: settings } = useSettings();
  const now = referenceNow(useNow(60_000), jam);

  const [view, setView] = useState(savedView);
  useEffect(() => {
    savedView = view;
  }, [view]);
  const patch = (p: Partial<ViewState>) => setView((v) => ({ ...v, ...p }));

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [live, setLive] = useState("");

  const tx = useMemo(() => toTx(orders, now), [orders, now]);
  const p = useMemo(() => period(view.range, now), [view.range, now]);
  const inPeriod = useMemo(() => txIn(tx, p.start, p.end), [tx, p]);
  const m = useMemo(() => metrics(inPeriod), [inPeriod]);
  const pm = useMemo(
    () => metrics(p.prev ? txIn(tx, p.prev.start, p.prev.end) : []),
    [tx, p],
  );
  const buckets = useMemo(() => chartBuckets(tx, p, now), [tx, p, now]);
  const heat = useMemo(() => heatData(tx, p, now), [tx, p, now]);
  const vs = vsText(p.key, now);

  // Today's opening time for the early-morning empty chart.
  const at = new Date(now);
  const day = settings.hours[(at.getDay() + 6) % 7];
  const openFrom = day?.from || "08:00";
  const [oh = 8, om = 0] = openFrom.split(":").map(Number);
  const early = at.getHours() * 60 + at.getMinutes() < oh * 60 + om;

  return (
    <StafPage
      id="penjualan"
      title="Penjualan"
      actions={
        <>
          <div
            className="l-staf-seg"
            role="group"
            aria-label="Rentang waktu"
            data-part="range-seg"
          >
            {RANGES.map(([key, label]) => (
              <button
                key={key}
                type="button"
                data-range={key}
                aria-pressed={view.range === key}
                onClick={() =>
                  view.range !== key && patch({ range: key, page: 1 })
                }
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="l-staf-btn"
            data-variant="primary"
            type="button"
            data-action="download"
            onClick={() => setDownloadOpen(true)}
          >
            <Download aria-hidden="true" />
            Unduh laporan
          </button>
        </>
      }
    >
      <main
        aria-label="Penjualan"
        className="p-penjualan"
        data-node-id="penjualan"
      >
        <div className="pj-body">
          <PeriodLine period={p} now={now} />

          <Kpis m={m} pm={pm} vs={vs} />

          <div className="pj-row2">
            <SalesChart
              buckets={buckets}
              period={p}
              metric={view.metric}
              onMetric={(metric) => patch({ metric })}
              tableView={view.tableView}
              onTableView={(tableView) => patch({ tableView })}
              openFrom={openFrom}
              early={early}
              announce={setLive}
            />
            <TopMenus m={m} />
          </div>

          <div className="pj-row3">
            <PaymentShare m={m} pm={pm} period={p} vs={vs} />
            <SourceShare m={m} pm={pm} vs={vs} />
            <SalesHeatmap heat={heat} period={p} announce={setLive} />
          </div>

          <SalesTransactions
            list={inPeriod}
            period={p}
            filter={view.filter}
            onFilter={(filter) => patch({ filter, page: 1 })}
            page={view.page}
            onPage={(page) => patch({ page })}
            settings={settings}
          />

          <div className="pj-sr" aria-live="polite">
            {live}
          </div>
        </div>

        <ReportDialog
          open={downloadOpen}
          onClose={() => setDownloadOpen(false)}
          range={view.range}
          tx={tx}
          now={now}
          settings={settings}
        />
      </main>
    </StafPage>
  );
}
