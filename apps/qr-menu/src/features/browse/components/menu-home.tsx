import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Clock, CreditCard, Search, SearchX, X } from "lucide-react";
import { isOpenAt } from "@starter/shared/fnb/domain";
import type { MenuDto } from "@starter/shared/fnb/types";
import { useCafe, useMenu } from "@/features/catalog/hooks";
import { useCustomerSession } from "@/features/session/store";
import { useNow } from "@/lib/use-now";
import { addToCart, cartLines, qtyOf } from "../cart";
import { dot, hoursOn, nextOpenLabel, orderingBlocked } from "../hours";
import { motion, reduceMotion } from "../motion";
import { browseState, patchBrowseState, takeFlash } from "../state";
import { DEFAULT_TABLE } from "../table";
import { CartBar } from "./cart-bar";
import { MenuItemBody } from "./menu-item";
import { useTrackedOrder } from "@/features/orders/status";
import { TrackPill } from "./track-pill";
import { useToast } from "./toast";
import { CafeMark } from "@/components/cafe-mark";

const greeting = (h: number) =>
  h < 11
    ? "Selamat pagi"
    : h < 15
      ? "Selamat siang"
      : h < 18
        ? "Selamat sore"
        : "Selamat malam";

/** Customer home after scanning the table QR (design page "pelanggan"). */
export function MenuHome() {
  const navigate = useNavigate();
  const [session, update] = useCustomerSession();
  const { data: cafe } = useCafe();
  const {
    data: { categories, menus, popularMenuIds },
  } = useMenu();
  useTrackedOrder();
  const nowMs = useNow(30_000);
  const now = new Date(nowMs);
  const [toastEl, toast] = useToast();

  const [cat, setCatState] = useState(browseState.cat);
  const [q, setQState] = useState(browseState.q);
  const setCat = (v: string) => {
    patchBrowseState({ cat: v });
    setCatState(v);
  };
  const setQ = (v: string) => {
    patchBrowseState({ q: v });
    setQState(v);
  };

  const searchRef = useRef<HTMLInputElement>(null);
  const tabsWrapRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cartBtnRef = useRef<HTMLButtonElement>(null);

  const table = session.table || DEFAULT_TABLE;
  const open = isOpenAt(cafe, now);
  const blocked = orderingBlocked(session, cafe, now);
  const nextOpen = nextOpenLabel(cafe, now);
  const closedMsg = `Kafe sedang tutup · buka lagi ${nextOpen}`;
  const today = hoursOn(cafe, now);
  const menuById = new Map(menus.map((m) => [m.id, m]));

  // Header chip (design paintHeader)
  const hours = session.browseOnly
    ? {
        tone: "danger",
        text: `Tutup · buka ${nextOpen.replace("pukul ", "")}`,
      }
    : !open
      ? { tone: "accent", text: "Prototipe · jam buka diabaikan" }
      : {
          tone: "positive",
          text: `Buka · ${dot(today?.from || "08:00")}–${dot(today?.to || "22:00")}`,
        };

  useEffect(() => {
    const prev = document.title;
    document.title = `${cafe.cafeName} — Meja ${table} | IUL FnB`;
    return () => {
      document.title = prev;
    };
  }, [cafe.cafeName, table]);

  // On arrival: one-off message from the previous screen, then scroll/focus
  // restore when coming back from a menu's detail page.
  useEffect(() => {
    const flash = takeFlash();
    const msg = browseState.notice ?? flash;
    browseState.notice = null;
    if (msg) toast(msg);
    if (browseState.restore) {
      browseState.restore = false;
      const y = browseState.scrollY;
      const id = browseState.lastOpen ?? "";
      requestAnimationFrame(() => {
        scrollTo({ top: y });
        document
          .querySelector<HTMLElement>(
            `[data-page="pelanggan"] .pl-item [data-open="${CSS.escape(id)}"]`,
          )
          ?.focus({ preventScroll: true });
      });
    } else scrollTo({ top: 0 });
  }, [toast]);

  /* ----- actions ----- */
  function quickAdd(id: string) {
    const m = menuById.get(id);
    if (!m) return;
    if (!m.isAvailable) return toast(`Maaf, ${m.name} sedang habis`);
    if (blocked) return toast(`Kafe tutup · bisa pesan lagi ${nextOpen}`);
    update((s) => addToCart(s.cart, m.id, 1, ""));
    motion(
      cartBtnRef.current,
      [
        { transform: "scale(1)" },
        { transform: "scale(1.04)" },
        { transform: "scale(1)" },
      ],
      { duration: 300 },
    );
    toast(`✓ ${m.name} masuk keranjang`);
  }

  function openDetail(id: string) {
    patchBrowseState({ restore: true, scrollY, lastOpen: id });
    void navigate({ to: "/menu/$menuId", params: { menuId: id } });
  }

  function pickCategory(id: string, e: MouseEvent<HTMLButtonElement>) {
    setCat(id);
    const menuEl = menuRef.current;
    const wrap = tabsWrapRef.current;
    if (menuEl && wrap) {
      const top =
        menuEl.getBoundingClientRect().top + scrollY - wrap.offsetHeight;
      if (scrollY > top)
        scrollTo({ top, behavior: reduceMotion() ? "auto" : "smooth" });
    }
    const tabs = tabsRef.current;
    if (!tabs) return;
    const tr = tabs.getBoundingClientRect();
    const br = e.currentTarget.getBoundingClientRect();
    if (br.left < tr.left) tabs.scrollLeft -= tr.left - br.left + 16;
    else if (br.right > tr.right) tabs.scrollLeft += br.right - tr.right + 16;
  }

  function openCart() {
    if (blocked) return toast(`Kafe tutup · keranjang aktif lagi ${nextOpen}`);
    void navigate({ to: "/keranjang" });
  }

  function forceOpen() {
    update((s) => {
      s.browseOnly = false;
      s.forceOpen = true;
    });
    toast("Prototipe: jam operasional diabaikan — kamu bisa memesan");
    searchRef.current?.focus({ preventScroll: true });
  }

  /* ----- menu list (design renderMenu) ----- */
  const query = q.trim().toLowerCase();
  const match = (m: MenuDto) =>
    !query ||
    m.name.toLowerCase().includes(query) ||
    m.description.toLowerCase().includes(query);
  const tabs = [{ id: "all", name: "Semua", n: menus.length }].concat(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      n: menus.filter((m) => m.categoryId === c.id).length,
    })),
  );
  const popular =
    cat === "all" && !query
      ? popularMenuIds.flatMap((id) => menuById.get(id) ?? [])
      : [];
  const sections = categories
    .filter((c) => cat === "all" || c.id === cat)
    .map((c) => ({
      cat: c,
      // Available first, sold out at the bottom
      items: menus
        .filter((m) => m.categoryId === c.id && match(m))
        .sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable)),
    }))
    .filter((s) => s.items.length > 0);

  const lines = cartLines(session.cart, menus);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + l.menu.price * l.qty, 0);
  const feePercent = cafe.taxPercent + cafe.servicePercent;

  const itemProps = (m: MenuDto, compact: boolean) => ({
    menu: m,
    qty: qtyOf(session.cart, m.id),
    compact,
    blocked,
    onOpen: openDetail,
    onAdd: quickAdd,
  });

  return (
    <main aria-label="Menu Pelanggan (QR)" className="p-pelanggan">
      <div className="pl-app">
        <header className="pl-head">
          <div className="pl-head-top">
            <div className="pl-brand">
              <CafeMark cafe={cafe} className="pl-mono" />
              <div>
                <h1>{cafe.cafeName}</h1>
                <p>{cafe.address}</p>
              </div>
            </div>
            <div
              className="pl-table"
              role="group"
              aria-label={`Nomor meja ${table}`}
            >
              <span aria-hidden="true">Meja</span>
              <strong>{table}</strong>
            </div>
          </div>
          <p className="pl-greet">{greeting(now.getHours())} 👋</p>
          <p className="pl-thesis">
            {session.browseOnly
              ? "Intip menu kami dulu, yuk."
              : "Mau pesan apa hari ini?"}
          </p>
          <div className="pl-meta">
            <span className="pl-chip" data-tone={hours.tone}>
              {hours.text}
            </span>
            <span className="pl-chip" data-tone="plain">
              <CreditCard aria-hidden="true" />
              Bayar di kasir
            </span>
          </div>
        </header>

        <div className="pl-alert" role="status" hidden={!session.browseOnly}>
          <Clock aria-hidden="true" />
          <div>
            <strong>{closedMsg}</strong>
            <span>
              Kamu tetap bisa melihat menu. Tombol tambah dan keranjang aktif
              lagi saat kafe buka.
            </span>
            <button type="button" onClick={forceOpen}>
              Prototipe: anggap kafe buka
            </button>
          </div>
        </div>

        <label className="pl-search">
          <Search aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Cari menu, mis. kopi susu"
            aria-label="Cari menu"
            autoComplete="off"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            type="button"
            className="pl-clear"
            aria-label="Hapus pencarian"
            hidden={!q}
            onClick={(e) => {
              e.preventDefault();
              setQ("");
              searchRef.current?.focus();
            }}
          >
            <X aria-hidden="true" />
          </button>
        </label>

        {session.order ? (
          <TrackPill
            order={session.order}
            toast={toast}
            onOpen={() => void navigate({ to: "/status" })}
          />
        ) : null}

        <div className="pl-tabs-wrap" ref={tabsWrapRef}>
          <div
            className="pl-tabs"
            role="tablist"
            aria-label="Kategori menu"
            ref={tabsRef}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={cat === t.id}
                onClick={(e) => pickCategory(t.id, e)}
              >
                {t.name}
                <small>{t.n}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="pl-menu" ref={menuRef}>
          {popular.length ? (
            <section aria-labelledby="pelanggan-pop-title">
              <div className="pl-sec">
                <h2 id="pelanggan-pop-title">Terlaris hari ini 🔥</h2>
                <span>Favorit pelanggan</span>
              </div>
              <div className="pl-strip">
                {popular.map((m, i) => (
                  <div
                    key={m.id}
                    className="pl-pop"
                    data-soldout={m.isAvailable ? undefined : ""}
                  >
                    <span
                      className="pl-chip pl-rank"
                      data-tone="dark"
                      aria-hidden="true"
                    >
                      #{i + 1}
                    </span>
                    <MenuItemBody {...itemProps(m, true)} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {sections.map(({ cat: c, items }) => (
            <section key={c.id} aria-labelledby={`pelanggan-cat-${c.id}`}>
              <div className="pl-sec">
                <h2 id={`pelanggan-cat-${c.id}`}>{c.name}</h2>
                <span>{items.length} menu</span>
              </div>
              <ul className="pl-list">
                {items.map((m) => (
                  <li
                    key={m.id}
                    className="pl-item"
                    data-soldout={m.isAvailable ? undefined : ""}
                  >
                    <MenuItemBody {...itemProps(m, false)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {sections.length ? null : (
            <div className="pl-empty">
              <SearchX aria-hidden="true" style={{ fontSize: 30 }} />
              <strong>Menu tidak ditemukan</strong>
              Coba kata lain, mis. “kopi”, “nasi”, atau “teh”.
            </div>
          )}
        </div>

        <p className="pl-foot">
          Harga sudah termasuk bahan pilihan. Pajak &amp; layanan {feePercent}%
          dihitung di keranjang.
          <br />
          <br />
          Didukung oleh <strong>IUL FnB</strong>
        </p>
      </div>

      <CartBar
        ref={cartBtnRef}
        count={count}
        subtotal={subtotal}
        blocked={blocked}
        openLabel={`buka ${nextOpen.replace("pukul ", "")}`}
        closedMsg={closedMsg}
        onOpen={openCart}
      />

      {toastEl}
    </main>
  );
}
