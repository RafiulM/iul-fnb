import { useEffect, useLayoutEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Clock,
  CreditCard,
  LoaderCircle,
  Lock,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  StickyNote,
  Trash2,
} from "lucide-react";
import { orderTotals, rp } from "@starter/shared/fnb/domain";
import { takeFlash } from "@/features/browse/state";
import { useCafe, useMenu } from "@/features/catalog/hooks";
import { useCustomerSession, type CartLine } from "@/features/session/store";
import { useNow } from "@/lib/use-now";
import { useSendOrder } from "../hooks";
import { nextOpenLabel, orderingBlocked } from "../hours";
import { motion } from "../motion";
import { useDocumentTitle } from "../use-document-title";
import { usePageToast } from "./page-toast";
import { SummaryRows } from "./summary";

const MAX_QTY = 50;
const lineKey = (l: CartLine) => l.menuId + "|" + l.note.trim().toLowerCase();

/** Port of design/src/pages/pelanggan-keranjang.page.html. */
export function CartPage() {
  const { data: cafe } = useCafe();
  const {
    data: { menus },
  } = useMenu();
  const [session, update] = useCustomerSession();
  const navigate = useNavigate();
  const send = useSendOrder();
  const now = useNow(30_000);
  const [toastEl, toast] = usePageToast("pl-toast", 2400);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const moreRef = useRef<HTMLAnchorElement>(null);
  const spinRef = useRef<SVGSVGElement>(null);
  /** A focused "−" button removed its own line: move focus like the prototype. */
  const refocus = useRef(false);

  const rows = session.cart.flatMap((l) => {
    const m = menus.find((x) => x.id === l.menuId);
    return m
      ? [
          {
            ...l,
            key: lineKey(l),
            name: m.name,
            price: m.price,
            imageUrl: m.imageUrl,
          },
        ]
      : [];
  });
  const t = orderTotals(rows, cafe);
  const empty = rows.length === 0;
  const sending = send.isPending;
  const off = orderingBlocked(cafe, session, new Date(now));
  const table = session.table || "–";

  useDocumentTitle(`Keranjang Meja ${table} — ${cafe.cafeName} | IUL FnB`);

  useEffect(() => {
    scrollTo({ top: 0 });
    titleRef.current?.focus({ preventScroll: true });
    // One-off message from the previous screen (e.g. "✓ Perubahan disimpan").
    const flash = takeFlash();
    if (flash) toast(flash);
  }, [toast]);

  useLayoutEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    if (empty) {
      titleRef.current?.focus({ preventScroll: true });
      return;
    }
    const next =
      listRef.current?.querySelector<HTMLButtonElement>('[data-delta="-1"]') ??
      moreRef.current;
    next?.focus({ preventScroll: true });
  }, [session.cart, empty]);

  useEffect(() => {
    if (!sending) return;
    const a = motion(
      spinRef.current,
      [{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }],
      { duration: 800, iterations: Infinity, easing: "linear" },
    );
    return () => a?.cancel();
  }, [sending]);

  function changeQty(key: string, delta: number, btn: HTMLButtonElement) {
    if (sending) return;
    const hadFocus = document.activeElement === btn;
    let removed: string | null = null;
    let left = 0;
    update((d) => {
      const i = d.cart.findIndex((l) => lineKey(l) === key);
      const l = d.cart[i];
      if (!l) return;
      l.qty = Math.min(MAX_QTY, l.qty + delta);
      if (l.qty <= 0) {
        d.cart.splice(i, 1);
        removed = menus.find((m) => m.id === l.menuId)?.name ?? "Menu";
      }
      left = d.cart.length;
    });
    if (removed == null) return;
    refocus.current = hadFocus || left === 0;
    toast(left ? `${removed} dihapus dari keranjang` : "Keranjang kosong");
  }

  function editLine(l: CartLine) {
    if (sending) return;
    void navigate({
      to: "/menu/$menuId",
      params: { menuId: l.menuId },
      search: { edit: lineKey(l) },
    });
  }

  function onSend() {
    if (sending || empty) return;
    if (off) {
      toast("Kafe sedang tutup — pesanan belum bisa dikirim");
      return;
    }
    send.mutate(
      {
        qrCode: session.qr || session.table,
        items: rows.map((r) => ({
          menuId: r.menuId,
          qty: r.qty,
          note: r.note,
        })),
      },
      {
        onSuccess: (order) => {
          update((d) => {
            d.order = order;
            d.cart = [];
          });
          void navigate({ to: "/status" });
        },
        onError: (err) =>
          toast(
            `Pesanan belum terkirim: ${err instanceof Error ? err.message : "coba lagi"}`,
          ),
      },
    );
  }

  return (
    <main
      aria-label="Keranjang"
      className="p-pelanggan-keranjang"
      data-node-id="pelanggan-keranjang"
    >
      <div className="pl-app" data-node-id="pelanggan-keranjang.app">
        <div className="pl-bar" data-node-id="pelanggan-keranjang.bar">
          <Link className="pl-iconbtn" to="/" aria-label="Kembali ke menu">
            <ChevronLeft aria-hidden="true" />
          </Link>
          <span className="pl-bar-title">Keranjang</span>
          <span aria-hidden="true"></span>
        </div>

        <header className="pl-head" data-node-id="pelanggan-keranjang.header">
          <p className="pl-eyebrow" hidden={empty}>
            Periksa lagi sebelum dikirim
          </p>
          <h1 className="pl-thesis" tabIndex={-1} ref={titleRef}>
            Pesanan Meja {table}
          </h1>
          <p className="pl-sub">
            {empty
              ? "Belum ada menu dipilih"
              : `${t.count} item dari ${rows.length} menu`}
          </p>
        </header>

        <div
          className="pl-body"
          hidden={empty}
          data-node-id="pelanggan-keranjang.cart"
        >
          <ul
            className="pl-card pl-lines"
            aria-label="Isi keranjang"
            ref={listRef}
          >
            {rows.map((l) => (
              <li className="pl-line" key={l.key}>
                <span className="pl-thumb" aria-hidden="true">
                  {l.imageUrl}
                </span>
                <div className="pl-line-info">
                  <span className="pl-name">{l.name}</span>
                  <button
                    type="button"
                    className="pl-note-btn"
                    aria-label={
                      l.note
                        ? `Ubah ${l.name}, catatan: ${l.note}`
                        : `Ubah ${l.name} atau tambah catatan`
                    }
                    onClick={() => editLine(l)}
                  >
                    {l.note ? (
                      <>
                        <StickyNote
                          aria-hidden="true"
                          style={{ fontSize: 13 }}
                        />
                        <q>{l.note}</q> <span aria-hidden="true">·</span>{" "}
                        <b>Ubah</b>
                      </>
                    ) : (
                      <b>+ Tambah catatan</b>
                    )}
                  </button>
                  <span className="pl-line-price">
                    {rp(l.price * l.qty)}
                    {l.qty > 1 && (
                      <small>
                        {l.qty} × {rp(l.price)}
                      </small>
                    )}
                  </span>
                </div>
                <div
                  className="pl-stepper"
                  role="group"
                  aria-label={`Jumlah ${l.name}`}
                >
                  <button
                    type="button"
                    data-delta="-1"
                    aria-label={`${l.qty === 1 ? "Hapus" : "Kurangi"} ${l.name}`}
                    onClick={(e) => changeQty(l.key, -1, e.currentTarget)}
                  >
                    {l.qty === 1 ? (
                      <Trash2 aria-hidden="true" style={{ fontSize: 14 }} />
                    ) : (
                      <Minus aria-hidden="true" style={{ fontSize: 14 }} />
                    )}
                  </button>
                  <output aria-live="polite">{l.qty}</output>
                  <button
                    type="button"
                    data-delta="1"
                    aria-label={`Tambah ${l.name}`}
                    disabled={l.qty >= MAX_QTY}
                    onClick={(e) => changeQty(l.key, 1, e.currentTarget)}
                  >
                    <Plus aria-hidden="true" style={{ fontSize: 14 }} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Link className="pl-btn pl-more" to="/" ref={moreRef}>
            <Plus aria-hidden="true" />
            Tambah menu lain
          </Link>

          <section
            className="pl-card pl-summary"
            aria-labelledby="pelanggan-keranjang-sum"
            data-node-id="pelanggan-keranjang.summary"
          >
            <h2 id="pelanggan-keranjang-sum">Ringkasan</h2>
            <div className="pl-sum">
              <SummaryRows totals={t} settings={cafe} totalClass="pl-total" />
            </div>
          </section>
          <div className="pl-notice">
            <CreditCard aria-hidden="true" />
            <span>
              <strong>Pembayaran di kasir (tunai/non-tunai).</strong> Pesanan
              langsung masuk ke layar kasir; sebutkan nomor pesanan saat
              membayar.
            </span>
          </div>
        </div>

        <div
          className="pl-body"
          hidden={!empty}
          data-node-id="pelanggan-keranjang.empty"
        >
          <div className="pl-card pl-empty">
            <span className="pl-empty-ico" aria-hidden="true">
              <ShoppingBag />
            </span>
            <strong>Keranjang masih kosong</strong>
            <span>
              Pilih menu dulu, lalu kembali ke sini untuk mengirim pesanan ke
              kasir.
            </span>
            <Link className="pl-btn" data-variant="primary" to="/">
              Lihat menu
            </Link>
            {session.order && (
              <Link className="pl-link" to="/status">
                <Receipt aria-hidden="true" style={{ fontSize: 15 }} />
                Lacak pesanan {session.order.code}
              </Link>
            )}
          </div>
        </div>

        <div
          className="pl-dock"
          hidden={empty}
          data-node-id="pelanggan-keranjang.dock"
        >
          <p
            className="pl-reason"
            id="pelanggan-keranjang-reason"
            hidden={!off}
          >
            <Clock aria-hidden="true" style={{ fontSize: 16 }} />
            <span>
              Kafe sedang tutup · buka lagi {nextOpenLabel(cafe, new Date(now))}
              . Pesanan bisa dikirim saat kafe buka.
            </span>
          </p>
          <button
            type="button"
            className="pl-btn"
            data-variant="primary"
            data-block=""
            disabled={sending || off}
            aria-busy={sending}
            aria-describedby={off ? "pelanggan-keranjang-reason" : undefined}
            onClick={onSend}
          >
            {sending ? (
              <>
                <LoaderCircle
                  ref={spinRef}
                  className="pl-spin"
                  aria-hidden="true"
                  style={{ fontSize: 18 }}
                />
                Mengirim ke kasir…
              </>
            ) : (
              <>
                {off && <Lock aria-hidden="true" style={{ fontSize: 16 }} />}
                Kirim pesanan{" "}
                <span className="pl-sep" aria-hidden="true">
                  ·
                </span>{" "}
                {rp(t.total)}
              </>
            )}
          </button>
        </div>
      </div>

      {toastEl}
    </main>
  );
}
