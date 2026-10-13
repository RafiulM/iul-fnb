import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  Check,
  Minus,
  Plus,
  Receipt,
  Search,
  SearchX,
  ShoppingBag,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { orderTotals, rp } from "@starter/shared/fnb/domain";
import type { MenuDto } from "@starter/shared/fnb/types";
import { Dialog, useToast } from "@/components/fnb/dialog";
import { useCategories, useMenus } from "@/features/menu/hooks";
import { useCreateManualOrder, useTodayOrders } from "@/features/orders/hooks";
import { useSettings } from "@/features/settings/hooks";
import { useTables } from "@/features/tables/hooks";
import {
  emptyDraft,
  isBlankDraft,
  type DineType,
  type ManualDraft,
} from "../api";
import { useManualDraft, useSaveManualDraft } from "../hooks";

// Port of design/src/pages/kasir-manual.page.html: catalogue on the left,
// the ticket (autosaved draft) on the right.

const DINE: { value: DineType; label: string; icon: typeof Utensils }[] = [
  { value: "DINE_IN", label: "Makan di sini", icon: Utensils },
  { value: "TAKEAWAY", label: "Bawa pulang", icon: ShoppingBag },
];

export function ManualOrder({ cashierName }: { cashierName: string }) {
  const { data: menus } = useMenus();
  const { data: categories } = useCategories();
  const { data: tables } = useTables();
  const { data: settings } = useSettings();
  const { data: orders } = useTodayOrders();
  const { data: savedDraft } = useManualDraft();
  const saveDraft = useSaveManualDraft();
  const createOrder = useCreateManualOrder();
  const toast = useToast();
  const navigate = useNavigate();

  const menuById = useMemo(() => new Map(menus.map((m) => [m.id, m])), [menus]);

  // The ticket lives in local state (snappy inputs) and is autosaved.
  const [draft, setDraft] = useState<ManualDraft>(() => {
    const d = savedDraft ?? emptyDraft();
    // Drop lines whose menu no longer exists.
    return { ...d, lines: d.lines.filter((l) => menuById.has(l.menuId)) };
  });
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [noteOpen, setNoteOpen] = useState<Set<number>>(() => new Set());
  const [clearOpen, setClearOpen] = useState(false);

  const linesRef = useRef<HTMLUListElement>(null);
  /** Selectors (first match wins) to focus inside the ticket after a render. */
  const focusNext = useRef<string[] | null>(null);
  useEffect(() => {
    const selectors = focusNext.current;
    if (!selectors) return;
    focusNext.current = null;
    for (const sel of selectors) {
      const el = linesRef.current?.querySelector<HTMLElement>(sel);
      if (el) {
        el.focus();
        return;
      }
    }
  });

  function update(next: ManualDraft) {
    setDraft(next);
    saveDraft.mutate(isBlankDraft(next) ? null : next);
  }

  const priced = draft.lines.map((l) => ({
    ...l,
    menu: menuById.get(l.menuId)!,
  }));
  const t = orderTotals(
    priced.map((l) => ({ price: l.menu.price, qty: l.qty })),
    settings,
  );
  const blank = isBlankDraft(draft);
  const hasLines = draft.lines.length > 0;
  const posQty = (id: string) =>
    draft.lines.filter((l) => l.menuId === id).reduce((a, l) => a + l.qty, 0);

  /* ----- Catalogue ----- */
  const query = q.trim().toLowerCase();
  const list = menus.filter(
    (m) =>
      (cat === "all" || m.categoryId === cat) &&
      (!query || m.name.toLowerCase().includes(query)),
  );

  /* ----- Tables: active ones grouped by area, busy = has an open order ----- */
  const busy = new Set(
    orders
      .filter((o) => o.status !== "SELESAI" && o.status !== "DIBATALKAN")
      .map((o) => o.tableNumber)
      .filter(Boolean),
  );
  const activeTables = tables.filter((x) => x.isActive);
  const areas = [...new Set(activeTables.map((x) => x.area))];

  /* ----- Actions ----- */
  function addMenu(m: MenuDto) {
    if (!m.isAvailable) return;
    const lines = draft.lines.map((l) => ({ ...l }));
    const line = lines.find((x) => x.menuId === m.id && !x.note);
    if (line) line.qty++;
    else lines.push({ menuId: m.id, qty: 1, note: "" });
    update({ ...draft, lines });
  }

  function step(i: number, delta: number) {
    const lines = draft.lines.map((l) => ({ ...l }));
    const line = lines[i];
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) {
      lines.splice(i, 1);
      setNoteOpen(
        (s) =>
          new Set(
            [...s].filter((j) => j !== i).map((j) => (j > i ? j - 1 : j)),
          ),
      );
    }
    focusNext.current = [
      `[data-step="${i}"][data-d="${delta}"]`,
      ".m-line [data-step]",
    ];
    update({ ...draft, lines });
  }

  function setNote(i: number, note: string) {
    update({
      ...draft,
      lines: draft.lines.map((l, j) => (j === i ? { ...l, note } : l)),
    });
  }

  function openNote(i: number) {
    focusNext.current = [`[data-nin="${i}"]`];
    setNoteOpen((s) => new Set(s).add(i));
  }

  function clearDraft() {
    update(emptyDraft());
    setNoteOpen(new Set());
    setClearOpen(false);
    toast("Tiket dikosongkan");
  }

  async function saveOrder(andPay: boolean) {
    if (!hasLines || createOrder.isPending) return;
    try {
      const o = await createOrder.mutateAsync({
        tableId:
          draft.dine === "DINE_IN" && draft.tableId ? draft.tableId : null,
        customerName: draft.customer.trim() || null,
        items: draft.lines.map((l) => ({
          menuId: l.menuId,
          qty: l.qty,
          note: l.note.trim(),
        })),
      });
      update(emptyDraft());
      if (andPay) {
        toast(`${o.code} dicatat — lanjutkan pembayaran`);
        await navigate({ to: "/kasir/bayar", search: { code: o.code } });
      } else {
        const flash = `${o.code} dicatat — langsung masuk antrean Diproses`;
        await navigate({ href: `/kasir?flash=${encodeURIComponent(flash)}` });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Pesanan gagal disimpan");
    }
  }

  return (
    <main
      aria-label="Pesanan Manual"
      className="p-kasir-manual"
      data-node-id="kasir-manual"
    >
      <section
        className="m-menu"
        aria-label="Pilih menu"
        data-node-id="kasir-manual.menu"
      >
        <div className="m-tools">
          <div className="l-staf-seg" role="tablist" aria-label="Kategori menu">
            {[{ id: "all", name: "Semua" }, ...categories].map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={cat === c.id}
                onClick={() => setCat(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <label className="l-staf-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Cari menu"
              aria-label="Cari menu"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>
        <div className="m-catalog">
          <div className="m-grid">
            {list.length ? (
              list.map((m) => {
                const n = posQty(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    className="m-pm"
                    disabled={!m.isAvailable}
                    aria-label={`Tambah ${m.name}, ${rp(m.price)}${m.isAvailable ? "" : ", habis"}${n ? `, ${n} di tiket` : ""}`}
                    onClick={() => addMenu(m)}
                  >
                    <span className="l-staf-thumb" aria-hidden="true">
                      {m.imageUrl}
                    </span>
                    <strong>{m.name}</strong>
                    <span className="m-price">{rp(m.price)}</span>
                    {n > 0 && (
                      <span className="m-q" aria-hidden="true">
                        {n}
                      </span>
                    )}
                    {!m.isAvailable && (
                      <span className="l-staf-chip m-sold" data-tone="danger">
                        Habis
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="l-staf-empty">
                <SearchX aria-hidden="true" style={{ fontSize: 28 }} />
                <strong>Menu tidak ditemukan</strong>
                Coba kata lain atau pilih kategori lain.
              </div>
            )}
          </div>
        </div>
      </section>

      <aside
        className="l-staf-card m-ticket"
        aria-labelledby="kasir-manual-ticket-title"
        data-node-id="kasir-manual.ticket"
      >
        <div className="l-staf-card-head">
          <div>
            <h2 id="kasir-manual-ticket-title">Pesanan baru</h2>
            <p>Dicatat oleh {cashierName}</p>
          </div>
          <button
            className="l-staf-btn"
            data-variant="ghost"
            data-size="sm"
            type="button"
            hidden={blank}
            onClick={() => setClearOpen(true)}
          >
            <Trash2 aria-hidden="true" />
            Kosongkan
          </button>
        </div>
        <div className="m-ticket-body">
          <div
            className="l-staf-seg"
            data-block
            role="tablist"
            aria-label="Jenis pesanan"
          >
            {DINE.map((d) => (
              <button
                key={d.value}
                type="button"
                role="tab"
                aria-selected={draft.dine === d.value}
                onClick={() => update({ ...draft, dine: d.value })}
              >
                <d.icon aria-hidden="true" />
                {d.label}
              </button>
            ))}
          </div>
          <div className="m-form2">
            <div
              className="l-staf-field"
              data-part="table-field"
              hidden={draft.dine !== "DINE_IN"}
            >
              <label htmlFor="kasir-manual-table">Meja</label>
              <select
                className="l-staf-select"
                id="kasir-manual-table"
                value={draft.tableId}
                onChange={(e) => update({ ...draft, tableId: e.target.value })}
              >
                <option value="">Tanpa meja</option>
                {areas.map((area) => (
                  <optgroup key={area} label={area}>
                    {activeTables
                      .filter((x) => x.area === area)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          Meja {x.tableNumber}
                          {busy.has(x.tableNumber) ? " · terisi" : ""}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="l-staf-field">
              <label htmlFor="kasir-manual-cust">Nama pelanggan</label>
              <input
                className="l-staf-input"
                id="kasir-manual-cust"
                placeholder="Opsional"
                maxLength={30}
                autoComplete="off"
                value={draft.customer}
                onChange={(e) => update({ ...draft, customer: e.target.value })}
              />
            </div>
          </div>
          <p className="m-lines-head" hidden={!hasLines}>
            {hasLines && (
              <>
                <span>Item pesanan · {t.count}</span>
                <span className="m-saved">
                  <Check aria-hidden="true" style={{ fontSize: 13 }} />
                  Draf tersimpan otomatis
                </span>
              </>
            )}
          </p>
          <ul className="m-lines" aria-label="Item pesanan" ref={linesRef}>
            {hasLines ? (
              priced.map((l, i) => {
                const m = l.menu;
                const showNote = !!l.note || noteOpen.has(i);
                return (
                  <li className="m-line" key={i}>
                    <span className="l-staf-thumb" aria-hidden="true">
                      {m.imageUrl}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <strong>{m.name}</strong>
                      <small>{rp(m.price * l.qty)}</small>
                      {!showNote && (
                        <button
                          type="button"
                          className="m-note-btn"
                          aria-label={`Tambah catatan untuk ${m.name}`}
                          onClick={() => openNote(i)}
                        >
                          + Catatan
                        </button>
                      )}
                    </div>
                    <div
                      className="m-stepper"
                      role="group"
                      aria-label={`Jumlah ${m.name}`}
                    >
                      <button
                        type="button"
                        data-step={i}
                        data-d={-1}
                        aria-label={`${l.qty === 1 ? "Hapus" : "Kurangi"} ${m.name}`}
                        onClick={() => step(i, -1)}
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
                        data-step={i}
                        data-d={1}
                        aria-label={`Tambah ${m.name}`}
                        onClick={() => step(i, 1)}
                      >
                        <Plus aria-hidden="true" style={{ fontSize: 14 }} />
                      </button>
                    </div>
                    {showNote && (
                      <input
                        className="l-staf-input"
                        data-nin={i}
                        value={l.note}
                        placeholder="Catatan, mis. tidak pedas, es sedikit"
                        maxLength={60}
                        aria-label={`Catatan ${m.name}`}
                        onChange={(e) => setNote(i, e.target.value)}
                      />
                    )}
                  </li>
                );
              })
            ) : (
              <li className="m-empty-ticket">
                <Receipt aria-hidden="true" style={{ fontSize: 26 }} />
                Pilih menu di sebelah kiri untuk mulai mencatat pesanan.
              </li>
            )}
          </ul>
        </div>
        <div className="m-ticket-foot">
          <div className="m-sum">
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
            <div className="m-sum-total">
              <span>Total</span>
              <span>{rp(t.total)}</span>
            </div>
          </div>
          <div className="m-row">
            <button
              className="l-staf-btn"
              type="button"
              disabled={!hasLines || createOrder.isPending}
              onClick={() => saveOrder(false)}
            >
              Simpan
            </button>
            <button
              className="l-staf-btn"
              data-variant="primary"
              type="button"
              disabled={!hasLines || createOrder.isPending}
              onClick={() => saveOrder(true)}
            >
              <Banknote aria-hidden="true" />
              Simpan &amp; bayar
            </button>
          </div>
        </div>
      </aside>

      {/* Konfirmasi kosongkan */}
      <Dialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        size="sm"
        labelledBy="kasir-manual-clr-title"
        data-node-id="kasir-manual.clear"
      >
        <div className="l-staf-dialog-head">
          <div>
            <h2 id="kasir-manual-clr-title">Kosongkan pesanan?</h2>
            <p>
              {draft.lines.length} baris · {rp(t.total)}
            </p>
          </div>
          <button
            className="l-staf-iconbtn"
            type="button"
            aria-label="Tutup"
            onClick={() => setClearOpen(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="l-staf-dialog-body">
          <p className="m-dlg-text">
            Semua item, catatan, meja, dan nama pelanggan di tiket ini dihapus.
            Pesanan yang sudah disimpan tidak terpengaruh.
          </p>
        </div>
        <div className="l-staf-dialog-foot">
          <button
            className="l-staf-btn"
            type="button"
            onClick={() => setClearOpen(false)}
          >
            Batal
          </button>
          <button
            className="l-staf-btn"
            data-variant="danger"
            type="button"
            onClick={clearDraft}
          >
            <Trash2 aria-hidden="true" />
            Ya, kosongkan
          </button>
        </div>
      </Dialog>
    </main>
  );
}
