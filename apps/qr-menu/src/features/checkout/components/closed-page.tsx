import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { CreditCard, Eye, Info, Zap } from "lucide-react";
import { setFlash, takeFlash } from "@/features/browse/state";
import { useCafe } from "@/features/catalog/hooks";
import { useCustomerSession } from "@/features/session/store";
import { useNow } from "@/lib/use-now";
import { closedPlan, DAY, dotT, hoursOn, range, rel, WEEK } from "../hours";
import { useDocumentTitle } from "../use-document-title";
import { usePageToast } from "./page-toast";
import { CafeMark } from "@/components/cafe-mark";

/** Port of design/src/pages/pelanggan-tutup.page.html. */
export function ClosedPage() {
  const { data: cafe } = useCafe();
  const [session, update] = useCustomerSession();
  const p = closedPlan(cafe, new Date(useNow(30_000)));
  const table = session.table || "–";

  useDocumentTitle(`Kafe tutup — ${cafe.cafeName} | IUL FnB`);
  const [toastEl, toast] = usePageToast("pc-toast");
  useEffect(() => {
    scrollTo({ top: 0 });
    const flash = takeFlash();
    if (flash) toast(flash);
  }, [toast]);

  const h = p.m / 60;
  const greet =
    h < 11
      ? "Selamat pagi"
      : h < 15
        ? "Selamat siang"
        : h < 18
          ? "Selamat sore"
          : "Selamat malam";

  const time = p.time ? dotT(p.time) : "";
  const nextWhen =
    p.off == null || p.nextDay == null
      ? ""
      : p.off === 0
        ? "pagi ini"
        : p.off === 1
          ? `besok, ${DAY[p.nextDay]},`
          : `hari ${DAY[p.nextDay]}`;
  const lead =
    p.off == null
      ? "Jadwal buka berikutnya belum tersedia. Tanyakan ke kasir, ya."
      : p.phase === "pagi"
        ? `Kami belum buka. Buka ${nextWhen} pukul ${time}${p.preview || p.mins == null ? "" : `, ${rel(p.mins)}`}.`
        : p.phase === "malam" && p.today
          ? `Kami sudah tutup pukul ${dotT(p.today[1])} malam ini. Buka lagi ${nextWhen} pukul ${time}.`
          : `Hari ini kami libur. Buka lagi ${nextWhen} pukul ${time}.`;
  const short =
    p.off == null || p.nextDay == null
      ? ""
      : p.off === 0
        ? "Hari ini"
        : p.off === 1
          ? "Besok"
          : DAY[p.nextDay];
  const nextRel =
    p.off == null || p.preview || p.mins == null ? "" : rel(p.mins);

  function browseOnly() {
    update((s) => {
      s.browseOnly = true;
    });
    setFlash(
      p.off == null || !p.time
        ? "Mode lihat menu: pemesanan sedang ditutup"
        : `Mode lihat menu: pesan lagi mulai pukul ${dotT(p.time)}`,
    );
  }
  function forceOpen() {
    update((s) => {
      s.forceOpen = true;
      s.browseOnly = false;
    });
    setFlash("Prototipe: kafe dianggap sedang buka");
  }

  return (
    <main
      aria-label="Kafe Tutup"
      className="p-pelanggan-tutup"
      data-node-id="pelanggan-tutup"
    >
      <div className="pc-app" data-node-id="pelanggan-tutup.app">
        <header className="pc-head" data-node-id="pelanggan-tutup.header">
          <div className="pc-head-top">
            <div className="pc-brand">
              <CafeMark cafe={cafe} className="pc-mono" />
              <div>
                <p className="pc-brand-name">{cafe.cafeName}</p>
                <p className="pc-brand-addr">{cafe.address}</p>
              </div>
            </div>
            <div
              className="pc-table"
              role="group"
              aria-label={`Nomor meja ${table}`}
            >
              <span aria-hidden="true">Meja</span>
              <strong>{table}</strong>
            </div>
          </div>
          <p className="pc-greet">{greet} 👋</p>
          <h1 className="pc-thesis">Kafe sedang tutup</h1>
          <p className="pc-lead">{lead}</p>
          <div className="pc-meta">
            <span className="pc-chip">
              {p.off == null
                ? "Tutup"
                : `Tutup · buka ${short.toLowerCase()} ${time}`}
            </span>
            <span className="pc-chip" data-tone="plain">
              <CreditCard aria-hidden="true" />
              Bayar di kasir
            </span>
          </div>
        </header>

        <dl className="pc-now" data-node-id="pelanggan-tutup.today">
          <div>
            <dt>Hari ini · {DAY[p.day]}</dt>
            <dd>{range(p.today)}</dd>
          </div>
          <div>
            <dt>Buka lagi</dt>
            <dd>
              <span>{p.off == null ? "–" : `${short} ${time}`}</span>
              <small hidden={!nextRel}>{nextRel}</small>
            </dd>
          </div>
        </dl>

        <section
          className="pc-card"
          aria-labelledby="pelanggan-tutup-week"
          data-node-id="pelanggan-tutup.week"
        >
          <h2 id="pelanggan-tutup-week">Jam operasional</h2>
          <ul className="pc-week">
            {WEEK.map((d) => {
              const cur = d === p.day;
              return (
                <li key={d} aria-current={cur ? "date" : undefined}>
                  <span>
                    {DAY[d]}
                    {cur && (
                      <span className="pc-chip" data-tone="accent">
                        Hari ini
                      </span>
                    )}
                  </span>
                  <span>{range(hoursOn(cafe, d))}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="pc-notice">
          <Info aria-hidden="true" />
          <span>
            Menu dan harga tetap bisa kamu lihat sekarang. Pesanan baru bisa
            dikirim lagi saat kafe buka.
          </span>
        </div>

        <div className="pc-actions">
          <Link
            className="pc-btn"
            data-block=""
            to="/"
            onClick={browseOnly}
            data-node-id="pelanggan-tutup.browse"
          >
            <Eye aria-hidden="true" />
            Lihat menu saja
          </Link>
        </div>

        <p className="pc-demo" data-node-id="pelanggan-tutup.proto">
          <Zap aria-hidden="true" />
          <span>
            <span>
              {p.preview && p.today
                ? `Saat ini kafe sebenarnya buka (${range(p.today)}); tampilan memakai keadaan setelah tutup pukul ${dotT(p.today[1])}.`
                : "Halaman ini muncul otomatis di luar jam buka."}
            </span>{" "}
            <Link to="/" onClick={forceOpen}>
              Prototipe: anggap kafe sedang buka
            </Link>
          </span>
        </p>

        <p className="pc-foot">
          Didukung oleh <strong>IUL FnB</strong>
        </p>
      </div>

      {toastEl}
    </main>
  );
}
