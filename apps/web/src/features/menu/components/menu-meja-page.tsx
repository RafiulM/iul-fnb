import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  LayoutGrid,
  Lock,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  StickyNote,
  Trash2,
  Utensils,
} from "lucide-react";
import { stockStatus } from "@starter/shared/fnb/domain";
import type {
  IngredientDto,
  MenuDto,
  StaffRole,
  TableDto,
} from "@starter/shared/fnb/types";
import { useToast } from "@/components/fnb/dialog";
import { usePrint } from "@/components/fnb/receipt";
import { StafPage } from "@/components/fnb/shell";
import { useSettings } from "@/features/settings/hooks";
import { useIngredients, useRecipeItems } from "@/features/stock/hooks";
import {
  useMarkTablesPrinted,
  useRegenerateTableQr,
  useSetTableActive,
  useTables,
  useUnprintedTableIds,
} from "@/features/tables/hooks";
import { QrDialog } from "@/features/tables/components/qr-dialog";
import { TableDialog } from "@/features/tables/components/table-dialog";
import { TableQrSheet } from "@/features/tables/components/table-tent";
import { TablesTab } from "@/features/tables/components/tables-tab";
import {
  useCategories,
  useDeleteCategory,
  useDeleteMenu,
  useMarkMenusUnavailable,
  useMenus,
  useMoveCategory,
  useSetMenuAvailability,
} from "../hooks";
import { CategoryDialog, type CategoryDialogTarget } from "./category-dialog";
import { CategoryTab } from "./category-tab";
import { ConfirmDialog, type ConfirmOptions } from "./confirm-dialog";
import { MenuDialog, type MenuDialogTarget } from "./menu-dialog";
import { MenuTab } from "./menu-tab";
import {
  errorMessage,
  reduceMotion,
  TABS,
  useMarks,
  useUiState,
  type MenuMejaTab,
} from "./page-state";

const TITLE = "Menu & Meja";

/** Port of design/src/pages/menu-meja.page.html (owner only). */
export function MenuMejaPage({
  role,
  userName,
}: {
  role: StaffRole;
  userName: string;
}) {
  if (role === "CASHIER") {
    return (
      <StafPage id="menu-meja" title={TITLE}>
        <main aria-label={TITLE} className="p-menu-meja">
          <section
            className="l-staf-card mm-locked"
            aria-labelledby="menu-meja-locked-title"
          >
            <div className="l-staf-empty">
              <Lock aria-hidden="true" />
              <strong id="menu-meja-locked-title">
                Halaman ini khusus Pemilik
              </strong>
              <span>
                Akun <b>{userName}</b> (Kasir) tidak punya akses ke{" "}
                <b>Menu &amp; Meja</b>. Minta pemilik mengubah hak akses di menu
                Akun &amp; Staf.
              </span>
              <Link className="l-staf-btn" data-variant="primary" to="/kasir">
                <ClipboardList aria-hidden="true" />
                Kembali ke Pesanan
              </Link>
            </div>
          </section>
        </main>
      </StafPage>
    );
  }
  return <OwnerView />;
}

type FocusRequest = {
  selector: string;
  focus: boolean;
  scroll: boolean;
  until: number;
};

const byId = (sel: string, id: string) => `${sel}[data-id="${CSS.escape(id)}"]`;

