import type { ReactNode } from "react";
import {
  Ban,
  Check,
  CircleCheck,
  Minus,
  Printer,
  StickyNote,
  X,
} from "lucide-react";
import {
  hhmm,
  ORDER_STATUS,
  PAY_METHOD,
  rp,
  tglPanjang,
} from "@starter/shared/fnb/domain";
import type { CafeSettingsDto, OrderDto } from "@starter/shared/fnb/types";
import { Dialog, useToast } from "@/components/fnb/dialog";
import { ReceiptPaper, usePrint } from "@/components/fnb/receipt";
import {
  itemCount,
  minsBetween,
  nf,
  payDetail,
  trail,
  whereLabel,
} from "../filters";

type Step = {
  state: "done" | "cancel" | "skip";
  label: string;
  time: number | null;
  text: ReactNode;
};

const STEP_ICON = { done: Check, cancel: X, skip: Minus };

/** Transaction detail drawer (prototype "Detail transaksi"). */
export function TransactionDrawer({
  tx,
  session,
  settings,
  now,
  onClose,
}: {
  tx: OrderDto | null;
  session: boolean;
  settings: CafeSettingsDto;
  now: number;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={!!tx}
      onClose={onClose}
      kind="drawer"
      labelledBy="riwayat-d-title"
      data-node-id="riwayat.drawer"
    >
      {tx && (
        <DrawerContent
          t={tx}
          session={session}
          settings={settings}
          now={now}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function DrawerContent({
  t,
  session,
  settings,
  now,
  onClose,
}: {
  t: OrderDto;
  session: boolean;
  settings: CafeSettingsDto;
  now: number;
  onClose: () => void;
}) {
  const print = usePrint();
  const toast = useToast();
  const st = ORDER_STATUS[t.status];
  const tr = trail(t, now);
  const cancelled = t.status === "DIBATALKAN";
  const paid = t.paymentStatus === "LUNAS";
  const created = Date.parse(t.createdAt);

  const steps: Step[] = [
    {
      state: "done",
      label: "Dipesan",
      time: created,
      text:
        t.orderType === "QR" ? (
          `Pelanggan memesan lewat QR${t.tableNumber ? ` di Meja ${t.tableNumber}` : ""}`
        ) : (
          <>
            Dicatat kasir
            {t.customerName && (
              <>
                {" "}
                · a.n. <b>{t.customerName}</b>
              </>
            )}{" "}
            · {t.tableNumber ? "Meja " + t.tableNumber : "bawa pulang"}
          </>
        ),
    },
  ];
  if (tr.paid)
    steps.push({
      state: "done",
      label: "Dibayar",
      time: tr.paid,
      text: `${payDetail(t)}${t.cashierName ? ` · oleh ${t.cashierName}` : ""}`,
    });
  else if (cancelled)
    steps.push({
      state: "skip",
      label: "Tidak dibayar",
      time: null,
      text: "Pesanan batal sebelum ditagih",
    });
  if (cancelled)
    steps.push({
      state: "cancel",
      label: "Dibatalkan",
      time: tr.end,
      text: (
        <>
          Alasan: <b>{tr.reason || "tidak dicatat"}</b>
        </>
      ),
    });
  else
    steps.push({
      state: "done",
      label: "Selesai",
      time: tr.end,
      text: `Diantar & lunas${tr.end ? ` · ${minsBetween(created, tr.end)} menit setelah dipesan` : ""}`,
    });

  const payText = payDetail(t, false).replace(/^./, (c) => c.toUpperCase());

  function onPrint() {
    if (cancelled) return;
    print(<ReceiptPaper order={t} settings={settings} cashierFallback="-" />);
    toast(`Struk ${t.code} dikirim ke printer`);
  }

  return (
    <>
      <div className="l-staf-dialog-head">
        <div>
          <div className="r-d-title">
            <h2 id="riwayat-d-title">{t.code}</h2>
            <span className="l-staf-chip" data-tone={st.tone}>
              {st.label}
            </span>
            {session && (
              <span className="l-staf-chip r-sesi" data-tone="accent">
                Sesi ini
              </span>
            )}
          </div>
          <p>
            {tglPanjang(t.createdAt)} · {hhmm(t.createdAt)} · {whereLabel(t)} ·{" "}
            {t.orderType === "QR" ? "Pesanan QR" : "Dicatat kasir"}
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
        <h3 className="r-sec">Perjalanan pesanan</h3>
        <ol className="r-tl" aria-label="Perjalanan pesanan">
          {steps.map((s) => {
            const Icon = STEP_ICON[s.state];
            return (
              <li key={s.label} data-state={s.state}>
                <i>
                  <Icon aria-hidden="true" style={{ fontSize: 13 }} />
                </i>
                <div>
                  <strong>{s.label}</strong>
                  <small>{s.text}</small>
                </div>
                {s.time ? (
                  <time dateTime={new Date(s.time).toISOString()}>
                    {hhmm(s.time)}
                  </time>
                ) : (
                  <span />
                )}
              </li>
            );
          })}
        </ol>

        <h3 className="r-sec">Item pesanan · {nf(itemCount(t))}</h3>
        <ul className="r-d-items">
          {t.items.map((i, idx) => (
            <li className="r-d-item" key={i.id || i.menuId + idx}>
              <span className="l-staf-thumb" aria-hidden="true">
                {i.imageUrl}
              </span>
              <div>
                <strong>{i.name}</strong>
                <small>
                  {i.qty} × {rp(i.price)}
                </small>
                {i.note && (
                  <span className="r-note">
                    <StickyNote aria-hidden="true" style={{ fontSize: 12 }} />
                    {i.note}
                  </span>
                )}
              </div>
              <span className="l-staf-num">{rp(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="r-sum">
          <div>
            <span>Subtotal</span>
            <span>{rp(t.subtotal)}</span>
          </div>
          <div>
            <span>
              Pajak {settings.taxPercent}%
              {settings.taxInclusive ? " (termasuk)" : ""}
            </span>
            <span>{rp(t.tax)}</span>
          </div>
          {t.service > 0 && (
            <div>
              <span>Layanan {settings.servicePercent}%</span>
              <span>{rp(t.service)}</span>
            </div>
          )}
          <div className="r-sum-total">
            <span>Total</span>
            <span>{rp(t.totalAmount)}</span>
          </div>
        </div>

        <h3 className="r-sec">Pembayaran</h3>
        {paid ? (
          <div className="r-paybox">
            <CircleCheck aria-hidden="true" style={{ fontSize: 22 }} />
            <div>
              <strong>
                Lunas · {t.paymentMethod ? PAY_METHOD[t.paymentMethod] : ""}
                {t.paymentChannel ? ` (${t.paymentChannel})` : ""}
              </strong>
              <small>
                {payText}
                {tr.paid ? ` · pukul ${hhmm(tr.paid)}` : ""}
              </small>
            </div>
          </div>
        ) : (
          <div className="r-paybox" data-state="void">
            <Ban aria-hidden="true" style={{ fontSize: 22 }} />
            <div>
              <strong>Tidak ditagih</strong>
              <small>Pesanan dibatalkan, tidak dihitung dalam penjualan.</small>
            </div>
          </div>
        )}

        <h3 className="r-sec">Info</h3>
        <dl className="r-meta">
          <dt>Sumber</dt>
          <dd>{t.orderType === "QR" ? "Scan QR di meja" : "Dicatat kasir"}</dd>
          <dt>Jenis</dt>
          <dd>
            {t.tableNumber
              ? "Makan di tempat · Meja " + t.tableNumber
              : "Bawa pulang"}
          </dd>
          {t.customerName && (
            <>
              <dt>Pelanggan</dt>
              <dd>{t.customerName}</dd>
            </>
          )}
          <dt>Kasir</dt>
          <dd>{t.cashierName || "—"}</dd>
          <dt>Tercatat dari</dt>
          <dd>{session ? "Layar Pesanan · sesi ini" : "Riwayat transaksi"}</dd>
        </dl>

        <h3 className="r-sec">Pratinjau struk</h3>
        <div className="r-paper">
          <ReceiptPaper order={t} settings={settings} cashierFallback="-" />
        </div>
      </div>

      <div className="l-staf-dialog-foot r-d-foot">
        {cancelled && (
          <p className="l-staf-hint r-d-why" id="riwayat-print-why">
            <Ban aria-hidden="true" style={{ fontSize: 16 }} />
            <span>
              Struk tidak bisa dicetak ulang karena pesanan ini dibatalkan
              {paid ? "" : " dan tidak pernah dibayar"}.
            </span>
          </p>
        )}
        <button className="l-staf-btn" type="button" onClick={onClose}>
          Tutup
        </button>
        <button
          className="l-staf-btn"
          data-variant="primary"
          type="button"
          disabled={cancelled}
          aria-describedby={cancelled ? "riwayat-print-why" : undefined}
          onClick={onPrint}
        >
          <Printer aria-hidden="true" />
          Cetak ulang struk
        </button>
      </div>
    </>
  );
}
