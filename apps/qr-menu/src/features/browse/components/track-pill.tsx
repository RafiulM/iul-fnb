import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { orderStep } from "@/features/orders/status";
import type { CustomerSession } from "@/features/session/store";
import { motion } from "../motion";

export const ORDER_STEPS = [
  { icon: "🧾", label: "Pesanan diterima" },
  { icon: "👩‍🍳", label: "Sedang diproses" },
  { icon: "🛎️", label: "Siap diantar" },
  { icon: "🍽️", label: "Sudah diantar" },
] as const;

type Props = {
  order: NonNullable<CustomerSession["order"]>;
  onOpen: () => void;
  toast: (msg: string) => void;
};

/**
 * "Lacak pesanan" pill for the order sent from this table. The status follows
 * the cashier (polled by useTrackedOrder) and each change is toasted while the
 * page is open.
 */
export function TrackPill({ order: o, onOpen, toast }: Props) {
  const { idx } = orderStep(o);
  const cancelled = o.status === "DIBATALKAN";
  const paid = o.paymentStatus === "LUNAS";
  const step = ORDER_STEPS[idx] ?? ORDER_STEPS[0];
  const label = cancelled
    ? "Dibatalkan kasir"
    : step.label + (paid ? " · Lunas" : "");
  const sig = `${o.code}|${idx}|${cancelled}|${paid}`;

  const prevSig = useRef<string | null>(null);
  const icoRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const prev = prevSig.current;
    prevSig.current = sig;
    if (prev === null || prev === sig || !prev.startsWith(o.code + "|")) return;
    toast(
      cancelled
        ? `Pesanan ${o.code} dibatalkan kasir`
        : `Pesanan ${o.code}: ${label}`,
    );
    motion(
      icoRef.current,
      [
        { transform: "scale(.6)", opacity: 0 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 300 },
    );
  }, [sig, o.code, cancelled, label, toast]);

  return (
    <button
      type="button"
      className="pl-track"
      aria-live="polite"
      aria-label={`Lacak pesanan ${o.code}: ${label}`}
      onClick={onOpen}
    >
      <span className="pl-track-ico" aria-hidden="true" ref={icoRef}>
        {cancelled ? "🙏" : step.icon}
      </span>
      <span className="pl-track-txt">
        <small>Lacak pesanan</small>
        <strong>
          {o.code} · {label}
        </strong>
      </span>
      <ChevronRight aria-hidden="true" />
    </button>
  );
}
