import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import { initials, rp } from "@starter/shared/fnb/domain";
import type {
  CafeSettingsDto,
  MenuCategoryDto,
  MenuDto,
} from "@starter/shared/fnb/types";
import { tableMenuUrl } from "@/lib/env";

export function CategoryTab({
  hidden,
  categories,
  menus,
  settings,
  previewTable,
  pCat,
  onPreviewCat,
  markState,
  onAdd,
  onEdit,
  onMove,
  onDelete,
}: {
  hidden: boolean;
  categories: MenuCategoryDto[];
  menus: MenuDto[];
  settings: CafeSettingsDto;
  /** Table number shown in (and linked from) the customer preview. */
  previewTable: string;
  pCat: string;
  onPreviewCat: (id: string) => void;
  markState: (key: string) => "current" | undefined;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
}) {
  const menusIn = (id: string) => menus.filter((m) => m.categoryId === id);

  return (
    <section
      className="mm-panel"
      id="menu-meja-panel-kategori"
      role="tabpanel"
      aria-labelledby="menu-meja-tab-kategori"
      hidden={hidden}
    >
      <div className="mm-cat-layout">
        <div className="mm-cat-col">
          <section
            className="l-staf-card"
            aria-labelledby="menu-meja-cat-title"
          >
            <div className="l-staf-card-head">
              <div>
                <h2 id="menu-meja-cat-title">Urutan kategori</h2>
                <p>
                  Urutan dari atas ke bawah = urutan tab di aplikasi pelanggan.
                </p>
              </div>
            </div>
            <div className="l-staf-card-body">
              <ol className="mm-cat-list">
                {categories.length ? (
                  categories.map((c, i) => {
                    const ms = menusIn(c.id);
                    const off = ms.filter((m) => !m.isAvailable).length;
                    const locked = ms.length > 0;
                    const why = `Masih berisi ${ms.length} menu — pindahkan atau hapus menunya dulu`;
                    return (
                      <li
                        key={c.id}
                        className="mm-cat-row"
                        data-id={c.id}
                        data-state={markState(`cat:${c.id}`)}
                      >
                        <span className="mm-cat-pos" aria-hidden="true">
                          {i + 1}
                        </span>
                        <span className="l-staf-thumb" aria-hidden="true">
                          {ms[0]?.imageUrl ?? "🍽️"}
                        </span>
                        <div className="mm-cat-info">
                          <strong>{c.name}</strong>
                          <small>
                            {ms.length
                              ? `${ms.length} menu${off ? ` · ${off} habis` : ""}`
                              : "Belum ada menu"}
                          </small>
                        </div>
                        <div className="mm-cat-acts">
                          <button
                            type="button"
                            className="l-staf-iconbtn"
                            data-act="cat-up"
                            aria-label={`Naikkan ${c.name}`}
                            title="Naikkan"
                            disabled={i === 0}
                            onClick={() => onMove(c.id, -1)}
                          >
                            <ArrowUp
                              aria-hidden="true"
                              style={{ fontSize: 16 }}
                            />
                          </button>
                          <button
                            type="button"
                            className="l-staf-iconbtn"
                            data-act="cat-down"
                            aria-label={`Turunkan ${c.name}`}
                            title="Turunkan"
                            disabled={i === categories.length - 1}
                            onClick={() => onMove(c.id, 1)}
                          >
                            <ArrowDown
                              aria-hidden="true"
                              style={{ fontSize: 16 }}
                            />
                          </button>
                          <span className="mm-vsep" aria-hidden="true" />
                          <button
                            type="button"
                            className="l-staf-iconbtn"
                            data-act="edit-cat"
                            aria-label={`Ubah nama ${c.name}`}
                            title="Ubah nama"
                            onClick={() => onEdit(c.id)}
                          >
                            <Pencil
                              aria-hidden="true"
                              style={{ fontSize: 16 }}
                            />
                          </button>
                          <button
                            type="button"
                            className="l-staf-iconbtn mm-del"
                            onClick={() => onDelete(c.id)}
                            {...(locked
                              ? {
                                  "aria-disabled": true,
                                  "aria-label": `Hapus ${c.name} — tidak bisa, ${why.toLowerCase()}`,
                                  title: why,
                                }
                              : {
                                  "aria-label": `Hapus ${c.name}`,
                                  title: "Hapus kategori",
                                })}
                          >
                            <Trash2
                              aria-hidden="true"
                              style={{ fontSize: 16 }}
                            />
                          </button>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="mm-cat-empty">
                    Belum ada kategori. Tambahkan minimal satu supaya menu bisa
                    dikelompokkan.
                  </li>
                )}
              </ol>
              <button type="button" className="mm-add-row" onClick={onAdd}>
                <Plus aria-hidden="true" />
                Tambah kategori
              </button>
            </div>
            <p className="mm-card-note">
              <Lock aria-hidden="true" style={{ fontSize: 14 }} />
              Kategori yang masih berisi menu tidak bisa dihapus. Pindahkan
              menunya dulu lewat tombol Ubah di kartu menu.
            </p>
          </section>
          <div className="l-staf-alert" data-tone="neutral">
            <Zap aria-hidden="true" />
            <span>
              <strong>Tips:</strong> taruh kategori yang paling sering dipesan
              di urutan atas — pelanggan langsung melihatnya setelah scan QR.
            </span>
          </div>
        </div>

        <CustomerPreview
          categories={categories}
          menus={menus}
          settings={settings}
          table={previewTable}
          pCat={pCat}
          onPreviewCat={onPreviewCat}
        />
      </div>
    </section>
  );
}

/** Mimics the customer menu page (Sunlit Ledger: cream, white, black pill). */
function CustomerPreview({
  categories,
  menus,
  settings,
  table,
  pCat: rawPCat,
  onPreviewCat,
}: {
  categories: MenuCategoryDto[];
  menus: MenuDto[];
  settings: CafeSettingsDto;
  table: string;
  pCat: string;
  onPreviewCat: (id: string) => void;
}) {
  const menusIn = (id: string) => menus.filter((m) => m.categoryId === id);
  const pCat =
    rawPCat !== "all" && categories.some((c) => c.id === rawPCat)
      ? rawPCat
      : "all";
  const tabs = [{ id: "all", name: "Semua", n: menus.length }].concat(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      n: menusIn(c.id).length,
    })),
  );
  const shown =
    pCat === "all" ? categories : categories.filter((c) => c.id === pCat);
  const sections = shown
    .map((c) => ({
      c,
      // Like the customer page: available first, sold out last
      items: menusIn(c.id).sort(
        (a, b) => Number(b.isAvailable) - Number(a.isAvailable),
      ),
    }))
    .filter(({ items }) => items.length);
  const lim = (n: number) => (pCat === "all" ? 3 : n);

  return (
    <aside
      className="l-staf-card mm-preview"
      aria-labelledby="menu-meja-pv-title"
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="menu-meja-pv-title">Pratinjau di aplikasi pelanggan</h2>
          <p>Tampilan setelah pelanggan scan QR meja.</p>
        </div>
        <a
          className="l-staf-iconbtn"
          href={tableMenuUrl(table)}
          target="_blank"
          rel="noopener"
          aria-label="Buka halaman pelanggan"
          title="Buka halaman pelanggan"
        >
          <ExternalLink aria-hidden="true" />
        </a>
      </div>
      <div className="l-staf-card-body">
        <div
          className="mm-phone"
          role="group"
          aria-label="Pratinjau aplikasi pelanggan"
        >
          <div className="mm-ph-screen">
            <div className="mm-ph-head">
              <div className="mm-ph-top">
                <div className="mm-ph-brand">
                  <span className="mm-ph-logo" aria-hidden="true">
                    {initials(settings.cafeName)}
                  </span>
                  <div>
                    <strong>{settings.cafeName}</strong>
                    <small>{settings.address}</small>
                  </div>
                </div>
                <div className="mm-ph-table">
                  <span>Meja</span>
                  <strong>{table}</strong>
                </div>
              </div>
              <p className="mm-ph-hello">Selamat datang 👋</p>
              <p className="mm-ph-greet">Mau pesan apa hari ini?</p>
            </div>
            <div className="mm-ph-search" aria-hidden="true">
              <Search style={{ fontSize: 14 }} />
              Cari menu, mis. kopi susu
            </div>
            <div
              className="mm-ph-tabs"
              role="group"
              aria-label="Kategori di aplikasi pelanggan (pratinjau)"
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="mm-ph-tab"
                  aria-pressed={pCat === t.id}
                  onClick={() => onPreviewCat(t.id)}
                >
                  {t.name}
                  <small>{t.n}</small>
                </button>
              ))}
            </div>
            <div>
              {sections.length ? (
                sections.map(({ c, items }) => (
                  <div className="mm-ph-sec" key={c.id}>
                    <p className="mm-ph-h">
                      {c.name}
                      <span>{items.length} menu</span>
                    </p>
                    {items.slice(0, lim(items.length)).map((m) => (
                      <div
                        className="mm-ph-item"
                        key={m.id}
                        data-off={m.isAvailable ? undefined : ""}
                      >
                        <span className="mm-ph-thumb" aria-hidden="true">
                          {m.imageUrl}
                        </span>
                        <span className="mm-ph-txt">
                          <b>{m.name}</b>
                          <i>{rp(m.price)}</i>
                        </span>
                        {m.isAvailable ? (
                          <span className="mm-ph-add" aria-hidden="true">
                            <Plus aria-hidden="true" style={{ fontSize: 13 }} />
                          </span>
                        ) : (
                          <span className="mm-ph-so">Habis</span>
                        )}
                      </div>
                    ))}
                    {items.length > lim(items.length) && (
                      <p className="mm-ph-more">
                        +{items.length - lim(items.length)} menu lainnya
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="mm-ph-empty">Belum ada menu di kategori ini.</p>
              )}
            </div>
          </div>
        </div>
        <p className="mm-pv-note">
          Urutan tab &amp; status “Habis” mengikuti halaman ini dan langsung
          tampil di halaman pelanggan.
        </p>
      </div>
    </aside>
  );
}
