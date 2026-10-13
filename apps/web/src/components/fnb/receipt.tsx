import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import {
  hhmm,
  initials,
  num,
  orderTotals,
  tgl,
} from "@starter/shared/fnb/domain";
import type { CafeSettingsDto, OrderDto } from "@starter/shared/fnb/types";

// Customer receipt (prototype receiptHTML) and browser printing of it.

export type ReceiptOrder = Pick<
  OrderDto,
  | "code"
  | "createdAt"
  | "tableNumber"
  | "orderType"
  | "items"
  | "paymentStatus"
  | "paymentMethod"
  | "paymentChannel"
  | "paidAmount"
  | "cashierName"
  | "customerName"
  | "status"
>;

export function ReceiptPaper({
  order,
  settings,
  cashierFallback = "",
  style,
}: {
  order: ReceiptOrder;
  settings: CafeSettingsDto;
  /** Shown when the order has no cashier yet (e.g. the signed-in user). */
  cashierFallback?: string;
  style?: React.CSSProperties;
}) {
  const s = settings;
  const R = s.receipt;
  const t = orderTotals(order.items, s);
  const paid = order.paidAmount ?? t.total;
  return (
    <div className="l-staf-receipt" data-paper={R.paperMm} style={style}>
      {R.showLogo &&
        (s.logoUrl ? (
          <img className="rc-logo" src={s.logoUrl} alt="" />
        ) : (
          <div className="rc-logo">{initials(s.cafeName)}</div>
        ))}
      <div className="rc-c">
        <div className="rc-name">{s.cafeName}</div>
        {R.showAddress && (
          <>
            {s.address}
            <br />
            {s.phone}
          </>
        )}
        {R.header && <div style={{ marginTop: 6 }}>{R.header}</div>}
      </div>
      <div className="rc-sep" />
      <div className="rc-row">
        <span>{order.code}</span>
        <span>
          {tgl(order.createdAt, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}{" "}
          {hhmm(order.createdAt)}
        </span>
      </div>
      {R.showTable && (
        <div className="rc-row">
          <span>
            {order.tableNumber ? "Meja " + order.tableNumber : "Bawa pulang"}
          </span>
          <span>{order.orderType === "MANUAL" ? "Kasir" : "QR"}</span>
        </div>
      )}
      {order.customerName && (
        <div className="rc-row">
          <span>Pelanggan</span>
          <span>{order.customerName}</span>
        </div>
      )}
      {R.showCashier && (
        <div className="rc-row">
          <span>Kasir</span>
          <span>{order.cashierName || cashierFallback}</span>
        </div>
      )}
      <div className="rc-sep" />
      {order.items.map((i, idx) => (
        <div className="rc-item" key={i.menuId + idx}>
          <div>{i.name}</div>
          <div className="rc-row">
            <span>
              {i.qty} x {num(i.price)}
            </span>
            <span>{num(i.price * i.qty)}</span>
          </div>
          {R.showNotes && i.note && <div className="rc-note">* {i.note}</div>}
        </div>
      ))}
      <div className="rc-sep" />
      <div className="rc-row">
        <span>Subtotal</span>
        <span>{num(t.subtotal)}</span>
      </div>
      {s.servicePercent > 0 && (
        <div className="rc-row">
          <span>Layanan {s.servicePercent}%</span>
          <span>{num(t.service)}</span>
        </div>
      )}
      {s.taxPercent > 0 && (
        <div className="rc-row">
          <span>
            Pajak {s.taxPercent}%{s.taxInclusive ? " (termasuk)" : ""}
          </span>
          <span>{num(t.tax)}</span>
        </div>
      )}
      <div className="rc-row rc-total">
        <span>TOTAL</span>
        <span>{num(t.total)}</span>
      </div>
      {order.status === "DIBATALKAN" ? (
        <div className="rc-c" style={{ marginTop: 6, fontWeight: 700 }}>
          ** DIBATALKAN **
        </div>
      ) : order.paymentStatus === "LUNAS" ? (
        <>
          <div className="rc-row">
            <span>
              {order.paymentMethod === "CASH"
                ? "Tunai"
                : "Non-tunai" +
                  (order.paymentChannel ? ` (${order.paymentChannel})` : "")}
            </span>
            <span>{num(paid)}</span>
          </div>
          {order.paymentMethod === "CASH" && (
            <div className="rc-row">
              <span>Kembali</span>
              <span>{num(paid - t.total)}</span>
            </div>
          )}
          <div className="rc-c" style={{ marginTop: 6, fontWeight: 700 }}>
            ** LUNAS **
          </div>
        </>
      ) : (
        <div className="rc-c" style={{ marginTop: 6 }}>
          BELUM DIBAYAR
        </div>
      )}
      <div className="rc-sep" />
      <div className="rc-c">{R.footer}</div>
    </div>
  );
}

/* ---------- Printing: renders content into .l-staf-print-area, then print() ---------- */

const PrintContext = createContext<(content: ReactNode) => void>(() => {});

export function PrintProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<{ n: number; content: ReactNode }>({
    n: 0,
    content: null,
  });
  const print = useCallback((content: ReactNode) => {
    flushSync(() => setJob((j) => ({ n: j.n + 1, content })));
  }, []);
  useEffect(() => {
    if (!job.n) return;
    // Same mechanism as the design: html[data-l-staf-printing] shows only
    // the print area while printing.
    const doc = document.documentElement;
    doc.dataset.lStafPrinting = "";
    const done = () => {
      delete doc.dataset.lStafPrinting;
      setJob((j) => ({ ...j, content: null }));
    };
    addEventListener("afterprint", done, { once: true });
    window.print();
    return () => removeEventListener("afterprint", done);
  }, [job.n]);
  return (
    <PrintContext.Provider value={print}>
      {children}
      <div className="l-staf-print-area" aria-hidden="true">
        {job.content}
      </div>
    </PrintContext.Provider>
  );
}

/** `const print = usePrint(); print(<ReceiptPaper … />)` */
export function usePrint() {
  return useContext(PrintContext);
}