function OwnerView() {
  const { data: menus } = useMenus();
  const { data: categories } = useCategories();
  const { data: tables } = useTables();
  const { data: unprinted } = useUnprintedTableIds();
  const { data: ingredients } = useIngredients();
  const { data: recipeItems } = useRecipeItems();
  const { data: settings } = useSettings();

  const setAvailability = useSetMenuAvailability();
  const markUnavailable = useMarkMenusUnavailable();
  const deleteMenu = useDeleteMenu();
  const moveCategory = useMoveCategory();
  const deleteCategory = useDeleteCategory();
  const setTableActive = useSetTableActive();
  const regenerateQr = useRegenerateTableQr();
  const markPrinted = useMarkTablesPrinted();

  const toast = useToast();
  const print = usePrint();
  const [ui, patch] = useUiState();
  const marks = useMarks();

  const [menuDlg, setMenuDlg] = useState<MenuDialogTarget | null>(null);
  const [catDlg, setCatDlg] = useState<CategoryDialogTarget | null>(null);
  const [tableDlg, setTableDlg] = useState(false);
  const [qrId, setQrId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const rootRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Focus / scroll an element once it is rendered with fresh data. */
  const focusReq = useRef<FocusRequest | null>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const requestFocus = (
    selector: string,
    { focus = true, scroll = false } = {},
  ) => {
    focusReq.current = { selector, focus, scroll, until: Date.now() + 2000 };
    rerender();
  };
  useEffect(() => {
    const req = focusReq.current;
    if (!req) return;
    if (Date.now() > req.until) {
      focusReq.current = null;
      return;
    }
    const el = rootRef.current?.querySelector<HTMLElement>(req.selector);
    if (!el) return; // not rendered yet: retry on the next render
    focusReq.current = null;
    if (req.focus) el.focus({ preventScroll: true });
    if (req.scroll)
      el.scrollIntoView({
        block: "nearest",
        behavior: reduceMotion() ? "auto" : "smooth",
      });
  });

  /* Print jobs start after a short delay so the toast shows first. */
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const all = timers.current;
    return () => all.forEach(clearTimeout);
  }, []);
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };

  // Files dropped outside the upload zone must not open a new tab.
  useEffect(() => {
    const stop = (e: DragEvent) => {
      if (e.dataTransfer && [...e.dataTransfer.types].includes("Files"))
        e.preventDefault();
    };
    addEventListener("dragover", stop);
    addEventListener("drop", stop);
    return () => {
      removeEventListener("dragover", stop);
      removeEventListener("drop", stop);
    };
  }, []);

  /* ----- Derived data ----- */
  const ingById = new Map(ingredients.map((i) => [i.id, i]));
  const outs = new Map<string, IngredientDto[]>();
  for (const r of recipeItems) {
    const ing = ingById.get(r.ingredientId);
    if (!ing || stockStatus(ing) !== "HABIS") continue;
    outs.set(r.menuId, [...(outs.get(r.menuId) ?? []), ing]);
  }
  const offMenus = menus.filter((m) => !m.isAvailable).length;
  const activeTables = tables.filter((t) => t.isActive);
  const qrTable = qrId ? (tables.find((t) => t.id === qrId) ?? null) : null;
  const previewTable =
    activeTables.find((t) => t.tableNumber === "07")?.tableNumber ??
    activeTables[0]?.tableNumber ??
    "07";

  /* ----- Tabs ----- */
  const setTab = (tab: MenuMejaTab, focus = false) => {
    patch({ tab });
    if (focus) document.getElementById(`menu-meja-tab-${tab}`)?.focus();
  };
  const onTabKey = (e: KeyboardEvent) => {
    const i = TABS.indexOf(ui.tab);
    const map: Record<string, number> = {
      ArrowRight: (i + 1) % TABS.length,
      ArrowLeft: (i - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    const next = map[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setTab(TABS[next] ?? "menu", true);
  };

  /* ----- Menu ----- */
  const openMenu = (id: string | null, presetCat?: string) => {
    if (!categories.length) {
      toast("Buat kategori dulu sebelum menambah menu");
      setTab("kategori");
      return;
    }
    setMenuDlg({ id, presetCat });
  };

  const onMenuSaved = (m: MenuDto, isNew: boolean) => {
    setMenuDlg(null);
    if (isNew) {
      // Make sure the new menu is visible
      patch({
        q: "",
        avail: "all",
        ...(ui.cat !== "all" && ui.cat !== m.categoryId
          ? { cat: m.categoryId }
          : {}),
      });
    }
    marks.mark(`menu:${m.id}`);
    requestFocus(`${byId(".mm-card", m.id)} .mm-card-main`, { scroll: true });
    const cat = categories.find((c) => c.id === m.categoryId);
    toast(
      isNew
        ? `“${m.name}” ditambahkan ke ${cat?.name ?? "menu"}`
        : `Perubahan “${m.name}” disimpan`,
    );
  };

  const confirmDeleteMenu = (m: MenuDto) => {
    const n = recipeItems.filter((r) => r.menuId === m.id).length;
    setConfirm({
      title: `Hapus “${m.name}”?`,
      body: (
        <>
          Menu ini akan hilang dari aplikasi pelanggan dan layar kasir
          {n ? `, beserta resepnya (${n} bahan)` : ""}. Riwayat penjualan tetap
          tersimpan.
          <br />
          <br />
          <b>Hanya habis sementara?</b> Cukup matikan “Tersedia” — menu tetap
          tampil sebagai “Habis”.
        </>
      ),
      ok: "Ya, hapus menu",
      icon: Trash2,
      onOk: () => {
        setMenuDlg(null);
        deleteMenu.mutate(m.id, {
          onSuccess: () => toast(`“${m.name}” dihapus dari menu`),
          onError: (e) => toast(errorMessage(e)),
        });
      },
    });
  };

  const toggleMenu = (m: MenuDto, on: boolean) => {
    setAvailability.mutate(
      { id: m.id, isAvailable: on },
      {
        onSuccess: () => {
          const o = outs.get(m.id) ?? [];
          toast(
            !on
              ? `${m.name} ditandai habis — pelanggan tidak bisa memesannya`
              : o[0]
                ? `${m.name} tersedia lagi — tapi stok ${o[0].name} masih habis`
                : `${m.name} tersedia lagi — pelanggan bisa memesannya`,
          );
        },
        onError: (e) => toast(errorMessage(e)),
      },
    );
  };

  const markRisky = (risky: MenuDto[]) => {
    markUnavailable.mutate(
      risky.map((m) => m.id),
      {
        onSuccess: () =>
          toast(
            risky.length === 1 && risky[0]
              ? `${risky[0].name} ditandai habis — pelanggan tidak bisa memesannya`
              : `${risky.length} menu ditandai habis`,
          ),
        onError: (e) => toast(errorMessage(e)),
      },
    );
  };

  /* ----- Categories ----- */
  const move = async (id: string, dir: -1 | 1) => {
    try {
      const { category, position } = await moveCategory.mutateAsync({
        id,
        dir,
      });
      marks.mark(`cat:${id}`);
      // Keep focus on the same arrow, or the other one at the ends
      const atEnd = dir < 0 ? position === 1 : position === categories.length;
      const act = dir < 0 !== atEnd ? "cat-up" : "cat-down";
      requestFocus(`${byId(".mm-cat-row", id)} [data-act="${act}"]`);
      toast(`Urutan disimpan — ${category.name} kini di posisi ${position}`);
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const confirmDeleteCategory = (id: string) => {
    const c = categories.find((x) => x.id === id);
    if (!c) return;
    const n = menus.filter((m) => m.categoryId === id).length;
    if (n) {
      toast(
        `“${c.name}” masih berisi ${n} menu — pindahkan atau hapus menunya dulu`,
      );
      return;
    }
    setConfirm({
      title: `Hapus kategori “${c.name}”?`,
      body: "Kategori ini kosong, jadi aman dihapus. Tabnya akan hilang dari aplikasi pelanggan.",
      ok: "Hapus kategori",
      icon: Trash2,
      onOk: () =>
        deleteCategory.mutate(id, {
          onSuccess: () => {
            patch({
              ...(ui.cat === id ? { cat: "all" } : {}),
              ...(ui.pCat === id ? { pCat: "all" } : {}),
            });
            toast(`Kategori “${c.name}” dihapus`);
          },
          onError: (e) => toast(errorMessage(e)),
        }),
    });
  };

  /* ----- Tables ----- */
  const toggleTable = (t: TableDto, on: boolean) => {
    setTableActive.mutate(
      { id: t.id, isActive: on },
      {
        onSuccess: () =>
          toast(
            on
              ? `Meja ${t.tableNumber} aktif — pelanggan bisa pesan lewat QR-nya`
              : `Meja ${t.tableNumber} nonaktif — QR-nya tidak bisa dipakai memesan`,
          ),
        onError: (e) => toast(errorMessage(e)),
      },
    );
  };

  const printTables = (list: TableDto[]) => {
    print(<TableQrSheet tables={list} settings={settings} />);
    markPrinted.mutate(list.map((t) => t.id));
  };
  const printOne = (t: TableDto) => {
    toast(`Membuka dialog cetak — QR Meja ${t.tableNumber}`);
    later(() => printTables([t]), 120);
  };
  const printAll = () => {
    if (!activeTables.length) {
      toast("Belum ada meja aktif untuk dicetak");
      return;
    }
    toast(`Membuka dialog cetak — ${activeTables.length} kartu QR meja aktif`);
    const list = activeTables;
    later(() => printTables(list), 120);
  };

  const confirmRegenerate = (t: TableDto) => {
    setConfirm({
      title: `Buat ulang QR Meja ${t.tableNumber}?`,
      body: (
        <>
          QR lama yang sudah tertempel di meja akan{" "}
          <b>langsung berhenti berfungsi</b>. Setelah ini, cetak QR baru dan
          ganti kartu di meja supaya pelanggan tetap bisa memesan.
        </>
      ),
      ok: "Ya, buat QR baru",
      icon: RefreshCw,
      onOk: () =>
        regenerateQr.mutate(t.id, {
          onSuccess: () =>
            toast(
              `QR Meja ${t.tableNumber} diperbarui — cetak & ganti kartu lamanya`,
            ),
          onError: (e) => toast(errorMessage(e)),
        }),
    });
  };

  const onTableSaved = (t: TableDto) => {
    setTableDlg(false);
    if (ui.tFilter !== "all" && ui.tFilter !== t.area)
      patch({ tFilter: "all" });
    marks.mark(`table:${t.id}`);
    requestFocus(byId(".mm-tcard", t.id), { focus: false, scroll: true });
    toast(`Meja ${t.tableNumber} ditambahkan — QR-nya siap dicetak`);
  };

  const tabs: [MenuMejaTab, string, typeof Utensils, number][] = [
    ["menu", "Menu", Utensils, menus.length],
    ["kategori", "Kategori", LayoutGrid, categories.length],
    ["meja", "Meja & QR", QrCode, tables.length],
  ];

  return (
    <StafPage
      id="menu-meja"
      title={TITLE}
      actions={
        <>
          <button
            className="l-staf-btn"
            data-variant="primary"
            type="button"
            data-tab-action="menu"
            hidden={ui.tab !== "menu"}
            onClick={() => openMenu(null)}
          >
            <Plus aria-hidden="true" />
            Tambah menu
          </button>
          <button
            className="l-staf-btn"
            data-variant="primary"
            type="button"
            data-tab-action="kategori"
            hidden={ui.tab !== "kategori"}
            onClick={() => setCatDlg({ id: null })}
          >
            <Plus aria-hidden="true" />
            Tambah kategori
          </button>
          <button
            className="l-staf-btn"
            type="button"
            data-tab-action="meja"
            hidden={ui.tab !== "meja"}
            onClick={printAll}
          >
            <Printer aria-hidden="true" />
            Cetak semua QR
          </button>
          <button
            className="l-staf-btn"
            data-variant="primary"
            type="button"
            data-tab-action="meja"
            hidden={ui.tab !== "meja"}
            onClick={() => setTableDlg(true)}
          >
            <Plus aria-hidden="true" />
            Tambah meja
          </button>
        </>
      }
    >
      <main ref={rootRef} aria-label={TITLE} className="p-menu-meja">
        <p className="mm-context">
          {`${menus.length} menu · ${offMenus} habis · ${activeTables.length} meja aktif`}
        </p>

        <div className="mm-app">
          <div
            className="l-staf-tabs mm-tabs"
            role="tablist"
            aria-label="Bagian halaman Menu & Meja"
            onKeyDown={onTabKey}
          >
            {tabs.map(([id, label, Icon, n]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`menu-meja-tab-${id}`}
                aria-controls={`menu-meja-panel-${id}`}
                aria-selected={ui.tab === id}
                tabIndex={ui.tab === id ? 0 : -1}
                onClick={() => setTab(id)}
              >
                <Icon aria-hidden="true" />
                {label}
                <small>{n}</small>
              </button>
            ))}
          </div>

          <MenuTab
            hidden={ui.tab !== "menu"}
            ui={ui}
            patch={patch}
            menus={menus}
            categories={categories}
            outs={outs}
            searchRef={searchRef}
            markState={marks.state}
            onAdd={(catId) => openMenu(null, catId)}
            onEdit={(id) => openMenu(id)}
            onToggle={toggleMenu}
            onMarkRisky={markRisky}
          />

          <CategoryTab
            hidden={ui.tab !== "kategori"}
            categories={categories}
            menus={menus}
            settings={settings}
            previewTable={previewTable}
            pCat={ui.pCat}
            onPreviewCat={(pCat) => patch({ pCat })}
            markState={marks.state}
            onAdd={() => setCatDlg({ id: null })}
            onEdit={(id) => setCatDlg({ id })}
            onMove={(id, dir) => void move(id, dir)}
            onDelete={confirmDeleteCategory}
          />

          <TablesTab
            hidden={ui.tab !== "meja"}
            tables={tables}
            unprinted={unprinted}
            filter={ui.tFilter}
            onFilter={(tFilter) => patch({ tFilter })}
            markState={marks.state}
            onAdd={() => setTableDlg(true)}
            onQr={setQrId}
            onToggle={toggleTable}
          />

          <p className="mm-proto">
            <StickyNote aria-hidden="true" style={{ fontSize: 14 }} />
            Perubahan langsung tampil di aplikasi pelanggan & layar kasir.
          </p>
        </div>

        <MenuDialog
          target={menuDlg}
          onClose={() => setMenuDlg(null)}
          menus={menus}
          categories={categories}
          ingredients={ingredients}
          recipeItems={recipeItems}
          filterCat={ui.cat}
          onSaved={onMenuSaved}
          onDelete={confirmDeleteMenu}
        />

        <CategoryDialog
          target={catDlg}
          onClose={() => setCatDlg(null)}
          categories={categories}
          menus={menus}
          onSaved={(c, message, edited) => {
            setCatDlg(null);
            marks.mark(`cat:${c.id}`);
            if (edited)
              requestFocus(
                `${byId(".mm-cat-row", c.id)} [data-act="edit-cat"]`,
              );
            toast(message);
          }}
        />

        <TableDialog
          open={tableDlg}
          onClose={() => setTableDlg(false)}
          tables={tables}
          filter={ui.tFilter}
          onSaved={onTableSaved}
        />

        <QrDialog
          table={qrTable}
          settings={settings}
          unprinted={!!qrTable && unprinted.includes(qrTable.id)}
          onClose={() => setQrId(null)}
          onPrint={printOne}
          onRegenerate={confirmRegenerate}
        />

        <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
      </main>
    </StafPage>
  );
}
