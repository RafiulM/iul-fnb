import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { isOpenAt } from "@starter/shared/fnb/domain";
import { setFlash, takeFlash } from "@/features/browse/state";
import { useCafe } from "@/features/catalog/hooks";
import { useCustomerSession } from "@/features/session/store";
import { useNow } from "@/lib/use-now";
import { DAY, hoursOn, range, WEEK } from "../hours";
import { useDocumentTitle } from "../use-document-title";
import { usePageToast } from "./page-toast";
import { CafeMark } from "@/components/cafe-mark";

/** Port of design/src/pages/pelanggan-tidak-valid.page.html. */
export function InvalidTablePage() {
  const { data: cafe } = useCafe();
  const [session, update] = useCustomerSession();
  const now = new Date(useNow(60_000));

  useDocumentTitle(`QR tidak valid — ${cafe.cafeName} | IUL FnB`);
  const [toastEl, toast] = usePageToast("pc-toast");
  useEffect(() => {
    scrollTo({ top: 0 });
    const flash = takeFlash();
    if (flash) toast(flash);
  }, [toast]);

  // Table number from the scanned QR, sanitised like the prototype.
  const no =
    String(session.invalidTable ?? "")
      .replace(/[^\w-]/g, "")
      .slice(0, 6) || "?";

  // Weekly hours: consecutive days with the same hours share a row.
  const today = now.getDay();
  const groups: { r: string; days: number[] }[] = [];
  for (const d of WEEK) {
    const r = range(hoursOn(cafe, d));
    const last = groups[groups.length - 1];
    if (last && last.r === r) last.days.push(d);
    else groups.push({ r, days: [d] });
  }
  const open = isOpenAt(cafe, now);

  function openAs07() {
    update((s) => {
      s.table = "07";
      s.invalidTable = null;
    });
    setFlash("Prototipe: menu dibuka sebagai Meja 07");
  }

  return (
    <main
      aria-label="QR Tidak Valid"
      className="p-pelanggan-tidak-valid"
      data-node-id="pelanggan-tidak-valid"
    >
      <div className="pc-app" data-node-id="pelanggan-tidak-valid.app">
        <header className="pc-head" data-node-id="pelanggan-tidak-valid.header">
          <div className="pc-brand">
            <CafeMark cafe={cafe} className="pc-mono" />
            <div>
              <p className="pc-brand-name">{cafe.cafeName}</p>
              <p className="pc-brand-addr">{cafe.address}</p>
            </div>
          </div>
          <p className="pc-greet">
            <QrCode aria-hidden="true" />
            QR meja tidak dikenali
          </p>
          <h1 className="pc-thesis">QR ini belum bisa dipakai</h1>
          <p className="pc-lead">
            QR ini mungkin sudah diganti atau mejanya sedang tidak dipakai.
            Tenang, kamu tetap bisa pesan dengan bantuan kami.
          </p>
        </header>

        <div
          className="pc-scan"
          role="group"
          aria-labelledby="pelanggan-tidak-valid-scan"
          data-node-id="pelanggan-tidak-valid.scanned"
        >
          <div
            className="pc-scan-no"
            aria-hidden="true"
            aria-label={`Nomor meja dari QR: ${no}`}
          >
            <span>Meja</span>
            <strong>{no}</strong>
          </div>
          <div className="pc-scan-txt">
            <b id="pelanggan-tidak-valid-scan">QR Meja {no}</b>
            <small>
              Tidak terdaftar atau sedang tidak aktif di {cafe.cafeName}.
            </small>
            <span className="pc-chip" data-tone="danger">
              QR tidak valid
            </span>
          </div>
        </div>

        <section
          className="pc-card"
          aria-labelledby="pelanggan-tidak-valid-todo"
          data-node-id="pelanggan-tidak-valid.next"
        >
          <div className="pc-card-head">
            <h2 id="pelanggan-tidak-valid-todo">Yang bisa kamu lakukan</h2>
          </div>
          <ol className="pc-todo">
            <li>
              <div>
                <b>Minta bantuan kasir atau pelayan</b>
                <p>
                  Kasir bisa mencatat pesananmu langsung, atau menunjukkan QR
                  meja yang benar.
                </p>
              </div>
            </li>
            <li>
              <div>
                <b>Scan QR di meja lain</b>
                <p>
                  Pindah ke meja yang kosong, lalu scan QR yang menempel di meja
                  itu.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section
          className="pc-card"
          aria-labelledby="pelanggan-tidak-valid-hours"
          data-node-id="pelanggan-tidak-valid.hours"
        >
          <div className="pc-card-head">
            <h2 id="pelanggan-tidak-valid-hours">Jam operasional</h2>
            <span className="pc-chip" data-tone={open ? "positive" : "plain"}>
              {open ? "Buka sekarang" : "Sedang tutup"}
            </span>
          </div>
          <dl className="pc-hours">
            {groups.map((g) => {
              const label =
                g.days.length > 2
                  ? `${DAY[g.days[0]!]}–${DAY[g.days[g.days.length - 1]!]}`
                  : g.days.map((d) => DAY[d]).join(" & ");
              const isToday = g.days.includes(today);
              return (
                <div key={label} data-today={isToday ? "" : undefined}>
                  <dt>
                    {label}
                    {isToday && <small>· hari ini</small>}
                  </dt>
                  <dd>{g.r}</dd>
                </div>
              );
            })}
          </dl>
        </section>

        <div className="pc-proto" data-node-id="pelanggan-tidak-valid.proto">
          <span className="pc-chip" data-tone="dark">
            Prototipe
          </span>
          <p>
            Di aplikasi asli, meja aktif diatur pemilik di halaman Menu &amp;
            Meja. Untuk mencoba alur pesan, buka menu sebagai meja yang valid.
          </p>
          <Link className="pc-btn" data-block="" to="/" onClick={openAs07}>
            <QrCode aria-hidden="true" />
            Prototipe: buka sebagai Meja 07
          </Link>
        </div>

        <p className="pc-foot">
          Didukung oleh <strong>IUL FnB</strong>
        </p>
      </div>

      {toastEl}
    </main>
  );
}
