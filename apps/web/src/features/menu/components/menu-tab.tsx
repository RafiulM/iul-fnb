import { useState, type RefObject } from "react";
import {
  CircleCheck,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  SearchX,
  TriangleAlert,
  Utensils,
} from "lucide-react";
import { rp } from "@starter/shared/fnb/domain";
import type {
  IngredientDto,
  MenuCategoryDto,
  MenuDto,
} from "@starter/shared/fnb/types";
import { EmptyCard } from "./empty-card";
import type { UiState } from "./page-state";

export const TAG_TONE: Record<string, "positive" | "accent" | "danger"> = {
  Terlaris: "positive",
  Baru: "accent",
  Pedas: "danger",
};

const mainLabel = (m: MenuDto) =>
  `Ubah ${m.name}, ${rp(m.price)}${m.isAvailable ? "" : ", habis"}`;

export function MenuTab({
  hidden,
  ui,
  patch,
  menus,
  categories,
  outs,
  searchRef,
  markState,
  onAdd,
  onEdit,
  onToggle,
  onMarkRisky,
}: {
  hidden: boolean;
  ui: UiState;
  patch: (p: Partial<UiState>) => void;
  menus: MenuDto[];
  categories: MenuCategoryDto[];
  /** Out-of-stock recipe ingredients per menu id. */
  outs: Map<string, IngredientDto[]>;
  searchRef: RefObject<HTMLInputElement | null>;
  markState: (key: string) => "current" | undefined;
  onAdd: (categoryId?: string) => void;
  onEdit: (id: string) => void;
  onToggle: (menu: MenuDto, on: boolean) => void;
  onMarkRisky: (menus: MenuDto[]) => void;
}) {
  const cat =
    ui.cat !== "all" && categories.some((c) => c.id === ui.cat)
      ? ui.cat
      : "all";
  const menusIn = (id: string) => menus.filter((m) => m.categoryId === id);
  const outsOf = (m: MenuDto) => outs.get(m.id) ?? [];

  const chips = [{ id: "all", name: "Semua", n: menus.length }].concat(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      n: menusIn(c.id).length,
    })),
  );
  const pool = cat === "all" ? menus : menusIn(cat);
  const onCount = pool.filter((m) => m.isAvailable).length;
  const availChips: [UiState["avail"], string, number][] = [
    ["all", "Semua", pool.length],
    ["on", "Tersedia", onCount],
    ["off", "Habis", pool.length - onCount],
  ];

  // Menus that can still be ordered although an ingredient is out of stock
  const risky = menus.filter((m) => m.isAvailable && outsOf(m).length);

  // A card switched on/off stays in place until the filters change, like the
  // prototype's in-place update (focus stays on the switch).
  const filterKey = `${ui.q}|${cat}|${ui.avail}`;
  const [pin, setPin] = useState({ key: filterKey, ids: new Set<string>() });
  const pinned = pin.key === filterKey ? pin.ids : null;
  const toggle = (m: MenuDto, on: boolean) => {
    setPin((p) => ({
      key: filterKey,
      ids: new Set(p.key === filterKey ? p.ids : []).add(m.id),
    }));
    onToggle(m, on);
  };

  const q = ui.q.trim().toLowerCase();
  const list = menus.filter(
    (m) =>
      (cat === "all" || m.categoryId === cat) &&
      (ui.avail === "all" ||
        (ui.avail === "on") === m.isAvailable ||
        !!pinned?.has(m.id)) &&
      (!q ||
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)),
  );
  const meta =
    list.length === menus.length
      ? `${menus.length} menu`
      : `Menampilkan ${list.length} dari ${menus.length} menu`;

  const showAdd = !q && ui.avail === "all";
  const sections = (
    cat === "all" ? categories : categories.filter((c) => c.id === cat)
  )
    .map((c) => ({ c, items: list.filter((m) => m.categoryId === c.id) }))
    .filter(({ items }) => items.length || showAdd);

  const reset = (
    <button
      type="button"
      className="l-staf-btn"
      onClick={() => {
        patch({ q: "", cat: "all", avail: "all" });
        searchRef.current?.focus();
      }}
    >
      Reset filter
    </button>
  );

  return (
    <section
      className="mm-panel"
      id="menu-meja-panel-menu"
      role="tabpanel"
      aria-labelledby="menu-meja-tab-menu"
      hidden={hidden}
    >
      <div className="mm-toolbar">
        <label className="l-staf-search">
          <Search aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Cari nama menu…"
            aria-label="Cari menu"
            autoComplete="off"
            value={ui.q}
            onChange={(e) => patch({ q: e.target.value })}
          />
        </label>
        <div
          className="l-staf-seg"
          role="group"
          aria-label="Filter ketersediaan"
        >
          {availChips.map(([v, label, n]) => (
            <button
              key={v}
              type="button"
              aria-pressed={ui.avail === v}
              onClick={() => patch({ avail: v })}
            >
              {label}
              <small>{n}</small>
            </button>
          ))}
        </div>
        <span className="mm-meta" aria-live="polite">
          {meta}
        </span>
      </div>
      <div className="l-staf-seg" role="group" aria-label="Filter kategori">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cat === c.id}
            onClick={() => patch({ cat: c.id })}
          >
            {c.name}
            <small>{c.n}</small>
          </button>
        ))}
      </div>
      {risky.length > 0 && (
        <div>
          <div className="l-staf-alert mm-risk" data-tone="warning">
            <TriangleAlert aria-hidden="true" style={{ fontSize: 18 }} />
            <div className="mm-grow">
              <strong>
                {risky.length} menu masih bisa dipesan padahal bahannya habis:
              </strong>{" "}
              {risky.map((m) => m.name).join(", ")}. Tandai habis supaya
              pelanggan tidak kecewa.
            </div>
            <button
              type="button"
              className="l-staf-btn"
              data-size="sm"
              onClick={() => onMarkRisky(risky)}
            >
              Tandai habis
            </button>
          </div>
        </div>
      )}
      <div className="mm-list">
        {!categories.length ? (
          <EmptyCard
            icon={FolderOpen}
            title="Belum ada kategori"
            text="Buat kategori dulu (mis. Makanan, Minuman), lalu tambahkan menunya."
            action={
              <button
                type="button"
                className="l-staf-btn"
                onClick={() => patch({ tab: "kategori" })}
              >
                Atur kategori
              </button>
            }
          />
        ) : sections.length ? (
          sections.map(({ c, items }) => (
            <section
              key={c.id}
              className="mm-sec"
              aria-labelledby={`menu-meja-sec-${c.id}`}
            >
              <header className="mm-sec-head">
                <h2 id={`menu-meja-sec-${c.id}`}>{c.name}</h2>
                <span>{items.length} menu</span>
              </header>
              <div className="mm-grid">
                {items.map((m) => (
                  <MenuCard
                    key={m.id}
                    menu={m}
                    outs={outsOf(m)}
                    state={markState(`menu:${m.id}`)}
                    onEdit={() => onEdit(m.id)}
                    onToggle={(on) => toggle(m, on)}
                  />
                ))}
                {showAdd && (
                  <button
                    type="button"
                    className="mm-add"
                    onClick={() => onAdd(c.id)}
                  >
                    <span className="mm-add-plus">
                      <Plus aria-hidden="true" style={{ fontSize: 20 }} />
                    </span>
                    <strong>Tambah menu</strong>
                    <small>ke {c.name}</small>
                  </button>
                )}
              </div>
            </section>
          ))
        ) : q ? (
          <EmptyCard
            icon={SearchX}
            title="Menu tidak ditemukan"
            text={`Tidak ada menu dengan kata “${ui.q.trim()}”. Coba kata lain, mis. “kopi” atau “nasi”.`}
            action={reset}
          />
        ) : ui.avail === "off" ? (
          <EmptyCard
            icon={CircleCheck}
            title="Tidak ada menu yang habis"
            text="Semua menu di pilihan ini bisa dipesan pelanggan."
            action={reset}
          />
        ) : (
          <EmptyCard
            icon={Utensils}
            title="Belum ada menu"
            text="Ubah filter, atau tambahkan menu baru."
            action={reset}
          />
        )}
      </div>
    </section>
  );
}

