import { initials } from "@starter/shared/fnb/domain";
import type { CafeSettingsDto, TableDto } from "@starter/shared/fnb/types";
import { TableQr } from "@/components/fnb/table-qr";
import { tableMenuUrl } from "@/lib/env";

/** The link printed under the QR, without the protocol. */
const shortUrl = (qrCode: string) =>
  tableMenuUrl(qrCode).replace(/^https?:\/\//, "");

/** Table tent card (QR dialog preview and print). */
export function TableTent({
  table,
  settings,
}: {
  table: TableDto;
  settings: CafeSettingsDto;
}) {
  return (
    <div className="mm-tent">
      <div className="mm-tent-brand">
        <span className="mm-tent-logo">{initials(settings.cafeName)}</span>
        {settings.cafeName}
      </div>
      <div className="mm-tent-no">
        <span>Meja</span>
        {table.tableNumber}
      </div>
      <div className="mm-tent-qr">
        <TableQr code={table.qrCode} size={200} />
      </div>
      <p className="mm-tent-cta">Scan untuk lihat menu &amp; pesan</p>
      <p className="mm-tent-sub">Tanpa install aplikasi · Bayar di kasir</p>
      <p className="mm-tent-url">{shortUrl(table.qrCode)}</p>
    </div>
  );
}

// Makes the print area flow normally while printing so many cards can break
// across A4 pages (2 per row). Only mounted during a QR print job.
const PRINT_CSS = `
@page { size: A4; margin: 10mm; }
@media print {
  html[data-l-staf-printing], html[data-l-staf-printing] body { background: #fff !important; }
  html[data-l-staf-printing] body *:not(:has(.mm-sheet)):not(.mm-sheet):not(.mm-sheet *) { display: none !important; }
  html[data-l-staf-printing] body *:has(.mm-sheet) { display: block !important; position: static !important; inset: auto !important; width: auto !important; height: auto !important; min-height: 0 !important; max-height: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; overflow: visible !important; background: none !important; transform: none !important; animation: none !important; }
}`;

/** Content for usePrint(): one tent card per table. */
export function TableQrSheet({
  tables,
  settings,
}: {
  tables: TableDto[];
  settings: CafeSettingsDto;
}) {
  // data-page: the print area lives outside the page, the card CSS is scoped to it.
  return (
    <div data-page="menu-meja">
      <style>{PRINT_CSS}</style>
      <div className="mm-sheet">
        {tables.map((t) => (
          <TableTent key={t.id} table={t} settings={settings} />
        ))}
      </div>
    </div>
  );
}
