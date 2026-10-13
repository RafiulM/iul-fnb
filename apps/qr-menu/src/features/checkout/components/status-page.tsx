import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  CircleCheck,
  Info,
  Link2,
  Plus,
  Receipt,
  StickyNote,
  Utensils,
  X,
} from "lucide-react";
import { hhmm, rp } from "@starter/shared/fnb/domain";
import { takeFlash } from "@/features/browse/state";
import { useCafe } from "@/features/catalog/hooks";
import { orderStep, useTrackedOrder } from "@/features/orders/status";
import {
  useCustomerSession,
  type CustomerSession,
} from "@/features/session/store";
import { motion } from "../motion";
import { useDocumentTitle } from "../use-document-title";
import { usePageToast } from "./page-toast";
import { SummaryRows } from "./summary";
import { CafeMark } from "@/components/cafe-mark";

type Step = { icon?: string; label: string; desc: string };
type StepState = "done" | "current" | "todo" | "cancelled";

const STEPS = [
  {
    icon: "🧾",
    label: "Pesanan diterima",
    desc: "Kasir sudah menerima pesananmu",
    title: "Pesanan terkirim!",
    sub: "Kasir sudah menerima pesananmu dan akan segera memprosesnya.",
  },
  {
    icon: "👩‍🍳",
    label: "Sedang diproses",
    desc: "Dapur sedang menyiapkan pesanan",
    title: "Pesananmu sedang dibuat",
    sub: "Dapur sedang menyiapkan pesanan. Tunggu sebentar, ya.",
  },
  {
    icon: "🛎️",
    label: "Siap diantar",
    desc: "Pesanan sudah siap dan segera diantar",
    title: "Pesanan siap!",
    sub: "Pesananmu segera diantar ke mejamu.",
  },
  {
    icon: "🍽️",
    label: "Sudah diantar",
    desc: "Selamat menikmati!",
    title: "Selamat menikmati!",
    sub: "Pesanan sudah diantar. Jangan lupa bayar di kasir, ya.",
  },
] as const;

const SR: Record<StepState, string> = {
  done: " (selesai)",
  current: " (sekarang)",
  todo: " (belum)",
  cancelled: "",
};

function StepRow({
  step,
  state,
  time,
}: {
  step: Step;
  state: StepState;
  time: string | null | undefined;
}) {
  return (
    <li
      className="pc-step"
      data-state={state}
      aria-current={state === "current" ? "step" : undefined}
    >
      <span className="pc-dot" aria-hidden="true">
        {state === "done" ? (
          <Check style={{ fontSize: 16 }} />
        ) : state === "cancelled" ? (
          <X style={{ fontSize: 16 }} />
        ) : (
          <span>{step.icon}</span>
        )}
      </span>
      <div>
        <strong>
          {step.label}
          <span className="pc-sr">{SR[state]}</span>
        </strong>
        <p>{step.desc}</p>
      </div>
      {time ? <time dateTime={time}>{hhmm(time)}</time> : <span></span>}
    </li>
  );
}

