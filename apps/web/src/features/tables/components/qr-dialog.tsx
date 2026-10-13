import {
  Eye,
  ExternalLink,
  Printer,
  RefreshCw,
  TriangleAlert,
  X,
} from "lucide-react";
import type { CafeSettingsDto, TableDto } from "@starter/shared/fnb/types";
import { Dialog } from "@/components/fnb/dialog";
import { tableMenuUrl } from "@/lib/env";
import { TableTent } from "./table-tent";

export function QrDialog({
  table,
  settings,
  unprinted,
  onClose,
  onPrint,
  onRegenerate,
}: {
  table: TableDto | null;
  settings: CafeSettingsDto;
  unprinted: boolean;
  onClose: () => void;
  onPrint: (table: TableDto) => void;
  onRegenerate: (table: TableDto) => void;
}) {
  return (
    <Dialog open={!!table} onClose={onClose} labelledBy="menu-meja-qr-title">
      {table && (
        <>
          <div className="l-staf-dialog-head">
            <div>
              <h2 id="menu-meja-qr-title">QR Meja {table.tableNumber}</h2>
              <p>
                Cetak lalu letakkan di meja. Pelanggan cukup scan pakai kamera
                ponsel.
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
            <div className="mm-qr-warn">
              {!table.isActive ? (
                <div className="l-staf-alert" data-tone="warning">
                  <TriangleAlert aria-hidden="true" style={{ fontSize: 18 }} />
                  <span>
                    Meja ini <b>nonaktif</b>. QR tetap bisa dicetak, tapi
                    pelanggan baru bisa memesan setelah meja diaktifkan lagi.
                  </span>
                </div>
              ) : unprinted ? (
                <div className="l-staf-alert">
                  <Printer aria-hidden="true" style={{ fontSize: 18 }} />
                  <span>
                    QR ini <b>belum dicetak</b>. Cetak, lalu ganti kartu lama di
                    meja.
                  </span>
                </div>
              ) : null}
            </div>
            <div className="mm-qr-stage">
              <TableTent table={table} settings={settings} />
            </div>
            <div className="mm-qr-meta">
              <span>
                Kode QR<code>{table.qrCode}</code>
              </span>
              <button
                type="button"
                className="l-staf-btn"
                data-variant="ghost"
                data-size="sm"
                onClick={() => onRegenerate(table)}
              >
                <RefreshCw aria-hidden="true" />
                Buat ulang QR
              </button>
            </div>
            <p className="mm-qr-honest">
              <Eye aria-hidden="true" style={{ fontSize: 14 }} />
              QR ilustrasi — QR asli dibuat oleh sistem.
            </p>
          </div>
          <div className="l-staf-dialog-foot">
            <a
              className="l-staf-btn"
              href={tableMenuUrl(table.qrCode)}
              target="_blank"
              rel="noopener"
            >
              <ExternalLink aria-hidden="true" />
              Buka halaman pelanggan
            </a>
            <button
              type="button"
              className="l-staf-btn"
              data-variant="primary"
              onClick={() => onPrint(table)}
            >
              <Printer aria-hidden="true" />
              Cetak QR
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
