import { UserX, X } from "lucide-react";
import { initials, ROLE_LABEL } from "@starter/shared/fnb/domain";
import { Dialog } from "@/components/fnb/dialog";
import type { StaffMember } from "../model";

/** "Nonaktifkan akun?" confirmation. */
export function DeactivateDialog({
  target,
  pending,
  onClose,
  onConfirm,
}: {
  target: StaffMember | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (s: StaffMember) => void;
}) {
  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      size="sm"
      labelledBy="staf-cf-title"
      aria-describedby="staf-cf-desc"
    >
      {target ? (
        <>
          <div className="l-staf-dialog-head">
            <div>
              <h2 id="staf-cf-title">Nonaktifkan {target.name}?</h2>
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
            <div className="ak-person">
              <span className="ak-avatar" aria-hidden="true">
                {initials(target.name)}
              </span>
              <div>
                <strong>{target.name}</strong>
                <small>
                  {target.email} · {ROLE_LABEL[target.role]}
                </small>
              </div>
            </div>
            <p className="ak-cf-desc" id="staf-cf-desc">
              Ia tidak bisa masuk lagi. Riwayat transaksinya tetap tersimpan.
            </p>
            <p className="l-staf-hint">
              Akun bisa diaktifkan kembali kapan saja dari daftar staf.
            </p>
          </div>
          <div className="l-staf-dialog-foot">
            <button
              className="l-staf-btn"
              type="button"
              data-autofocus
              onClick={onClose}
            >
              Batal
            </button>
            <button
              className="l-staf-btn"
              data-variant="danger"
              type="button"
              disabled={pending}
              onClick={() => onConfirm(target)}
            >
              <UserX aria-hidden="true" />
              Ya, nonaktifkan
            </button>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
