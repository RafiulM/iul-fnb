import { useState } from "react";
import { X } from "lucide-react";
import { rp } from "@starter/shared/fnb/domain";
import type { OrderDto } from "@starter/shared/fnb/types";
import { Dialog } from "@/components/fnb/dialog";
import { CANCEL_REASONS, whereLabel } from "../helpers";

/** "Batalkan pesanan?" with a required reason. */
export function CancelDialog({
  order,
  pending,
  onClose,
  onConfirm,
}: {
  order: OrderDto | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (code: string, reason: string) => void;
}) {
  return (
    <Dialog
      open={!!order}
      onClose={onClose}
      size="sm"
      labelledBy="kasir-cx-title"
    >
      {order ? (
        <CancelContent
          // A fresh reason for every order.
          key={order.code}
          order={order}
          pending={pending}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      ) : null}
    </Dialog>
  );
}

function CancelContent({
  order,
  pending,
  onClose,
  onConfirm,
}: {
  order: OrderDto;
  pending: boolean;
  onClose: () => void;
  onConfirm: (code: string, reason: string) => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  return (
    <>
      <div className="l-staf-dialog-head">
        <div>
          <h2 id="kasir-cx-title">Batalkan pesanan?</h2>
          <p>{`${order.code} · ${whereLabel(order)} · ${rp(order.totalAmount)}`}</p>
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
        <p className="k-dlg-text">
          Pilih alasan pembatalan. Status di layar pelanggan ikut berubah.
        </p>
        <div
          className="k-reasons l-staf-seg"
          role="group"
          aria-label="Alasan pembatalan"
        >
          {CANCEL_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={reason === r}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="l-staf-dialog-foot">
        <button className="l-staf-btn" type="button" onClick={onClose}>
          Kembali
        </button>
        <button
          className="l-staf-btn"
          data-variant="danger"
          type="button"
          disabled={!reason || pending}
          onClick={() => reason && onConfirm(order.code, reason)}
        >
          <X aria-hidden="true" />
          Ya, batalkan
        </button>
      </div>
    </>
  );
}
