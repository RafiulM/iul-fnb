import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  CircleCheck,
  ClipboardList,
  Clock,
  CreditCard,
  History,
  Info,
  Landmark,
  Printer,
  QrCode,
  ShoppingBag,
  StickyNote,
  User,
  UserRound,
  Utensils,
} from "lucide-react";
import {
  ago,
  hhmm,
  minsSince,
  ORDER_STATUS,
  orderTotals,
  rp,
} from "@starter/shared/fnb/domain";
import type {
  CafeSettingsDto,
  OrderDto,
  PaymentMethod,
} from "@starter/shared/fnb/types";
import { useToast } from "@/components/fnb/dialog";
import { ReceiptPaper, usePrint } from "@/components/fnb/receipt";
import { usePayOrder, useTodayOrders } from "@/features/orders/hooks";
import { useSettings } from "@/features/settings/hooks";
import { useNow } from "@/lib/use-now";

// Port of design/src/pages/kasir-bayar.page.html: pick an unpaid order,
// take cash / non-cash payment, then show (and print) the receipt.

const CHANNELS = [
  { value: "QRIS", label: "QRIS", icon: QrCode },
  { value: "Kartu debit/kredit", label: "Kartu", icon: CreditCard },
  { value: "Transfer bank", label: "Transfer", icon: Landmark },
] as const;

const isActive = (o: OrderDto) =>
  o.status !== "SELESAI" && o.status !== "DIBATALKAN";
const whereLabel = (o: OrderDto) =>
  o.tableNumber ? "Meja " + o.tableNumber : "Bawa pulang";
const srcLabel = (o: OrderDto) =>
  o.orderType === "QR"
    ? "Pesanan QR"
    : "Kasir" + (o.customerName ? " · a.n. " + o.customerName : "");
const methodLabel = (o: OrderDto) =>
  o.paymentMethod === "CASH"
    ? "Tunai"
    : "Non-tunai" + (o.paymentChannel ? " · " + o.paymentChannel : "");
const shortAgo = (d: string, now: number) => {
  const m = minsSince(d, now);
  if (m < 1) return "Baru";
  if (m < 60) return m + " mnt";
  return Math.floor(m / 60) + " j " + (m % 60) + " m";
};

function quickAmounts(total: number) {
  const s = new Set([total]);
  for (const step of [5000, 10000, 50000, 100000])
    s.add(Math.ceil(total / step) * step);
  for (const v of [50000, 100000, 200000]) if (v >= total) s.add(v);
  return [...s].sort((a, b) => a - b).slice(0, 4);
}

type PayState = {
  code: string;
  method: PaymentMethod;
  received: number;
  channel: string;
};
const freshPay = (code: string): PayState => ({
  code,
  method: "CASH",
  received: 0,
  channel: "QRIS",
});