function MenuCard({
  menu: m,
  outs,
  state,
  onEdit,
  onToggle,
}: {
  menu: MenuDto;
  outs: IngredientDto[];
  state: "current" | undefined;
  onEdit: () => void;
  onToggle: (on: boolean) => void;
}) {
  const tags = m.tags.filter((t) => TAG_TONE[t]);
  const switchId = `menu-meja-av-${m.id}`;
  return (
    <article
      className="mm-card"
      data-id={m.id}
      data-off={m.isAvailable ? undefined : ""}
      data-state={state}
    >
      <button
        type="button"
        className="mm-card-main"
        aria-label={mainLabel(m)}
        onClick={onEdit}
      >
        <span className="mm-tile" aria-hidden="true">
          <span className="mm-emo">{m.imageUrl}</span>
        </span>
        {!m.isAvailable && (
          <span className="l-staf-chip mm-sold" data-tone="danger">
            Habis
          </span>
        )}
        <span className="mm-card-body">
          {tags.length > 0 && (
            <span className="mm-tags">
              {tags.map((t) => (
                <span key={t} className="l-staf-chip" data-tone={TAG_TONE[t]}>
                  {t}
                </span>
              ))}
            </span>
          )}
          <span className="mm-name">{m.name}</span>
          <span className="mm-desc">
            {m.description || "Belum ada deskripsi."}
          </span>
          <span className="mm-bottom">
            {outs.length > 0 && (
              <span className="mm-warn">
                <TriangleAlert aria-hidden="true" style={{ fontSize: 14 }} />
                <span>Bahan habis: {outs.map((i) => i.name).join(", ")}</span>
              </span>
            )}
            <span className="mm-price">{rp(m.price)}</span>
          </span>
        </span>
      </button>
      <div className="mm-card-foot">
        <div className="mm-avail">
          <label className="l-staf-switch">
            <input
              type="checkbox"
              role="switch"
              id={switchId}
              checked={m.isAvailable}
              onChange={(e) => onToggle(e.target.checked)}
              aria-label={`${m.name} tersedia`}
            />
            <span />
          </label>
          <label className="mm-avail-txt" htmlFor={switchId}>
            {m.isAvailable ? "Tersedia" : "Habis"}
          </label>
        </div>
        <button
          type="button"
          className="l-staf-iconbtn"
          aria-label={`Ubah ${m.name}`}
          title="Ubah menu"
          onClick={onEdit}
        >
          <Pencil aria-hidden="true" style={{ fontSize: 16 }} />
        </button>
      </div>
    </article>
  );
}
