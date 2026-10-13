import type { ReactNode } from "react";
import { TriangleAlert, X, type LucideIcon } from "lucide-react";
import { Dialog } from "@/components/fnb/dialog";

export type ConfirmOptions = {
  title: string;
  body: ReactNode;
  ok: string;
  icon?: LucideIcon;
  onOk: () => void;
};

/** Danger confirmation; a native modal, so it can stack over another dialog. */
export function ConfirmDialog({
  options,
  onClose,
}: {
  options: ConfirmOptions | null;
  onClose: () => void;
}) {
  const Icon = options?.icon ?? TriangleAlert;
  return (
    <Dialog
      open={!!options}
      onClose={onClose}
      size="sm"
      labelledBy="menu-meja-cf-title"
      aria-describedby="menu-meja-cf-body"
    >
      {options && (
        <>
          <div className="l-staf-dialog-head">
            <div className="mm-cf-top">
              <span className="mm-cf-ico" aria-hidden="true">
                <Icon aria-hidden="true" style={{ fontSize: 20 }} />
              </span>
              <h2 id="menu-meja-cf-title">{options.title}</h2>
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
            <p className="mm-cf-body" id="menu-meja-cf-body">
              {options.body}
            </p>
          </div>
          <div className="l-staf-dialog-foot">
            <button
              type="button"
              className="l-staf-btn"
              onClick={onClose}
              data-autofocus
            >
              Batal
            </button>
            <button
              type="button"
              className="l-staf-btn"
              data-variant="danger"
              onClick={() => {
                const fn = options.onOk;
                onClose();
                fn();
              }}
            >
              <Icon aria-hidden="true" style={{ fontSize: 16 }} />
              {options.ok}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