export function Payment({
  code,
  cashierName,
}: {
  /** `?code=` — the order to open (paid → its receipt). */
  code: string | undefined;
  cashierName: string;
}) {
  const { data: orders } = useTodayOrders();
  const { data: settings } = useSettings();
  const payOrder = usePayOrder();
  const toast = useToast();
  const print = usePrint();
  const navigate = useNavigate({ from: "/kasir/bayar" });
  const now = useNow(30_000);

  /** Order paid during this visit (shows the "Pembayaran berhasil" state). */
  const [justPaid, setJustPaid] = useState<string | null>(null);
  const [payState, setPayState] = useState<PayState | null>(null);

  const unpaid = orders
    .filter((o) => o.paymentStatus === "BELUM" && isActive(o))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let picked = code ? orders.find((o) => o.code === code) : undefined;
  // Cancelled before it was paid.
  if (picked && picked.paymentStatus !== "LUNAS" && !isActive(picked))
    picked = undefined;
  const o = picked ?? unpaid[0] ?? null;
  const paid = o?.paymentStatus === "LUNAS";

  const inputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  /** Focus to move once the next view is on screen (prototype focus()). */
  const focusNext = useRef<"input" | "title" | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    if (!target || (target === "title" && !paid)) return;
    const el = target === "input" ? inputRef.current : titleRef.current;
    if (!el) return;
    focusNext.current = null;
    el.focus({ preventScroll: true });
  });

  if (!o) {
    return (
      <main
        aria-label="Pembayaran"
        className="p-kasir-bayar"
        data-node-id="kasir-bayar"
      >
        <section
          className="l-staf-card b-empty"
          aria-labelledby="kasir-bayar-e-title"
          data-node-id="kasir-bayar.empty"
        >
          <div className="l-staf-empty">
            <CircleCheck aria-hidden="true" />
            <strong id="kasir-bayar-e-title">Semua pesanan sudah lunas</strong>
            <span>
              Tidak ada tagihan yang menunggu pembayaran. Pesanan baru akan
              muncul di sini setelah dicatat.
            </span>
            <div className="b-empty-actions">
              <Link className="l-staf-btn" data-variant="primary" to="/kasir">
                <ClipboardList aria-hidden="true" />
                Kembali ke pesanan
              </Link>
              <Link className="l-staf-btn" to="/riwayat">
                <History aria-hidden="true" />
                Lihat riwayat transaksi
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const pay = payState?.code === o.code ? payState : freshPay(o.code);
  const setPay = (patch: Partial<PayState>) =>
    setPayState({ ...pay, ...patch });
  const t = orderTotals(o.items, settings);
  const status = ORDER_STATUS[o.status];

  function nextUnpaid(after: OrderDto) {
    const list = unpaid.filter((x) => x.code !== after.code);
    return list.find((x) => x.createdAt > after.createdAt) ?? list[0] ?? null;
  }

  const pick = (next: string) => {
    if (!orders.some((x) => x.code === next)) return;
    // A new order starts on cash; focus the amount like the prototype.
    if (next !== o.code || pay.method === "CASH") focusNext.current = "input";
    setJustPaid(null);
    void navigate({ search: { code: next }, replace: true });
  };

  const confirmPay = async () => {
    if (paid || payOrder.isPending) return;
    if (pay.method === "CASH" && (!pay.received || pay.received < t.total))
      return;
    // Keep this order open after it is paid (it may leave the unpaid list).
    if (code !== o.code)
      await navigate({ search: { code: o.code }, replace: true });
    setJustPaid(o.code);
    focusNext.current = "title";
    try {
      await payOrder.mutateAsync({
        code: o.code,
        input: {
          method: pay.method,
          channel: pay.method === "NON_CASH" ? pay.channel : null,
          paidAmount: pay.method === "CASH" ? pay.received : t.total,
        },
      });
    } catch (e) {
      focusNext.current = null;
      setJustPaid(null);
      toast(e instanceof Error ? e.message : "Pembayaran gagal disimpan");
    }
  };

  const listTotal = unpaid.reduce(
    (a, x) => a + orderTotals(x.items, settings).total,
    0,
  );

  return (
    <main
      aria-label="Pembayaran"
      className="p-kasir-bayar"
      data-node-id="kasir-bayar"
    >
      <div className="b-left">
        <section
          className="l-staf-card b-queue"
          aria-labelledby="kasir-bayar-q-title"
          data-node-id="kasir-bayar.queue"
        >
          <div className="l-staf-card-head">
            <div>
              <h2 id="kasir-bayar-q-title">Belum dibayar</h2>
              <p>
                {unpaid.length
                  ? `Total ${rp(listTotal)} · pilih pesanan yang akan dibayar`
                  : "Tidak ada tagihan tersisa"}
              </p>
            </div>
            <span
              className="l-staf-chip"
              data-tone={unpaid.length ? "warning" : "positive"}
            >
              {unpaid.length} pesanan
            </span>
          </div>
          <div className="l-staf-card-body">
            <ul className="b-orders" aria-label="Pilih pesanan yang dibayar">
              {unpaid.length ? (
                unpaid.map((x) => {
                  const xt = orderTotals(x.items, settings);
                  const st = ORDER_STATUS[x.status];
                  return (
                    <li key={x.code}>
                      <button
                        type="button"
                        className="b-ord"
                        aria-pressed={x.code === o.code}
                        aria-label={`${whereLabel(x)}, ${x.code}, ${st.label}, ${rp(xt.total)}`}
                        onClick={() => pick(x.code)}
                      >
                        <span className="b-ord-top">
                          <strong>{whereLabel(x)}</strong>
                          <span className="l-staf-chip" data-tone={st.tone}>
                            {st.label}
                          </span>
                        </span>
                        <span className="b-ord-meta">
                          {x.code} · {srcLabel(x)} · {xt.count} item
                        </span>
                        <span className="b-ord-bot">
                          <span className="b-ord-total">{rp(xt.total)}</span>
                          <span className="b-ord-time">
                            <Clock
                              aria-hidden="true"
                              style={{ fontSize: 13 }}
                            />
                            {shortAgo(x.createdAt, now)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="b-none">
                  <CircleCheck aria-hidden="true" style={{ fontSize: 18 }} />
                  Semua pesanan sudah lunas
                </li>
              )}
            </ul>
          </div>
        </section>

        <OrderSummary order={o} settings={settings} now={now} />
      </div>

      <section
        className="l-staf-card b-pay"
        aria-labelledby="kasir-bayar-p-title"
        data-node-id="kasir-bayar.pay"
      >
        <div className="l-staf-card-head">
          <div>
            <h2 id="kasir-bayar-p-title" tabIndex={-1} ref={titleRef}>
              {!paid
                ? "Terima pembayaran"
                : justPaid === o.code
                  ? "Pembayaran berhasil"
                  : "Struk " + o.code}
            </h2>
            <p>
              {o.code} · {whereLabel(o)} · {t.count} item
            </p>
          </div>
        </div>
        {paid ? (
          <ReceiptView
            order={o}
            settings={settings}
            fresh={justPaid === o.code}
            next={nextUnpaid(o)}
            onPick={pick}
            onPrint={() =>
              print(
                <ReceiptPaper
                  order={o}
                  settings={settings}
                  cashierFallback={cashierName}
                />,
              )
            }
            cashierName={cashierName}
          />
        ) : (
          <div className="l-staf-card-body">
            <div className="b-paytotal">
              <span>Total tagihan</span>
              <strong>{rp(t.total)}</strong>
            </div>
            <div
              className="l-staf-seg"
              data-block
              role="tablist"
              aria-label="Metode pembayaran"
            >
              <button
                type="button"
                role="tab"
                aria-selected={pay.method === "CASH"}
                onClick={() => {
                  focusNext.current = "input";
                  setPay({ method: "CASH" });
                }}
              >
                <Banknote aria-hidden="true" />
                Tunai
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pay.method === "NON_CASH"}
                onClick={() => setPay({ method: "NON_CASH" })}
              >
                <CreditCard aria-hidden="true" />
                Non-tunai
              </button>
            </div>
            <CashPanel
              hidden={pay.method !== "CASH"}
              total={t.total}
              received={pay.received}
              inputRef={inputRef}
              onReceived={(received) => setPay({ received })}
              onEnter={() => void confirmPay()}
            />
            <div className="b-panel" hidden={pay.method === "CASH"}>
              <fieldset className="b-methods">
                <legend>Jenis pembayaran non-tunai</legend>
                {CHANNELS.map((c) => (
                  <label className="b-method" key={c.value}>
                    <input
                      type="radio"
                      name="kasir-bayar-channel"
                      value={c.value}
                      checked={pay.channel === c.value}
                      onChange={() => setPay({ channel: c.value })}
                    />
                    <c.icon aria-hidden="true" />
                    {c.label}
                  </label>
                ))}
              </fieldset>
              <div className="l-staf-alert" data-tone="neutral">
                <Info aria-hidden="true" />
                <span>
                  Pastikan pembayaran berhasil di mesin EDC atau aplikasi
                  sebelum menekan konfirmasi.
                </span>
              </div>
            </div>
            <button
              className="l-staf-btn b-confirm"
              data-variant="primary"
              data-block
              type="button"
              disabled={
                payOrder.isPending ||
                (pay.method === "CASH" &&
                  (!pay.received || pay.received < t.total))
              }
              onClick={() => void confirmPay()}
            >
              <Check aria-hidden="true" />
              Konfirmasi lunas
            </button>
            <p className="l-staf-hint b-after">
              {o.status === "DIANTAR"
                ? "Pesanan sudah diantar — setelah lunas langsung selesai dan masuk riwayat."
                : `Pesanan masih ${status.label.toLowerCase()} — setelah lunas tetap di antrean sampai diantar.`}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function CashPanel({
  hidden,
  total,
  received,
  inputRef,
  onReceived,
  onEnter,
}: {
  hidden: boolean;
  total: number;
  received: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onReceived: (n: number) => void;
  onEnter: () => void;
}) {
  const diff = received - total;
  return (
    <div className="b-panel" hidden={hidden}>
      <div className="l-staf-field">
        <label htmlFor="kasir-bayar-input">Uang diterima</label>
        <div className="l-staf-affix">
          <span>Rp</span>
          <input
            ref={inputRef}
            id="kasir-bayar-input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            aria-describedby="kasir-bayar-change"
            value={received ? received.toLocaleString("id-ID") : ""}
            onChange={(e) =>
              onReceived(
                Math.min(
                  parseInt(e.target.value.replace(/\D/g, ""), 10) || 0,
                  99_999_999,
                ),
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") onEnter();
            }}
          />
        </div>
      </div>
      <div className="b-quick" role="group" aria-label="Nominal cepat">
        {quickAmounts(total).map((v, i) => (
          <button
            key={v}
            type="button"
            className="l-staf-btn"
            data-size="sm"
            aria-label={i === 0 ? `Uang pas, ${rp(v)}` : undefined}
            onClick={() => onReceived(v)}
          >
            {i === 0 ? "Uang pas" : rp(v).replace("Rp ", "")}
          </button>
        ))}
      </div>
      <div
        className="b-change"
        id="kasir-bayar-change"
        role="status"
        data-state={!received ? "" : diff >= 0 ? "ok" : "short"}
      >
        {!received ? (
          <>
            <span>Kembalian</span>
            <strong>—</strong>
          </>
        ) : diff >= 0 ? (
          <>
            <span>Kembalian</span>
            <strong>{rp(diff)}</strong>
          </>
        ) : (
          <>
            <span>Uang kurang</span>
            <strong>{rp(-diff)}</strong>
          </>
        )}
      </div>
    </div>
  );
}

function OrderSummary({
  order: o,
  settings,
  now,
}: {
  order: OrderDto;
  settings: CafeSettingsDto;
  now: number;
}) {
  const t = orderTotals(o.items, settings);
  const status = ORDER_STATUS[o.status];
  const paid = o.paymentStatus === "LUNAS";
  return (
    <section
      className="l-staf-card"
      aria-labelledby="kasir-bayar-s-title"
      data-node-id="kasir-bayar.summary"
    >
      <div className="l-staf-card-head">
        <div>
          <div className="b-title">
            <h2 id="kasir-bayar-s-title">{whereLabel(o)}</h2>
            <span className="l-staf-chip" data-tone={status.tone}>
              {status.label}
            </span>
            <span
              className="l-staf-chip"
              data-tone={paid ? "positive" : "warning"}
            >
              {paid ? "Lunas" : "Belum bayar"}
            </span>
          </div>
          <p>
            {o.code} · {srcLabel(o)} · masuk {hhmm(o.createdAt)} (
            {ago(o.createdAt, now)})
          </p>
        </div>
      </div>
      <div className="l-staf-card-body">
        <ul className="b-items" aria-label="Item pesanan">
          {o.items.map((i, idx) => (
            <li className="b-item" key={i.id || idx}>
              <span className="l-staf-thumb" aria-hidden="true">
                {i.imageUrl}
              </span>
              <div>
                <strong>{i.name}</strong>
                <small>
                  {i.qty} × {rp(i.price)}
                </small>
                {i.note && (
                  <span className="b-note">
                    <StickyNote aria-hidden="true" style={{ fontSize: 12 }} />
                    {i.note}
                  </span>
                )}
              </div>
              <span className="l-staf-num">{rp(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="b-sum">
          <div>
            <span>Subtotal ({t.count} item)</span>
            <span>{rp(t.subtotal)}</span>
          </div>
          {settings.servicePercent > 0 && (
            <div>
              <span>Layanan {settings.servicePercent}%</span>
              <span>{rp(t.service)}</span>
            </div>
          )}
          <div>
            <span>
              Pajak {settings.taxPercent}%
              {settings.taxInclusive ? " (termasuk)" : ""}
            </span>
            <span>{rp(t.tax)}</span>
          </div>
          <div className="b-sum-total">
            <span>Total</span>
            <span>{rp(t.total)}</span>
          </div>
          {paid && (
            <>
              <div>
                <span>Dibayar · {methodLabel(o)}</span>
                <span>{rp(o.paidAmount ?? t.total)}</span>
              </div>
              {o.paymentMethod === "CASH" && (
                <div>
                  <span>Kembalian</span>
                  <span>{rp((o.paidAmount ?? t.total) - t.total)}</span>
                </div>
              )}
            </>
          )}
        </div>
        <ul className="b-meta">
          <li>
            {o.orderType === "QR" ? (
              <QrCode aria-hidden="true" style={{ fontSize: 14 }} />
            ) : (
              <User aria-hidden="true" style={{ fontSize: 14 }} />
            )}
            {o.orderType === "QR" ? "Scan QR di meja" : "Dicatat kasir"}
          </li>
          <li>
            {o.tableNumber ? (
              <Utensils aria-hidden="true" style={{ fontSize: 14 }} />
            ) : (
              <ShoppingBag aria-hidden="true" style={{ fontSize: 14 }} />
            )}
            {o.tableNumber ? "Makan di tempat" : "Bawa pulang"}
          </li>
          {o.customerName && (
            <li>
              <UserRound aria-hidden="true" style={{ fontSize: 14 }} />
              a.n. {o.customerName}
            </li>
          )}
          {o.cashierName && (
            <li>
              <BadgeCheck aria-hidden="true" style={{ fontSize: 14 }} />
              Kasir: {o.cashierName}
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function ReceiptView({
  order: o,
  settings,
  fresh,
  next,
  onPick,
  onPrint,
  cashierName,
}: {
  order: OrderDto;
  settings: CafeSettingsDto;
  fresh: boolean;
  next: OrderDto | null;
  onPick: (code: string) => void;
  onPrint: () => void;
  cashierName: string;
}) {
  const t = orderTotals(o.items, settings);
  const paidAmount = o.paidAmount ?? t.total;
  const nextBtn = (primary: boolean) =>
    next && (
      <button
        type="button"
        className="l-staf-btn"
        data-variant={primary ? "primary" : undefined}
        data-block={primary || undefined}
        title={`${whereLabel(next)} · ${next.code}`}
        onClick={() => onPick(next.code)}
      >
        <ArrowRight aria-hidden="true" style={{ fontSize: 18 }} />
        Pesanan berikutnya
        {primary && (
          <>
            {" "}
            <small>
              {whereLabel(next)} · {next.code}
            </small>
          </>
        )}
      </button>
    );
  const printBtn = (primary: boolean) => (
    <button
      type="button"
      className="l-staf-btn"
      data-variant={primary ? "primary" : undefined}
      data-block={primary || undefined}
      onClick={onPrint}
    >
      <Printer aria-hidden="true" style={{ fontSize: 18 }} />
      Cetak struk
    </button>
  );
  const backLink = (primary: boolean) => (
    <Link
      className="l-staf-btn"
      data-variant={primary ? "primary" : undefined}
      to="/kasir"
    >
      <ClipboardList aria-hidden="true" style={{ fontSize: 18 }} />
      Kembali ke pesanan
    </Link>
  );

  return (
    <div className="l-staf-card-body">
      {fresh ? (
        <div className="b-paid">
          <Check aria-hidden="true" style={{ fontSize: 26 }} />
          <strong>{rp(t.total)} lunas</strong>
          <span>
            {o.paymentMethod === "CASH"
              ? `Tunai ${rp(paidAmount)} · kembalian ${rp(paidAmount - t.total)}`
              : methodLabel(o)}
          </span>
          <span>
            {o.status === "SELESAI"
              ? "Pesanan selesai dan masuk riwayat transaksi."
              : "Pesanan tetap di antrean sampai diantar."}
          </span>
        </div>
      ) : (
        <div className="b-paidline">
          <CircleCheck aria-hidden="true" style={{ fontSize: 22 }} />
          <div>
            <strong>Lunas · {methodLabel(o)}</strong>
            <small>
              Dibayar {o.paidAt ? hhmm(o.paidAt) : "—"}
              {o.cashierName ? " · kasir " + o.cashierName : ""}
            </small>
          </div>
        </div>
      )}
      <div
        className="b-paper"
        role="region"
        tabIndex={0}
        aria-label={`Pratinjau struk ${o.code}`}
      >
        <ReceiptPaper
          order={o}
          settings={settings}
          cashierFallback={cashierName}
        />
      </div>
      <div className="b-rc-actions">
        {fresh ? (
          next ? (
            <>
              {nextBtn(true)}
              <div className="b-rc-row">
                {printBtn(false)}
                {backLink(false)}
              </div>
            </>
          ) : (
            <div className="b-rc-row">
              {printBtn(false)}
              {backLink(true)}
            </div>
          )
        ) : (
          <>
            {printBtn(true)}
            <div className="b-rc-row">
              {nextBtn(false)}
              {backLink(false)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
