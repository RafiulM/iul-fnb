import type { Ref } from "react";
import { Lock } from "lucide-react";
import { rp } from "@starter/shared/fnb/domain";

type Props = {
  count: number;
  subtotal: number;
  blocked: boolean;
  /** "buka 08.00" / "buka besok 08.00" */
  openLabel: string;
  /** "Kafe sedang tutup · buka lagi pukul 08.00" */
  closedMsg: string;
  onOpen: () => void;
  ref?: Ref<HTMLButtonElement>;
};

/** Sticky cart bar at the bottom (design renderCartBar). */
export function CartBar({
  count,
  subtotal,
  blocked,
  openLabel,
  closedMsg,
  onOpen,
  ref,
}: Props) {
  return (
    <div className="pl-cartbar" data-show={String(count > 0)}>
      <button
        ref={ref}
        type="button"
        aria-disabled={blocked}
        aria-label={
          blocked
            ? `Keranjang tidak bisa dibuka: ${closedMsg}. ${count} item tersimpan.`
            : `Lihat keranjang, ${count} item, ${rp(subtotal)} belum termasuk pajak`
        }
        onClick={onOpen}
      >
        <span className="pl-cb-count" aria-hidden="true">
          {count}
        </span>
        <span className="pl-cb-text" aria-hidden="true">
          <strong>{blocked ? "Kafe sedang tutup" : "Lihat keranjang"}</strong>
          <small>
            {blocked
              ? `${count} item · ${openLabel}`
              : `${count} item · belum termasuk pajak`}
          </small>
        </span>
        <span className="pl-cb-total" aria-hidden="true">
          {blocked ? (
            <Lock aria-hidden="true" style={{ fontSize: 20 }} />
          ) : (
            rp(subtotal)
          )}
        </span>
      </button>
    </div>
  );
}
