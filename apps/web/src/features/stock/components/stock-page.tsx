import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleCheck, Download, Plus, TriangleAlert } from "lucide-react";
import {
  ago,
  fmtQty,
  hhmm,
  STOCK_BADGE,
  stockStatus,
} from "@starter/shared/fnb/domain";
import type { IngredientDto, StaffRole } from "@starter/shared/fnb/types";
import { StafPage } from "@/components/fnb/shell";
import { useToast } from "@/components/fnb/dialog";
import { useMenus } from "@/features/menu/hooks";
import { useNow } from "@/lib/use-now";
import type { StockInResult } from "../api";
import { useIngredients, useRecipeItems, useStockMovements } from "../hooks";
import {
  blockedMenuIds,
  byName,
  DAY,
  groupMovements,
  joinList,
  ratio,
} from "../ledger";
import {
  AddIngredientDialog,
  EditIngredientDialog,
} from "./ingredient-dialogs";
import { IngredientDrawer } from "./ingredient-drawer";
import {
  IngredientLedger,
  type StockFilter,
  type StockSort,
} from "./ingredient-ledger";
import { MovementHistory, type MoveFilter } from "./movement-history";
import { StockInDialog } from "./stock-in-dialog";
import { JoinList } from "./stock-ui";

// Port of design/src/pages/stok.page.html (PRD Fase 2 "Stok Bahan").

/** List view state survives leaving and re-opening the page (prototype S). */
const view: {
  filter: StockFilter;
  q: string;
  sort: StockSort;
  mv: MoveFilter;
} = { filter: "ALL", q: "", sort: "status", mv: "ALL" };

/** Movement ids highlighted for 6 s after they are recorded. */
function useFreshMoves() {
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);
  const mark = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setFresh((prev) => new Set([...prev, ...ids]));
    timers.current.push(
      setTimeout(() => {
        setFresh((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      }, 6000),
    );
  }, []);
  return [fresh, mark] as const;
}