/** Port of design/src/pages/pelanggan-status.page.html. */
export function StatusPage() {
  const { data: cafe } = useCafe();
  const [session] = useCustomerSession();
  useTrackedOrder();
  const iconRef = useRef<HTMLSpanElement>(null);
  const lastMark = useRef<string | null>(null);
  const [toastEl, toast] = usePageToast("pc-toast");

  const view = statusView(session);
  const o = session.order;
  const table = o?.tableNumber ?? (session.table || "–");

  useDocumentTitle(
    o
      ? `Pesanan ${o.code} — ${cafe.cafeName} | IUL FnB`
      : `Status pesanan — ${cafe.cafeName} | IUL FnB`,
  );

  useEffect(() => {
    scrollTo({ top: 0 });
    const flash = takeFlash();
    if (flash) toast(flash);
  }, [toast]);

  // The status icon pops when the order moves to a new step.
  useEffect(() => {
    if (
      lastMark.current &&
      lastMark.current !== "empty" &&
      lastMark.current !== view.mark
    )
      motion(
        iconRef.current,
        [
          { opacity: 0, transform: "scale(.6)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 300 },
      );
    lastMark.current = view.mark;
  }, [view.mark]);

  return (
    <main
      aria-label="Status Pesanan"
      className="p-pelanggan-status"
      data-node-id="pelanggan-status"
    >
      <div className="pc-app" data-node-id="pelanggan-status.app">
        <header className="pc-bar" data-node-id="pelanggan-status.bar">
          <Link className="pc-iconbtn" to="/" aria-label="Kembali ke menu">
            <ChevronLeft aria-hidden="true" />
          </Link>
          <div className="pc-bar-title">
            <strong>Status pesanan</strong>
            <span>
              {cafe.cafeName} · Meja {table}
            </span>
          </div>
          <CafeMark cafe={cafe} className="pc-mono" />
        </header>

        <section
          className="pc-st-head"
          aria-labelledby="pelanggan-status-title"
          data-node-id="pelanggan-status.head"
        >
          <span className="pc-st-icon" aria-hidden="true" ref={iconRef}>
            {view.icon}
          </span>
          <h1 id="pelanggan-status-title">{view.title}</h1>
          <p>{view.sub}</p>
          <p className="pc-sr" role="status" aria-live="polite">
            {view.announce}
          </p>
        </section>

        {o && view.kind === "order" ? (
          <div data-node-id="pelanggan-status.order">
            <dl className="pc-st-meta" data-node-id="pelanggan-status.meta">
              <div>
                <dt>No. pesanan</dt>
                <dd>{o.code}</dd>
              </div>
              <div>
                <dt>Meja</dt>
                <dd>{table}</dd>
              </div>
              <div>
                <dt>Dipesan</dt>
                <dd>{hhmm(o.createdAt)}</dd>
              </div>
            </dl>

            <ol
              className="pc-timeline"
              aria-label="Progres pesanan"
              data-node-id="pelanggan-status.timeline"
            >
              {view.cancelled ? (
                <>
                  {STEPS.slice(0, view.reached).map((s, i) => (
                    <StepRow
                      key={s.label}
                      step={s}
                      state="done"
                      time={view.times[i]}
                    />
                  ))}
                  <StepRow
                    step={{
                      label: "Dibatalkan kasir",
                      desc: "Pesanan tidak dilanjutkan",
                    }}
                    state="cancelled"
                    time={o.updatedAt}
                  />
                </>
              ) : (
                STEPS.map((s, i) => (
                  <StepRow
                    key={s.label}
                    step={s}
                    state={
                      i < view.idx
                        ? "done"
                        : i === view.idx
                          ? i === STEPS.length - 1
                            ? "done"
                            : "current"
                          : "todo"
                    }
                    time={i <= view.idx ? view.times[i] : null}
                  />
                ))
              )}
            </ol>

            <section
              className="pc-receipt"
              aria-labelledby="pelanggan-status-rc"
              data-cancelled={view.cancelled ? "" : undefined}
              data-node-id="pelanggan-status.receipt"
            >
              <div className="pc-receipt-head">
                <h2 id="pelanggan-status-rc">Rincian pesanan</h2>
                <span
                  className="pc-chip"
                  data-tone={
                    view.paid
                      ? "positive"
                      : view.cancelled
                        ? "plain"
                        : "warning"
                  }
                >
                  {view.paid
                    ? "Lunas"
                    : view.cancelled
                      ? "Tidak ditagih"
                      : "Belum dibayar"}
                </span>
              </div>
              <ul className="pc-r-items">
                {o.items.map((l) => (
                  <li key={l.id}>
                    <span className="q">{l.qty}×</span>
                    <span>
                      {l.name}
                      {l.note && (
                        <small>
                          <StickyNote
                            aria-hidden="true"
                            style={{ fontSize: 12 }}
                          />
                          {l.note}
                        </small>
                      )}
                    </span>
                    <span className="p">{rp(l.price * l.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="pc-sum">
                <SummaryRows
                  totals={{
                    subtotal: o.subtotal,
                    tax: o.tax,
                    service: o.service,
                    total: o.totalAmount,
                    count: o.items.reduce((a, l) => a + l.qty, 0),
                  }}
                  settings={cafe}
                  totalClass="pc-total"
                />
              </div>
              <div
                className="pc-notice"
                data-tone={view.paid && !view.cancelled ? "positive" : ""}
              >
                {view.cancelled ? (
                  <>
                    <Info aria-hidden="true" style={{ fontSize: 18 }} />
                    {view.paid ? (
                      <span>
                        Pembayaran untuk <strong>{o.code}</strong> sudah
                        tercatat. Tunjukkan halaman ini ke kasir untuk
                        pengembalian dana.
                      </span>
                    ) : (
                      <span>
                        Pesanan dibatalkan, jadi tidak ada tagihan untuk{" "}
                        <strong>{o.code}</strong>.
                      </span>
                    )}
                  </>
                ) : view.paid ? (
                  <>
                    <CircleCheck aria-hidden="true" style={{ fontSize: 18 }} />
                    <span>Pembayaran sudah diterima kasir. Terima kasih!</span>
                  </>
                ) : (
                  <>
                    <Receipt aria-hidden="true" style={{ fontSize: 18 }} />
                    <span>
                      Sebutkan nomor pesanan <strong>{o.code}</strong> saat
                      membayar di kasir, tunai atau non-tunai.
                    </span>
                  </>
                )}
              </div>
            </section>

            <div
              className="pc-sync"
              data-mode="live"
              data-node-id="pelanggan-status.sync"
            >
              <Link2 aria-hidden="true" style={{ fontSize: 18 }} />
              <span>
                <strong>Terhubung ke layar kasir</strong>
                Status berubah mengikuti update dari kasir secara langsung.
              </span>
            </div>

            <div className="pc-actions">
              <Link
                className="pc-btn"
                data-block=""
                to="/"
                data-node-id="pelanggan-status.more"
              >
                <Plus aria-hidden="true" />
                Pesan menu lain
              </Link>
            </div>
          </div>
        ) : (
          <div data-node-id="pelanggan-status.empty">
            <section
              className="pc-howto"
              aria-labelledby="pelanggan-status-howto"
            >
              <h2 id="pelanggan-status-howto">Cara memesan dari meja</h2>
              <ol>
                <li>Pilih menu, atur jumlah, dan tambah catatan</li>
                <li>Periksa keranjang, lalu kirim pesanan</li>
                <li>Pantau statusnya di halaman ini sampai diantar</li>
              </ol>
            </section>
            <div className="pc-actions">
              <Link
                className="pc-btn"
                data-variant="primary"
                data-block=""
                to="/"
              >
                <Utensils aria-hidden="true" />
                Lihat menu
              </Link>
            </div>
          </div>
        )}

        <p className="pc-foot">
          Pembayaran tunai atau non-tunai dilakukan di kasir.
          <br />
          <br />
          Didukung oleh <strong>IUL FnB</strong>
        </p>
      </div>

      {toastEl}
    </main>
  );
}

/** Everything the head/timeline need for the current moment. */
function statusView(session: CustomerSession) {
  const o = session.order;
  if (!o)
    return {
      kind: "empty" as const,
      mark: "empty",
      icon: "🧾",
      title: "Belum ada pesanan",
      sub: `Pesanan yang kamu kirim dari ${session.table ? `Meja ${session.table}` : "mejamu"} akan muncul di sini, lengkap dengan statusnya.`,
      announce: "",
      idx: 0,
      times: [] as (string | null)[],
      reached: 0,
      cancelled: false,
      paid: false,
    };

  const { idx, times } = orderStep(o);
  const cancelled = o.status === "DIBATALKAN";
  const paid = o.paymentStatus === "LUNAS";
  const step = STEPS[Math.min(idx, STEPS.length - 1)]!;
  const table = o.tableNumber ?? session.table;

  // Steps reached before the cashier cancelled.
  const reached = Math.max(1, times.filter(Boolean).length);

  const sub = cancelled
    ? paid
      ? "Kasir membatalkan pesanan ini. Pembayaranmu sudah tercatat, kasir akan membantu mengembalikannya."
      : "Kasir membatalkan pesanan ini, biasanya karena ada menu yang habis. Kamu tidak perlu membayar apa pun. Tanyakan ke kasir bila ingin memesan ulang."
    : idx === 2
      ? `Pesananmu segera diantar ke Meja ${table}.`
      : idx === 3 && paid
        ? "Pesanan sudah diantar dan pembayaran lunas. Terima kasih sudah mampir!"
        : step.sub;

  return {
    kind: "order" as const,
    mark: `${o.code}|${idx}|${cancelled}|${paid}`,
    icon: cancelled ? "🙏" : step.icon,
    title: cancelled ? "Pesanan dibatalkan" : step.title,
    sub,
    announce: cancelled
      ? `Pesanan ${o.code} dibatalkan kasir`
      : `Pesanan ${o.code}: ${step.label}${paid ? ", sudah lunas" : ""}`,
    idx,
    times,
    reached,
    cancelled,
    paid,
  };
}
