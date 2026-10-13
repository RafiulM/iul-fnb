import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Printer,
  QrCode,
  Receipt,
  Search,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import {
  hhmm,
  ORDER_STATUS,
  PAY_METHOD,
  rp,
  tglPanjang,
} from "@starter/shared/fnb/domain";
import type { CafeSettingsDto } from "@starter/shared/fnb/types";
import { Dialog, useToast } from "@/components/fnb/dialog";
import { ReceiptPaper, usePrint } from "@/components/fnb/receipt";
import {
  dShort,
  itemsText,
  nf,
  PER_PAGE,
  periodText,
  txFiltered,
  type Period,
  type Tx,
  type TxFilter,
} from "@/features/sales/aggregate";
import { CardEmpty } from "./bits";

// "Riwayat transaksi" card of the period (search, filters, pages) and the
// receipt dialog with reprint.

export function SalesTransactions({
  list,
  period: p,
  filter,
  onFilter,
  page,
  onPage,
  settings,
}: {
  /** Every transaction of the period, newest first. */
  list: Tx[];
  period: Period;
  filter: TxFilter;
  onFilter: (f: TxFilter) => void;
  page: number;
  onPage: (page: number) => void;
  settings: CafeSettingsDto;
}) {
  const [struk, setStruk] = useState<Tx | null>(null);
  const filtered = useMemo(() => txFiltered(list, filter), [list, filter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const cur = Math.min(Math.max(1, page), pages);
  const from = (cur - 1) * PER_PAGE;
  const rows = filtered.slice(from, from + PER_PAGE);
  const isFiltered = !!(filter.q.trim() || filter.method || filter.status);

  return (
    <section
      className="l-staf-card"
      aria-labelledby="penjualan-tx-title"
      data-node-id="penjualan.transactions"
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="penjualan-tx-title">Riwayat transaksi</h2>
          <p>{periodText(p.start, p.end)} · pilih baris untuk melihat struk</p>
          <Link className="pj-tx-all" to="/riwayat">
            Lihat semua di Riwayat transaksi
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="pj-tx-tools">
          <label className="l-staf-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Cari kode, meja, atau menu"
              aria-label="Cari transaksi berdasarkan kode, meja, atau nama menu"
              autoComplete="off"
              value={filter.q}
              onChange={(e) => onFilter({ ...filter, q: e.target.value })}
            />
          </label>
          <select
            className="l-staf-select"
            aria-label="Filter metode pembayaran"
            value={filter.method}
            onChange={(e) =>
              onFilter({
                ...filter,
                method: e.target.value as TxFilter["method"],
              })
            }
          >
            <option value="">Metode: Semua</option>
            <option value="CASH">Tunai</option>
            <option value="NON_CASH">Non-tunai</option>
          </select>
          <select
            className="l-staf-select"
            aria-label="Filter status pesanan"
            value={filter.status}
            onChange={(e) =>
              onFilter({
                ...filter,
                status: e.target.value as TxFilter["status"],
              })
            }
          >
            <option value="">Status: Semua</option>
            <option value="SELESAI">Selesai</option>
            <option value="DIBATALKAN">Dibatalkan</option>
          </select>
        </div>
      </div>
      <div className="l-staf-table-wrap pj-tx-wrap">
        <table className="l-staf-table pj-tx-table">
          <caption className="pj-sr">
            Riwayat transaksi. Pilih baris untuk melihat struk.
          </caption>
          <thead>
            <tr>
              <th scope="col">Waktu</th>
              <th scope="col">No. Pesanan</th>
              <th scope="col">Tipe</th>
              <th scope="col">Meja</th>
              <th scope="col">Item</th>
              <th scope="col" className="l-staf-num">
                Total
              </th>
              <th scope="col">Metode</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((t) => (
                <TxRow key={t.id} t={t} onOpen={() => setStruk(t)} />
              ))
            ) : (
              <tr>
                <td colSpan={8}>
                  <CardEmpty
                    icon={Receipt}
                    title={
                      isFiltered
                        ? "Tidak ada transaksi yang cocok"
                        : "Belum ada transaksi"
                    }
                    text={
                      isFiltered
                        ? "Coba kata kunci lain atau ubah filter metode dan status."
                        : "Transaksi muncul di sini begitu ada pesanan masuk."
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pj-foot">
        <span aria-live="polite">
          {filtered.length ? (
            <>
              Menampilkan{" "}
              <b>
                {nf(from + 1)}–{nf(from + rows.length)}
              </b>{" "}
              dari <b>{nf(filtered.length)}</b> transaksi
            </>
          ) : (
            "Tidak ada transaksi"
          )}
        </span>
        <div className="pj-pager">
          <button
            className="l-staf-iconbtn"
            type="button"
            aria-label="Halaman sebelumnya"
            disabled={cur <= 1}
            onClick={() => onPage(cur - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span>
            Hal. {cur} dari {pages}
          </span>
          <button
            className="l-staf-iconbtn"
            type="button"
            aria-label="Halaman berikutnya"
            disabled={cur >= pages}
            onClick={() => onPage(cur + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <StrukDialog
        tx={struk}
        settings={settings}
        onClose={() => setStruk(null)}
      />
    </section>
  );
}

function TxRow({ t, onOpen }: { t: Tx; onOpen: () => void }) {
  const st = ORDER_STATUS[t.status];
  const items = itemsText(t);
  return (
    <tr
      tabIndex={0}
      data-i={t.id}
      data-void={t.status === "DIBATALKAN" ? "" : undefined}
      aria-label={`Struk ${t.code}, ${rp(t.totalAmount)}, ${st.label}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <td className="when">
        <b>{dShort(t.at)}</b>
        <span>{hhmm(t.at)}</span>
      </td>
      <td className="code">{t.code}</td>
      <td>
        <span className="src">
          {t.orderType === "QR" ? (
            <QrCode aria-hidden="true" style={{ fontSize: 16 }} />
          ) : (
            <User aria-hidden="true" style={{ fontSize: 16 }} />
          )}
          {t.orderType === "QR" ? "QR" : "Kasir"}
        </span>
      </td>
      <td>
        {t.tableNumber ? (
          "Meja " + t.tableNumber
        ) : (
          <span className="pj-muted">Bawa pulang</span>
        )}
      </td>
      <td className="items">
        <span title={items}>{items}</span>
      </td>
      <td className="l-staf-num">
        <span className="tot">{rp(t.totalAmount)}</span>
      </td>
      <td>
        {t.paymentMethod ? (
          <span className="pm">
            {t.paymentMethod === "CASH" ? (
              <Banknote aria-hidden="true" style={{ fontSize: 16 }} />
            ) : (
              <CreditCard aria-hidden="true" style={{ fontSize: 16 }} />
            )}
            {PAY_METHOD[t.paymentMethod]}
          </span>
        ) : (
          <span className="pj-muted">—</span>
        )}
      </td>
      <td>
        <span className="l-staf-chip" data-tone={st.tone}>
          {st.label}
        </span>
      </td>
    </tr>
  );
}

function StrukDialog({
  tx,
  settings,
  onClose,
}: {
  tx: Tx | null;
  settings: CafeSettingsDto;
  onClose: () => void;
}) {
  const print = usePrint();
  const toast = useToast();
  const st = tx ? ORDER_STATUS[tx.status] : null;
  const isVoid = tx?.status === "DIBATALKAN";
  return (
    <Dialog
      open={!!tx}
      onClose={onClose}
      size="sm"
      labelledBy="penjualan-st-title"
      data-node-id="penjualan.receipt"
    >
      {tx && st && (
        <>
          <div className="l-staf-dialog-head">
            <div>
              <h2 id="penjualan-st-title">Struk {tx.code}</h2>
              <p>
                {tglPanjang(tx.at)} · {hhmm(tx.at)}
              </p>
            </div>
            <button
              className="l-staf-iconbtn"
              type="button"
              aria-label="Tutup"
              onClick={onClose}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="l-staf-dialog-body">
            <div className="pj-st-chips">
              <span className="l-staf-chip" data-tone={st.tone}>
                {st.label}
              </span>
              <span className="l-staf-chip" data-tone="plain">
                {tx.orderType === "QR" ? "Pesan via QR" : "Dicatat kasir"}
              </span>
              {tx.paymentMethod && (
                <span className="l-staf-chip" data-tone="plain">
                  {PAY_METHOD[tx.paymentMethod]}
                </span>
              )}
              <span className="l-staf-chip" data-tone="plain">
                Kasir: {tx.cashierName || "-"}
              </span>
            </div>
            {isVoid && (
              <div className="l-staf-alert pj-st-alert" data-tone="warning">
                <TriangleAlert aria-hidden="true" style={{ fontSize: 18 }} />
                <span>
                  Pesanan ini dibatalkan, jadi tidak dihitung dalam penjualan
                  dan struknya tidak bisa dicetak ulang.
                </span>
              </div>
            )}
            <div className="pj-paper">
              <ReceiptPaper
                order={tx}
                settings={settings}
                cashierFallback="-"
              />
            </div>
          </div>
          <div className="l-staf-dialog-foot">
            <button className="l-staf-btn" type="button" onClick={onClose}>
              Tutup
            </button>
            <button
              className="l-staf-btn"
              data-variant="primary"
              type="button"
              disabled={isVoid}
              onClick={() => {
                if (isVoid) return;
                print(
                  <ReceiptPaper
                    order={tx}
                    settings={settings}
                    cashierFallback="-"
                  />,
                );
                toast(`Struk ${tx.code} dikirim ke printer`);
              }}
            >
              <Printer aria-hidden="true" />
              Cetak ulang struk
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
