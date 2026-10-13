import {
  Banknote,
  Check,
  CircleCheck,
  Printer,
  StickyNote,
  Wallet,
  X,
} from "lucide-react";
import {
  ago,
  hhmm,
  ORDER_FLOW,
  ORDER_STATUS,
  rp,
} from "@starter/shared/fnb/domain";
import type { CafeSettingsDto, OrderDto } from "@starter/shared/fnb/types";
import { Dialog } from "@/components/fnb/dialog";
import {
  isActive,
  nextAction,
  srcLabel,
  STEP_LABEL,
  whereLabel,
  type NextAction,
} from "../helpers";

export type DrawerAction = NextAction["act"] | "receipt" | "cancel";

/** Order detail (drawer) — the prototype's renderDrawer. */
export function OrderDrawer({
  order,
  settings,
  now,
  busy,
  onClose,
  onAction,
}: {
  order: OrderDto | null;
  settings: CafeSettingsDto;
  now: number;
  busy: boolean;
  onClose: () => void;
  onAction: (act: DrawerAction, code: string) => void;
}) {
  return (
    <Dialog
      open={!!order}
      onClose={onClose}
      kind="drawer"
      labelledBy="kasir-d-title"
    >
      {order ? (
        <DrawerContent
          order={order}
          settings={settings}
          now={now}
          busy={busy}
          onClose={onClose}
          onAction={onAction}
        />
      ) : null}
    </Dialog>
  );
}

function DrawerContent({
  order: o,
  settings,
  now,
  busy,
  onClose,
  onAction,
}: {
  order: OrderDto;
  settings: CafeSettingsDto;
  now: number;
  busy: boolean;
  onClose: () => void;
  onAction: (act: DrawerAction, code: string) => void;
}) {
  const status = ORDER_STATUS[o.status];
  const active = isActive(o);
  const a = active ? nextAction(o) : null;
  const idx = ORDER_FLOW.indexOf(o.status);
  const paid = o.paymentStatus === "LUNAS";
  const count = o.items.reduce((n, i) => n + i.qty, 0);
  const canCancel =
    active && !paid && (o.status === "MENUNGGU" || o.status === "DIPROSES");
  const payDetail = !paid
    ? "Bisa dibayar sebelum atau sesudah pesanan diantar."
    : o.paymentMethod === "CASH"
      ? `Tunai ${rp(o.paidAmount ?? 0)} · kembali ${rp((o.paidAmount ?? 0) - o.totalAmount)}`
      : `Non-tunai${o.paymentChannel ? " · " + o.paymentChannel : ""}`;

  return (
    <>
      <div className="l-staf-dialog-head">
        <div>
          <div className="k-d-title">
            <h2 id="kasir-d-title">{whereLabel(o)}</h2>
            <span className="l-staf-chip" data-tone={status.tone}>
              {status.label}
            </span>
          </div>
          <p>
            {`${o.code} · ${srcLabel(o)} · masuk ${hhmm(o.createdAt)} (${ago(o.createdAt, now)})`}
          </p>
        </div>
        <button
          className="l-staf-iconbtn"
          type="button"
          aria-label="Tutup detail"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      <div className="l-staf-dialog-body">
        <ol className="k-steps" aria-label="Progres pesanan">
          {STEP_LABEL.map((label, i) => (
            <li
              key={label}
              className="k-step"
              data-state={i < idx ? "done" : i === idx ? "current" : "todo"}
            >
              <i>
                {i < idx ? (
                  <Check aria-hidden="true" style={{ fontSize: 13 }} />
                ) : null}
              </i>
              {label}
            </li>
          ))}
        </ol>

        <h3 className="k-sec">Item pesanan · {count}</h3>
        <ul className="k-d-items">
          {o.items.map((i) => (
            <li key={i.id} className="k-d-item">
              <Thumb image={i.imageUrl} />
              <div>
                <strong>{i.name}</strong>
                <small>
                  {i.qty} × {rp(i.price)}
                </small>
                {i.note ? (
                  <span className="k-note">
                    <StickyNote aria-hidden="true" style={{ fontSize: 12 }} />
                    {i.note}
                  </span>
                ) : null}
              </div>
              <span className="l-staf-num" style={{ fontWeight: 600 }}>
                {rp(i.price * i.qty)}
              </span>
            </li>
          ))}
        </ul>

        <div className="k-sum">
          <div>
            <span>Subtotal</span>
            <span>{rp(o.subtotal)}</span>
          </div>
          {o.service > 0 ? (
            <div>
              <span>Layanan {settings.servicePercent}%</span>
              <span>{rp(o.service)}</span>
            </div>
          ) : null}
          <div>
            <span>
              Pajak {settings.taxPercent}%
              {settings.taxInclusive ? " (termasuk)" : ""}
            </span>
            <span>{rp(o.tax)}</span>
          </div>
          <div className="k-sum-total">
            <span>Total</span>
            <span>{rp(o.totalAmount)}</span>
          </div>
        </div>

        <div className="k-paybox" data-paid={paid ? "" : undefined}>
          {paid ? (
            <CircleCheck aria-hidden="true" style={{ fontSize: 22 }} />
          ) : (
            <Wallet aria-hidden="true" style={{ fontSize: 22 }} />
          )}
          <div>
            <strong>{paid ? "Lunas" : "Belum dibayar"}</strong>
            <small>{payDetail}</small>
          </div>
        </div>

        <h3 className="k-sec">Info</h3>
        <dl className="k-meta">
          <dt>Sumber</dt>
          <dd>{o.orderType === "QR" ? "Scan QR di meja" : "Dicatat kasir"}</dd>
          <dt>Jenis</dt>
          <dd>{o.tableNumber ? "Makan di tempat" : "Bawa pulang"}</dd>
          {o.customerName ? (
            <>
              <dt>Pelanggan</dt>
              <dd>{o.customerName}</dd>
            </>
          ) : null}
          {o.cashierName ? (
            <>
              <dt>Kasir</dt>
              <dd>{o.cashierName}</dd>
            </>
          ) : null}
        </dl>
      </div>

      <div className="l-staf-dialog-foot k-drawer-foot">
        {a ? (
          <button
            type="button"
            className="l-staf-btn"
            data-variant="primary"
            data-block=""
            disabled={busy}
            onClick={() => onAction(a.act, o.code)}
          >
            {a.label}
          </button>
        ) : null}
        <div className="k-row">
          {active && !paid && a?.act !== "pay" ? (
            <button
              type="button"
              className="l-staf-btn"
              data-size="sm"
              onClick={() => onAction("pay", o.code)}
            >
              <Banknote aria-hidden="true" style={{ fontSize: 16 }} />
              Terima pembayaran
            </button>
          ) : null}
          {paid ? (
            <button
              type="button"
              className="l-staf-btn"
              data-size="sm"
              onClick={() => onAction("receipt", o.code)}
            >
              <Printer aria-hidden="true" style={{ fontSize: 16 }} />
              Lihat struk
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              className="l-staf-btn"
              data-size="sm"
              data-variant="danger"
              onClick={() => onAction("cancel", o.code)}
            >
              <X aria-hidden="true" style={{ fontSize: 16 }} />
              Batalkan
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

/** Menu image: the sample data uses emoji; uploaded photos are URLs. */
function Thumb({ image }: { image: string }) {
  const isUrl = /^(https?:|\/|data:|blob:)/.test(image);
  return (
    <span className="l-staf-thumb" aria-hidden="true">
      {isUrl ? (
        <img
          src={image}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "inherit",
          }}
        />
      ) : (
        image
      )}
    </span>
  );
}
