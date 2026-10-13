import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Clock,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { rp } from "@starter/shared/fnb/domain";
import { NOTE_CHIPS } from "@starter/shared/fnb/fixtures";
import { useCafe, useMenu } from "@/features/catalog/hooks";
import { readSession, useCustomerSession } from "@/features/session/store";
import { useNow } from "@/lib/use-now";
import { lineKey, MAX_QTY, NOTE_MAX, qtyOf, saveCartLine } from "../cart";
import { nextOpenLabel, orderingBlocked } from "../hours";
import { motion } from "../motion";
import { browseState, patchBrowseState, setFlash, takeFlash } from "../state";
import { DEFAULT_TABLE } from "../table";
import { useToast } from "./toast";

type Props = {
  menuId: string;
  /** lineKey of the cart line being changed (opened from the cart). */
  edit?: string;
};

const noteParts = (note: string) =>
  note
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Menu detail: quantity, kitchen note, add to / update the cart (design page "pelanggan-menu"). */
export function MenuDetail({ menuId, edit }: Props) {
  const navigate = useNavigate();
  const [session, update] = useCustomerSession();
  const { data: cafe } = useCafe();
  const {
    data: { categories, menus },
  } = useMenu();
  const now = useNow(30_000);
  const [toastEl, toast] = useToast();
  const heroRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);

  const m = menus.find((x) => x.id === menuId) ?? menus[0]!;
  const cat = categories.find((c) => c.id === m.categoryId);
  const editLine = edit
    ? (session.cart.find(
        (l) => l.menuId === m.id && lineKey(l.menuId, l.note) === edit,
      ) ?? null)
    : null;
  const blocked = orderingBlocked(session, cafe, new Date(now));
  const ok = m.isAvailable && !blocked;
  const toCart = edit != null;

  const [qty, setQty] = useState(() =>
    editLine ? Math.min(MAX_QTY, Math.max(1, editLine.qty)) : 1,
  );
  const [note, setNote] = useState(() => editLine?.note ?? "");
  const pressed = noteParts(note).map((s) => s.toLowerCase());
  const inCart = qtyOf(session.cart, m.id);
  const chips = NOTE_CHIPS[m.categoryId] ?? [];
  // Sold out → offer other available menus of the same category
  const alts = m.isAvailable
    ? []
    : menus
        .filter(
          (x) =>
            x.categoryId === m.categoryId && x.isAvailable && x.id !== m.id,
        )
        .slice(0, 3);

  useEffect(() => {
    const prev = document.title;
    document.title = `${m.name} — ${cafe.cafeName} | IUL FnB`;
    return () => {
      document.title = prev;
    };
  }, [m.name, cafe.cafeName]);

  useEffect(() => {
    scrollTo({ top: 0 });
    nameRef.current?.focus({ preventScroll: true });
    if (browseState.altJump) {
      browseState.altJump = false;
      motion(
        heroRef.current,
        [
          { opacity: 0.4, transform: "scale(.98)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 240 },
      );
    }
    const flash = takeFlash();
    if (flash) toast(flash);
  }, [toast]);

  function toggleChip(chip: string) {
    let parts = noteParts(note);
    const has = parts.some((p) => p.toLowerCase() === chip.toLowerCase());
    parts = has
      ? parts.filter((p) => p.toLowerCase() !== chip.toLowerCase())
      : parts.concat(chip);
    setNote(parts.join(", ").slice(0, NOTE_MAX));
  }

  function openAlt(id: string) {
    patchBrowseState({ altJump: true });
    void navigate({
      to: "/menu/$menuId",
      params: { menuId: id },
      search: {},
      replace: true,
    });
  }

  function save() {
    const n = qty;
    const text = note.trim().slice(0, NOTE_MAX);
    // Re-check against the latest session (another tab may have changed it)
    if (!m.isAvailable || orderingBlocked(readSession(), cafe)) {
      toast(
        m.isAvailable
          ? "Kafe sedang tutup — belum bisa memesan"
          : `Maaf, ${m.name} sedang habis`,
      );
      return;
    }
    let result = "added" as ReturnType<typeof saveCartLine>;
    update((s) => {
      result = saveCartLine(s.cart, edit, m.id, n, text);
    });
    setFlash(
      result === "merged"
        ? `✓ ${m.name} digabung dengan catatan yang sama`
        : result === "saved"
          ? `✓ Perubahan ${m.name} disimpan`
          : `✓ ${n}× ${m.name} masuk keranjang`,
    );
    if (toCart) void navigate({ to: "/keranjang" });
    else void navigate({ to: "/", resetScroll: false });
  }

  return (
    <main aria-label="Detail Menu" className="p-pelanggan-menu">
      <div className="pl-app">
        <div className="pl-bar">
          {toCart ? (
            <Link
              className="pl-iconbtn"
              to="/keranjang"
              aria-label="Kembali ke keranjang"
            >
              <ChevronLeft aria-hidden="true" />
            </Link>
          ) : (
            <Link
              className="pl-iconbtn"
              to="/"
              resetScroll={false}
              aria-label="Kembali ke menu"
            >
              <ChevronLeft aria-hidden="true" />
            </Link>
          )}
          <span className="pl-bar-title">
            {editLine ? "Ubah pesanan" : (cat?.name ?? "Detail menu")}
          </span>
          <span className="pl-bar-table">
            Meja {session.table || DEFAULT_TABLE}
          </span>
        </div>

        <div
          className="pl-hero"
          ref={heroRef}
          data-soldout={m.isAvailable ? undefined : ""}
        >
          <span aria-hidden="true">{m.imageUrl}</span>
          <span className="pl-chip" data-tone="danger" hidden={m.isAvailable}>
            Habis hari ini
          </span>
        </div>

        <section className="pl-body" aria-labelledby="pelanggan-menu-name">
          <div className="pl-tags" hidden={!m.tags.length}>
            {m.tags.map((t) => (
              <span key={t} className="pl-tag">
                {t}
              </span>
            ))}
          </div>
          <h1
            className="pl-name"
            id="pelanggan-menu-name"
            tabIndex={-1}
            ref={nameRef}
          >
            {m.name}
          </h1>
          <p className="pl-desc">{m.description}</p>

          <div className="pl-price-row">
            <p className="pl-price">
              <span>{rp(m.price)}</span>
              <small>per porsi</small>
            </p>
            <div
              className="pl-stepper"
              role="group"
              aria-label="Jumlah porsi"
              hidden={!ok}
            >
              <button
                type="button"
                aria-label="Kurangi jumlah"
                disabled={qty <= 1}
                onClick={() => setQty((v) => Math.max(1, v - 1))}
              >
                <Minus aria-hidden="true" />
              </button>
              <output aria-live="polite">{qty}</output>
              <button
                type="button"
                aria-label="Tambah jumlah"
                disabled={qty >= MAX_QTY}
                onClick={() => setQty((v) => Math.min(MAX_QTY, v + 1))}
              >
                <Plus aria-hidden="true" />
              </button>
            </div>
          </div>
          <p className="pl-incart" hidden={!inCart || !!editLine}>
            <ShoppingBag aria-hidden="true" style={{ fontSize: 15 }} />
            Sudah {inCart} di keranjang
          </p>

          <div hidden={!ok}>
            <label className="pl-label" htmlFor="pelanggan-menu-note">
              Catatan untuk dapur <span>(opsional)</span>
            </label>
            <div className="pl-nchips" role="group" aria-label="Catatan cepat">
              {chips.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  className="pl-nchip"
                  aria-pressed={pressed.includes(ch.toLowerCase())}
                  onClick={() => toggleChip(ch)}
                >
                  <Plus
                    aria-hidden="true"
                    className="pl-off"
                    style={{ fontSize: 14 }}
                  />
                  <Check
                    aria-hidden="true"
                    className="pl-on"
                    style={{ fontSize: 14 }}
                  />
                  {ch}
                </button>
              ))}
            </div>
            <textarea
              className="pl-textarea"
              id="pelanggan-menu-note"
              rows={2}
              maxLength={NOTE_MAX}
              placeholder="Contoh: tanpa gula, es sedikit"
              aria-describedby="pelanggan-menu-count"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="pl-counter" id="pelanggan-menu-count">
              <span>{note.length}</span>/{NOTE_MAX} karakter
            </p>
          </div>

          <section
            className="pl-alt"
            aria-labelledby="pelanggan-menu-alt-title"
            hidden={!alts.length}
          >
            <h2 id="pelanggan-menu-alt-title">Menu lain yang tersedia</h2>
            <ul>
              {alts.map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    aria-label={`${x.name}, ${rp(x.price)}. Lihat detail`}
                    onClick={() => openAlt(x.id)}
                  >
                    <span className="pl-thumb" aria-hidden="true">
                      {x.imageUrl}
                    </span>
                    <b>{x.name}</b>
                    <span>{rp(x.price)}</span>
                    <ChevronRight aria-hidden="true" style={{ fontSize: 16 }} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </section>

        <div className="pl-dock">
          <p className="pl-reason" id="pelanggan-menu-reason" hidden={ok}>
            {!m.isAvailable ? (
              <>
                <CircleSlash aria-hidden="true" style={{ fontSize: 16 }} />
                <span>
                  Menu ini sedang habis hari ini, jadi belum bisa dipesan. Pilih
                  menu lain di atas, ya.
                </span>
              </>
            ) : blocked ? (
              <>
                <Clock aria-hidden="true" style={{ fontSize: 16 }} />
                <span>
                  Kafe sedang tutup · buka lagi{" "}
                  {nextOpenLabel(cafe, new Date(now))}. Kamu masih bisa melihat
                  menu, tapi belum bisa memesan.
                </span>
              </>
            ) : null}
          </p>
          <button
            type="button"
            className="pl-btn"
            data-variant="primary"
            data-block=""
            disabled={!ok}
            aria-describedby={ok ? undefined : "pelanggan-menu-reason"}
            onClick={save}
          >
            {!m.isAvailable ? (
              "Menu sedang habis"
            ) : blocked ? (
              "Kafe sedang tutup"
            ) : (
              <>
                {editLine ? "Simpan perubahan" : "Tambah ke keranjang"}{" "}
                <span className="pl-sep" aria-hidden="true">
                  ·
                </span>{" "}
                {rp(m.price * qty)}
              </>
            )}
          </button>
        </div>
      </div>

      {toastEl}
    </main>
  );
}
