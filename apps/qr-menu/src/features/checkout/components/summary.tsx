import { rp } from "@starter/shared/fnb/domain";
import type { CafeSettingsDto } from "@starter/shared/fnb/types";

/**
 * The Subtotal / Pajak & layanan / Total rows shared by keranjang (`pl-total`)
 * and status (`pc-total`). Tax and service are one row, as in the design.
 */
export function SummaryRows({
  totals,
  settings,
  totalClass,
}: {
  totals: {
    subtotal: number;
    tax: number;
    service: number;
    total: number;
    count: number;
  };
  settings: Pick<
    CafeSettingsDto,
    "taxPercent" | "servicePercent" | "taxInclusive"
  >;
  totalClass: string;
}) {
  const pct = settings.taxPercent + settings.servicePercent;
  return (
    <>
      <div>
        <span>Subtotal ({totals.count} item)</span>
        <span>{rp(totals.subtotal)}</span>
      </div>
      <div>
        <span>
          {settings.taxInclusive
            ? `Termasuk pajak & layanan (${pct}%)`
            : `Pajak & layanan (${pct}%)`}
        </span>
        <span>{rp(totals.tax + totals.service)}</span>
      </div>
      <div className={totalClass}>
        <span>Total</span>
        <span>{rp(totals.total)}</span>
      </div>
    </>
  );
}