export function StockPage({ role }: { role: StaffRole }) {
  const owner = role === "OWNER";
  const ingredientsQ = useIngredients();
  const movementsQ = useStockMovements();
  const ingredients = ingredientsQ.data;
  const movements = movementsQ.data;
  const { data: recipes } = useRecipeItems();
  const { data: menus } = useMenus();
  const toast = useToast();
  const now = useNow(60e3);

  const [filter, setFilterState] = useState(view.filter);
  const [q, setQState] = useState(view.q);
  const [sort, setSortState] = useState(view.sort);
  const [mv, setMvState] = useState(view.mv);
  const setFilter = (v: StockFilter) => setFilterState((view.filter = v));
  const setQ = (v: string) => setQState((view.q = v));
  const setSort = (v: StockSort) => setSortState((view.sort = v));
  const setMv = (v: MoveFilter) => setMvState((view.mv = v));

  const [current, setCurrent] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [catatId, setCatatId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [fresh, markFresh] = useFreshMoves();

  const ing = (id: string | null) =>
    id ? ingredients.find((i) => i.id === id) : undefined;
  const groups = useMemo(() => groupMovements(movements), [movements]);
  const blocked = useMemo(
    () => blockedMenuIds({ menus, recipeItems: recipes, ingredients }),
    [menus, recipes, ingredients],
  );
  const blockedNames = menus
    .filter((m) => blocked.includes(m.id))
    .map((m) => m.name);

  const openDrawer = (id: string) => {
    if (!ing(id)) return;
    setDrawerId(id);
    setCurrent(id);
  };
  const openCatat = (id: string) => setCatatId(id);
  const openEdit = (id: string) => {
    if (owner && ing(id)) setEditId(id);
  };

  function onRecorded(r: StockInResult) {
    const i = r.ingredient;
    if (r.movement) markFresh([r.movement.id]);
    setCurrent(i.id);
    if (stockStatus(i) !== r.before) setPulse((p) => p + 1);
    toast(
      `${i.name} +${fmtQty(r.qty, i.unit)} tercatat · sisa ${fmtQty(i.stockQty, i.unit)}` +
        (r.reopened.length ? ` · ${r.reopened[0]} bisa dipesan lagi` : ""),
    );
  }

  function onCreated(it: IngredientDto, movementId: string | null) {
    if (movementId) markFresh([movementId]);
    setCurrent(it.id);
    setFilter("ALL");
    setQ("");
    if (stockStatus(it) !== "AMAN") setPulse((p) => p + 1);
    toast(
      `${it.name} ditambahkan · status ${STOCK_BADGE[stockStatus(it)].label.toLowerCase()}`,
    );
  }

  function onEdited(it: IngredientDto, statusChanged: boolean) {
    if (statusChanged) setPulse((p) => p + 1);
    setCurrent(it.id);
    toast(
      `${it.name} disimpan · batas minimum ${fmtQty(it.minStock, it.unit)}`,
    );
  }

  /* ---------- Ringkasan ---------- */
  const men = ingredients.filter((i) => stockStatus(i) === "MENIPIS");
  const hab = ingredients.filter((i) => stockStatus(i) === "HABIS");
  const ins = movements.filter(
    (m) => m.type === "IN" && Date.parse(m.createdAt) >= now - 7 * DAY,
  );
  const last = ins.reduce((a, m) => Math.max(a, Date.parse(m.createdAt)), 0);
  const metrics: [string, string | number, string, string][] = [
    [
      "Total bahan",
      ingredients.length,
      `${ingredients.length - men.length - hab.length} dalam batas aman`,
      "",
    ],
    [
      "Menipis",
      men.length,
      men.length ? "di bawah batas minimum" : "tidak ada",
      men.length ? "warning" : "",
    ],
    [
      "Habis",
      hab.length,
      blocked.length
        ? `${blocked.length} menu tidak bisa dipesan`
        : "semua menu bisa dipesan",
      hab.length ? "danger" : "",
    ],
    [
      "Bahan masuk 7 hari",
      ins.length + "×",
      last ? "terakhir " + ago(last, now) : "belum ada catatan",
      "",
    ],
  ];
  const updatedAt = Math.max(
    now,
    ingredientsQ.dataUpdatedAt,
    movementsQ.dataUpdatedAt,
  );

  return (
    <StafPage
      id="stok"
      title="Stok Bahan"
      actions={
        <>
          {owner ? (
            <button
              className="l-staf-btn"
              type="button"
              onClick={() => setAdding(true)}
            >
              <Plus aria-hidden="true" />
              Tambah bahan
            </button>
          ) : null}
          <button
            className="l-staf-btn"
            data-variant="primary"
            type="button"
            onClick={() => openCatat("")}
          >
            <Download aria-hidden="true" />
            Catat bahan masuk
          </button>
        </>
      }
    >
      <main aria-label="Stok Bahan" className="p-stok">
        <p className="sk-context">
          <span>
            Diperbarui {hhmm(updatedAt)} · stok berkurang otomatis dari setiap
            penjualan
          </span>
        </p>

        <div>
          <StockAlert
            men={men}
            hab={hab}
            blockedNames={blockedNames}
            pulse={pulse}
            onOpen={openDrawer}
            onRecordIn={openCatat}
          />
        </div>

        <section className="sk-metrics" aria-label="Ringkasan stok">
          {metrics.map(([label, val, sub, tone]) => (
            <div
              key={label}
              className="l-staf-metric"
              data-tone={tone || undefined}
            >
              <span>{label}</span>
              <strong>{val}</strong>
              <small>{sub}</small>
            </div>
          ))}
        </section>

        <div className="sk-grid">
          <IngredientLedger
            ingredients={ingredients}
            recipes={recipes}
            owner={owner}
            filter={filter}
            onFilter={setFilter}
            q={q}
            onQuery={setQ}
            sort={sort}
            onSort={setSort}
            current={current}
            onOpen={openDrawer}
            onRecordIn={openCatat}
            onEdit={openEdit}
          />
          <MovementHistory
            groups={groups}
            ingredients={ingredients}
            fresh={fresh}
            filter={mv}
            onFilter={setMv}
            now={now}
            onOpen={openDrawer}
          />
        </div>

        <IngredientDrawer
          ingredient={ing(drawerId) ?? null}
          onClose={() => setDrawerId(null)}
          owner={owner}
          menus={menus}
          recipes={recipes}
          blocked={blocked}
          groups={groups}
          now={now}
          onRecordIn={openCatat}
          onEdit={openEdit}
        />
        <StockInDialog
          ingredientId={catatId}
          onClose={() => setCatatId(null)}
          ingredients={ingredients}
          menus={menus}
          recipes={recipes}
          movements={movements}
          onRecorded={onRecorded}
        />
        {owner ? (
          <>
            <AddIngredientDialog
              open={adding}
              onClose={() => setAdding(false)}
              ingredients={ingredients}
              onCreated={onCreated}
            />
            <EditIngredientDialog
              ingredient={ing(editId) ?? null}
              onClose={() => setEditId(null)}
              ingredients={ingredients}
              onSaved={onEdited}
            />
          </>
        ) : null}
      </main>
    </StafPage>
  );
}

function StockAlert({
  men,
  hab,
  blockedNames,
  pulse,
  onOpen,
  onRecordIn,
}: {
  men: IngredientDto[];
  hab: IngredientDto[];
  blockedNames: string[];
  pulse: number;
  onOpen: (id: string) => void;
  onRecordIn: (id: string) => void;
}) {
  if (!men.length && !hab.length) {
    return (
      <div className="l-staf-alert sk-alert" data-tone="positive">
        <CircleCheck aria-hidden="true" style={{ fontSize: 20 }} />
        <div>
          <strong className="sk-al-title">Semua bahan aman.</strong>
          <p>Tidak ada bahan yang menyentuh batas minimum.</p>
        </div>
      </div>
    );
  }
  const menSorted = [...men].sort((a, b) => ratio(a) - ratio(b));
  const habSorted = [...hab].sort(byName);
  const head =
    men.length && hab.length
      ? `${men.length} bahan menipis & ${hab.length} habis`
      : men.length
        ? `${men.length} bahan menipis`
        : `${hab.length} bahan habis`;
  const names = (list: IngredientDto[]) => (
    <JoinList
      items={list.map((i) => (
        <button
          key={i.id}
          type="button"
          className="sk-lnk"
          onClick={() => onOpen(i.id)}
        >
          {i.name}
        </button>
      ))}
    />
  );
  const target = habSorted[0] ?? menSorted[0];
  return (
    // A new key replays the entrance pulse when a status just changed.
    <div
      key={pulse}
      className="l-staf-alert sk-alert"
      data-tone="warning"
      data-pulse={pulse > 0 ? "" : undefined}
    >
      <TriangleAlert aria-hidden="true" style={{ fontSize: 20 }} />
      <div>
        <strong className="sk-al-title">{head}</strong>
        <p>
          {menSorted.length ? <>Menipis: {names(menSorted)}.</> : null}{" "}
          {habSorted.length ? <>Habis: {names(habSorted)}.</> : null}
        </p>
        {blockedNames.length ? (
          <p>
            <strong>{joinList(blockedNames)}</strong> sedang habis — pelanggan
            belum bisa memesannya sampai bahan masuk.
          </p>
        ) : null}
      </div>
      {target ? (
        <button
          type="button"
          className="l-staf-btn"
          data-size="sm"
          onClick={() => onRecordIn(target.id)}
        >
          <Download aria-hidden="true" style={{ fontSize: 16 }} />
          Catat bahan masuk
        </button>
      ) : null}
    </div>
  );
}
