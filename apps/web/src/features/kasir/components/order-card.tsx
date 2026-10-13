import { Clock, QrCode, StickyNote, User } from "lucide-react";
import { hhmm, rp } from "@starter/shared/fnb/domain";
import type { OrderDto } from "@starter/shared/fnb/types";
import {
  isLate,
  nextAction,
  shortAgo,
  srcLabel,
  whereLabel,
  type NextAction,
} from "../helpers";

export function PayChip({ order }: { order: OrderDto }) {
  return order.paymentStatus === "LUNAS" ? (
    <span className="l-staf-chip" data-tone="positive">
      Lunas
    </span>
  ) : (
    <span className="l-staf-chip" data-tone="warning">
      Belum bayar
    </span>
  );
}

export function OrderCard({
  order: o,
  now,
  fresh,
  busy,
  onOpen,
  onAction,
}: {
  order: OrderDto;
  now: number;
  fresh: boolean;
  busy: boolean;
  onOpen: (code: string) => void;
  onAction: (act: NextAction["act"], code: string) => void;
}) {
  const a = nextAction(o);
  const late = isLate(o, now);
  const where = whereLabel(o);
  const shown = o.items.slice(0, 4);
  const more = o.items.length - shown.length;
  const SrcIcon = o.orderType === "QR" ? QrCode : User;

  return (
    <article
      className="k-card"
      data-code={o.code}
      data-state={fresh ? "new" : undefined}
      data-late={late ? "" : undefined}
    >
      <div className="k-card-head">
        <button
          type="button"
          className="k-open"
          aria-label={`Detail pesanan ${o.code}, ${where}`}
          onClick={() => onOpen(o.code)}
        >
          {where}
        </button>
        <span className="k-time" title={`Masuk ${hhmm(o.createdAt)}`}>
          <Clock aria-hidden="true" style={{ fontSize: 13 }} />
          {shortAgo(o.createdAt, now)}
        </span>
      </div>
      <div className="k-src">
        <span>{o.code}</span>
        <span aria-hidden="true">·</span>
        <SrcIcon aria-hidden="true" style={{ fontSize: 13 }} />
        <span>{srcLabel(o)}</span>
        {late ? (
          <span className="l-staf-chip" data-tone="warning">
            Lama menunggu
          </span>
        ) : null}
      </div>
      <ul className="k-items">
        {shown.map((i) => (
          <li key={i.id}>
            <b>{i.qty}×</b>
            {i.name}
            {i.note ? (
              <span className="k-note">
                <StickyNote aria-hidden="true" style={{ fontSize: 12 }} />
                {i.note}
              </span>
            ) : null}
          </li>
        ))}
        {more > 0 ? (
          <li style={{ color: "var(--color-text-muted)" }}>
            +{more} menu lainnya
          </li>
        ) : null}
      </ul>
      <div className="k-foot">
        <span className="k-total">{rp(o.totalAmount)}</span>
        <PayChip order={o} />
      </div>
      {a ? (
        <button
          type="button"
          className="l-staf-btn k-act"
          data-size="sm"
          data-block=""
          disabled={busy}
          onClick={() => onAction(a.act, o.code)}
        >
          {a.label}
        </button>
      ) : null}
    </article>
  );
}
