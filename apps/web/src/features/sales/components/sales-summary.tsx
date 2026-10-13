import type { ReactNode } from "react";
import {
  Banknote,
  Calendar,
  CreditCard,
  QrCode,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { hhmm, rp, rpShort } from "@starter/shared/fnb/domain";
import {
  dLong,
  nf,
  periodText,
  split,
  type Metrics,
  type Period,
} from "@/features/sales/aggregate";
import { CardEmpty, Delta, Points } from "./bits";

// Period line, KPI row, "Menu terlaris", and the two share cards.

export function PeriodLine({
  period: p,
  now,
}: {
  period: Period;
  now: number;
}) {
  const prev = p.prev!;
  return (
    <p className="pj-period" data-node-id="penjualan.period">
      <Calendar aria-hidden="true" style={{ fontSize: 16 }} />
      <span>
        <b>{periodText(p.start, p.end)}</b> · s.d. pukul {hhmm(now)}
      </span>
      <span>
        — dibandingkan dengan{" "}
        {p.key === "today"
          ? dLong(prev.start)
          : periodText(prev.start, prev.end)}{" "}
        s.d. pukul {hhmm(prev.end)}
      </span>
    </p>
  );
}

export function Kpis({ m, pm, vs }: { m: Metrics; pm: Metrics; vs: string }) {
  const top = m.top[0];
  return (
    <section
      className="pj-kpis"
      aria-label="Ringkasan penjualan"
      data-node-id="penjualan.kpis"
    >
      <div className="l-staf-metric">
        <span>Total penjualan</span>
        <strong>{rp(m.rev)}</strong>
        <small>
          <Delta cur={m.rev} prev={pm.rev} vs={vs} />
        </small>
      </div>
      <div className="l-staf-metric">
        <span>Jumlah pesanan</span>
        <strong>{nf(m.cnt)}</strong>
        <small>
          <Delta cur={m.cnt} prev={pm.cnt} vs={vs} />
        </small>
      </div>
      <div className="l-staf-metric">
        <span>Rata-rata per pesanan</span>
        <strong>{rp(m.avg)}</strong>
        <small>
          <Delta cur={m.avg} prev={pm.avg} vs={vs} />
        </small>
      </div>
      <div className="l-staf-metric">
        <span>Menu terlaris</span>
        <strong className="pj-kpi-name" title={top ? top.name : ""}>
          {top ? top.name : "—"}
        </strong>
        <small>
          {top ? (
            <>
              <b>{nf(top.qty)} terjual</b>
              <span>· {rpShort(top.rev)}</span>
            </>
          ) : (
            <span>Belum ada menu terjual</span>
          )}
        </small>
      </div>
    </section>
  );
}

export function TopMenus({ m }: { m: Metrics }) {
  const top = m.top.slice(0, 5);
  const max = top[0]?.qty ?? 0;
  return (
    <section
      className="l-staf-card pj-top-card"
      aria-labelledby="penjualan-top-title"
      data-node-id="penjualan.top"
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="penjualan-top-title">Menu terlaris</h2>
          <p>Urut dari porsi terjual · pendapatan sebelum pajak</p>
        </div>
      </div>
      <ol className="pj-top">
        {top.length ? (
          top.map((x) => {
            const share = m.qtyAll ? Math.round((x.qty / m.qtyAll) * 100) : 0;
            return (
              <li key={x.id}>
                <span className="l-staf-thumb" aria-hidden="true">
                  {x.emoji}
                </span>
                <div>
                  <div className="pj-tm-head">
                    <strong title={x.name}>{x.name}</strong>
                    <span>
                      <b>{nf(x.qty)}</b> terjual
                    </span>
                  </div>
                  <div className="pj-tm-bar" aria-hidden="true">
                    <i
                      style={{ width: `${((x.qty / max) * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <div className="pj-tm-foot">
                    {rp(x.rev)} · {share}% dari semua porsi
                  </div>
                </div>
              </li>
            );
          })
        ) : (
          <li className="pj-top-empty">
            <CardEmpty
              icon={Utensils}
              title="Belum ada menu terjual"
              text="Daftar ini terisi dari pesanan yang selesai."
            />
          </li>
        )}
      </ol>
    </section>
  );
}

type SharePart = {
  name: string;
  desc: string;
  pct: number;
  amt: number;
  raw: number;
  color: string;
};

function ShareBlock({
  pct,
  head,
  aria,
  parts,
  note,
}: {
  pct: number;
  head: string;
  aria: string;
  parts: SharePart[];
  note: ReactNode;
}) {
  return (
    <>
      <div className="pj-share-head">
        <strong>{pct}%</strong>
        <span>{head}</span>
      </div>
      <div className="pj-stack" role="img" aria-label={aria}>
        {parts
          .filter((x) => x.raw > 0)
          .map((x) => (
            <i
              key={x.name}
              style={{ flex: `${x.raw} 1 0`, background: x.color }}
            />
          ))}
      </div>
      <ul className="pj-legend">
        {parts.map((x) => (
          <li key={x.name}>
            <i className="pj-sw" style={{ background: x.color }} />
            <span className="pj-nm">
              {x.name}
              <small>{x.desc}</small>
            </span>
            <span className="pj-vl">
              <b>{x.pct}%</b>
              <small>{rp(x.amt)}</small>
            </span>
          </li>
        ))}
      </ul>
      {note && <p className="pj-note">{note}</p>}
    </>
  );
}

function NoteIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon aria-hidden="true" style={{ fontSize: 15 }} />;
}

export function PaymentShare({
  m,
  pm,
  period: p,
  vs,
}: {
  m: Metrics;
  pm: Metrics;
  period: Period;
  vs: string;
}) {
  const non = m.pay.NON_CASH;
  const cash = m.pay.CASH;
  let body: ReactNode;
  if (!non.amt && !cash.amt) {
    body = (
      <CardEmpty
        icon={CreditCard}
        title="Belum ada pembayaran"
        text="Porsi tunai dan non-tunai muncul setelah ada pesanan lunas."
      />
    );
  } else {
    const [pn, pc] = split(non.amt, cash.amt);
    const pt = pm.pay.NON_CASH.amt + pm.pay.CASH.amt;
    const note =
      p.key === "today" ? (
        <>
          <NoteIcon icon={Banknote} />
          <span>
            Uang tunai yang seharusnya ada di laci hari ini:{" "}
            <b>{rp(cash.amt)}</b>
          </span>
        </>
      ) : (
        <>
          <NoteIcon icon={CreditCard} />
          <span>
            Porsi non-tunai{" "}
            <Points
              cur={(non.amt / (non.amt + cash.amt)) * 100}
              prev={pt ? (pm.pay.NON_CASH.amt / pt) * 100 : null}
              vs={vs}
              neutral
            />
          </span>
        </>
      );
    body = (
      <ShareBlock
        pct={pn}
        head="penjualan dibayar non-tunai"
        aria={`Non-tunai ${pn}% (${rp(non.amt)}), tunai ${pc}% (${rp(cash.amt)})`}
        parts={[
          {
            name: "Non-tunai",
            desc: `${nf(non.n)} transaksi`,
            pct: pn,
            amt: non.amt,
            raw: non.amt,
            color: "var(--color-text)",
          },
          {
            name: "Tunai",
            desc: `${nf(cash.n)} transaksi`,
            pct: pc,
            amt: cash.amt,
            raw: cash.amt,
            color: "var(--pj-split)",
          },
        ]}
        note={note}
      />
    );
  }
  return (
    <section
      className="l-staf-card"
      aria-labelledby="penjualan-pay-title"
      data-node-id="penjualan.pay"
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="penjualan-pay-title">Metode pembayaran</h2>
          <p>Porsi dari total penjualan</p>
        </div>
      </div>
      <div className="l-staf-card-body">{body}</div>
    </section>
  );
}

export function SourceShare({
  m,
  pm,
  vs,
}: {
  m: Metrics;
  pm: Metrics;
  vs: string;
}) {
  const qr = m.src.QR;
  const man = m.src.MANUAL;
  let body: ReactNode;
  if (!qr.n && !man.n) {
    body = (
      <CardEmpty
        icon={QrCode}
        title="Belum ada pesanan"
        text="Porsi pesanan QR dan kasir muncul setelah ada pesanan selesai."
      />
    );
  } else {
    const [pq, pk] = split(qr.n, man.n);
    const prevShare = pm.cnt ? (pm.src.QR.n / pm.cnt) * 100 : null;
    body = (
      <ShareBlock
        pct={pq}
        head="pesanan masuk lewat QR"
        aria={`QR ${pq}% (${nf(qr.n)} pesanan), kasir ${pk}% (${nf(man.n)} pesanan)`}
        parts={[
          {
            name: "QR di meja",
            desc: `${nf(qr.n)} pesanan`,
            pct: pq,
            amt: qr.amt,
            raw: qr.n,
            color: "var(--color-text)",
          },
          {
            name: "Dicatat kasir",
            desc: `${nf(man.n)} pesanan`,
            pct: pk,
            amt: man.amt,
            raw: man.n,
            color: "var(--pj-split)",
          },
        ]}
        note={
          <>
            <NoteIcon icon={QrCode} />
            <span>
              Porsi QR{" "}
              <Points
                cur={(qr.n / (qr.n + man.n)) * 100}
                prev={prevShare}
                vs={vs}
              />{" "}
              (makin tinggi makin baik)
            </span>
          </>
        }
      />
    );
  }
  return (
    <section
      className="l-staf-card"
      aria-labelledby="penjualan-src-title"
      data-node-id="penjualan.source"
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="penjualan-src-title">Sumber pesanan</h2>
          <p>Pesan sendiri lewat QR vs dicatat kasir</p>
        </div>
      </div>
      <div className="l-staf-card-body">{body}</div>
    </section>
  );
}
