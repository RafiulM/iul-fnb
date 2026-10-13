import { useState } from "react";
import { Calendar, Download, FileText, X } from "lucide-react";
import { hhmm, rp } from "@starter/shared/fnb/domain";
import type { CafeSettingsDto } from "@starter/shared/fnb/types";
import { Dialog, useToast } from "@/components/fnb/dialog";
import { downloadCSV } from "@/lib/csv";
import {
  nf,
  periodText,
  reportData,
  type RangeKey,
  type ReportFormat,
  type ReportRangeKey,
  type Tx,
} from "@/features/sales/aggregate";

// "Unduh laporan penjualan": period + content (per transaction / daily
// summary) → CSV, with a live summary of what will be downloaded.

export function ReportDialog({
  open,
  onClose,
  range,
  tx,
  now,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  /** The dashboard's range preselects the period. */
  range: RangeKey;
  tx: Tx[];
  now: number;
  settings: CafeSettingsDto;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="penjualan-dl-title"
      data-node-id="penjualan.download"
    >
      <ReportForm
        range={range}
        tx={tx}
        now={now}
        settings={settings}
        onClose={onClose}
      />
    </Dialog>
  );
}

function ReportForm({
  range,
  tx,
  now,
  settings,
  onClose,
}: {
  range: RangeKey;
  tx: Tx[];
  now: number;
  settings: CafeSettingsDto;
  onClose: () => void;
}) {
  const toast = useToast();
  const [key, setKey] = useState<ReportRangeKey>(range);
  const [fmt, setFmt] = useState<ReportFormat>("tx");
  const d = reportData(tx, key, fmt, now, settings);
  const voids = d.list.length - d.done.length;

  function download() {
    if (!d.list.length) return;
    downloadCSV(d.fname, d.rows);
    onClose();
    toast(
      d.fmt === "tx"
        ? `Laporan diunduh · ${nf(d.lines)} transaksi`
        : `Ringkasan harian diunduh · ${nf(d.lines)} hari`,
    );
  }

  return (
    <>
      <div className="l-staf-dialog-head">
        <div>
          <h2 id="penjualan-dl-title">Unduh laporan penjualan</h2>
          <p>File CSV bisa langsung dibuka di Excel atau Google Sheets.</p>
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
        <div className="pj-dl">
          <div className="l-staf-field">
            <label htmlFor="penjualan-dl-period">Periode</label>
            <select
              className="l-staf-select"
              id="penjualan-dl-period"
              data-autofocus
              value={key}
              onChange={(e) => setKey(e.target.value as ReportRangeKey)}
            >
              <option value="today">Hari ini</option>
              <option value="7d">7 hari terakhir</option>
              <option value="30d">30 hari terakhir</option>
              <option value="month">Bulan ini</option>
            </select>
          </div>
          <fieldset className="pj-fs">
            <legend>Isi laporan</legend>
            <div className="pj-opts">
              <label className="pj-opt">
                <input
                  type="radio"
                  name="penjualan-dl-fmt"
                  value="tx"
                  checked={fmt === "tx"}
                  onChange={() => setFmt("tx")}
                />
                <FileText aria-hidden="true" />
                <span>
                  <strong>Per transaksi (CSV)</strong>
                  <small>
                    Satu baris per pesanan: item, pajak, metode bayar, dan
                    kasir.
                  </small>
                </span>
              </label>
              <label className="pj-opt">
                <input
                  type="radio"
                  name="penjualan-dl-fmt"
                  value="daily"
                  checked={fmt === "daily"}
                  onChange={() => setFmt("daily")}
                />
                <Calendar aria-hidden="true" />
                <span>
                  <strong>Ringkasan harian (CSV)</strong>
                  <small>
                    Satu baris per hari: jumlah pesanan, penjualan, tunai, dan
                    non-tunai.
                  </small>
                </span>
              </label>
            </div>
          </fieldset>
          <div className="pj-sum" aria-live="polite">
            <h3>Yang akan diunduh</h3>
            <dl>
              <div>
                <dt>Periode</dt>
                <dd>
                  {periodText(d.p.start, d.p.end)}{" "}
                  <small>s.d. {hhmm(now)}</small>
                </dd>
              </div>
              <div>
                <dt>Isi file</dt>
                <dd>
                  {d.fmt === "tx" ? (
                    <>
                      {nf(d.lines)} transaksi
                      {voids > 0 && (
                        <>
                          {" "}
                          <small>({nf(voids)} dibatalkan ikut dicatat)</small>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {nf(d.lines)} hari <small>+ baris total</small>
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt>Total penjualan</dt>
                <dd>
                  {rp(d.rev)}{" "}
                  <small>· {nf(d.done.length)} pesanan selesai</small>
                </dd>
              </div>
              <div>
                <dt>Nama file</dt>
                <dd className="fname">{d.fname}</dd>
              </div>
            </dl>
            {!d.list.length && (
              <p className="l-staf-error">
                Belum ada transaksi pada periode ini.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="l-staf-dialog-foot">
        <button className="l-staf-btn" type="button" onClick={onClose}>
          Batal
        </button>
        <button
          className="l-staf-btn"
          data-variant="primary"
          type="button"
          disabled={!d.list.length}
          onClick={download}
        >
          <Download aria-hidden="true" />
          Unduh
        </button>
      </div>
    </>
  );
}
