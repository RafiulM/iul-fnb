import type { MouseEvent } from "react";
import { Pencil, Plus, Search, SearchX } from "lucide-react";
import { fmtQty, stockStatus } from "@starter/shared/fnb/domain";
import type {
  IngredientDto,
  RecipeItemDto,
  StockStatus,
} from "@starter/shared/fnb/types";
import { byName, byStatus, ratio } from "../ledger";
import { StatusChip, StockBar } from "./stock-ui";

export type StockFilter = "ALL" | StockStatus;
export type StockSort = "status" | "name" | "low";

const FILTERS: [StockFilter, string][] = [
  ["ALL", "Semua"],
  ["MENIPIS", "Menipis"],
  ["HABIS", "Habis"],
  ["AMAN", "Aman"],
];

export function IngredientLedger({
  ingredients,
  recipes,
  owner,
  filter,
  onFilter,
  q,
  onQuery,
  sort,
  onSort,
  current,
  onOpen,
  onRecordIn,
  onEdit,
}: {
  ingredients: IngredientDto[];
  recipes: RecipeItemDto[];
  owner: boolean;
  filter: StockFilter;
  onFilter: (f: StockFilter) => void;
  q: string;
  onQuery: (q: string) => void;
  sort: StockSort;
  onSort: (s: StockSort) => void;
  current: string | null;
  onOpen: (id: string) => void;
  onRecordIn: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const count = (k: StockFilter) =>
    k === "ALL"
      ? ingredients.length
      : ingredients.filter((i) => stockStatus(i) === k).length;

  const needle = q.trim().toLowerCase();
  const list = ingredients.filter(
    (i) =>
      (filter === "ALL" || stockStatus(i) === filter) &&
      (!needle || i.name.toLowerCase().includes(needle)),
  );
  if (sort === "name") list.sort(byName);
  else if (sort === "low")
    list.sort((a, b) => ratio(a) - ratio(b) || byName(a, b));
  else
    list.sort((a, b) => byStatus(a, b) || ratio(a) - ratio(b) || byName(a, b));

  const usesOf = (id: string) =>
    recipes.filter((r) => r.ingredientId === id).length;

  // Like the prototype: a click anywhere on the row (not on its buttons)
  // opens the detail drawer; the name button is the keyboard path.
  const onRowClick = (e: MouseEvent, id: string) => {
    if ((e.target as Element).closest("button")) return;
    onOpen(id);
  };

  return (
    <section
      className="l-staf-card sk-ledger"
      aria-labelledby="stok-ledger-title"
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="stok-ledger-title">Daftar bahan</h2>
          <p>Klik bahan untuk melihat detail &amp; menu yang memakainya</p>
        </div>
        <label className="l-staf-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            placeholder="Cari bahan…"
            aria-label="Cari bahan"
            autoComplete="off"
            value={q}
            onChange={(e) => onQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="sk-toolbar">
        <div
          className="l-staf-seg"
          role="group"
          aria-label="Saring menurut status"
        >
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => onFilter(k)}
            >
              {label}
              <small>{count(k)}</small>
            </button>
          ))}
        </div>
        <div className="sk-sort">
          <label htmlFor="stok-sort">Urutkan</label>
          <select
            className="l-staf-select"
            id="stok-sort"
            value={sort}
            onChange={(e) => onSort(e.target.value as StockSort)}
          >
            <option value="status">Status</option>
            <option value="name">Nama (A–Z)</option>
            <option value="low">Sisa terendah</option>
          </select>
        </div>
      </div>
      <div
        className="l-staf-table-wrap sk-table-wrap"
        hidden={list.length === 0}
      >
        <table className="l-staf-table sk-table">
          <thead>
            <tr>
              <th scope="col">Bahan</th>
              <th scope="col">Sisa stok</th>
              <th scope="col" className="sk-col-min l-staf-num">
                <span title="Batas minimum">Batas min.</span>
              </th>
              <th scope="col">Status</th>
              <th scope="col" className="sk-end">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => {
              const uses = usesOf(i.id);
              const cur = current === i.id;
              return (
                <tr
                  key={i.id}
                  data-current={cur ? "" : undefined}
                  aria-current={cur ? "true" : undefined}
                  onClick={(e) => onRowClick(e, i.id)}
                >
                  <td>
                    <button
                      type="button"
                      className="sk-name"
                      onClick={() => onOpen(i.id)}
                    >
                      {i.name}
                    </button>
                    <span className="sk-sub">
                      {uses
                        ? `Dipakai di ${uses} menu`
                        : "Belum dipakai di menu"}
                    </span>
                  </td>
                  <td>
                    <div className="sk-meter">
                      <strong>{fmtQty(i.stockQty, i.unit)}</strong>
                      <StockBar ing={i} />
                      <span className="sk-meter-min">
                        Batas {fmtQty(i.minStock, i.unit)}
                      </span>
                    </div>
                  </td>
                  <td className="sk-col-min l-staf-num">
                    {fmtQty(i.minStock, i.unit)}
                  </td>
                  <td>
                    <StatusChip status={stockStatus(i)} />
                  </td>
                  <td className="sk-end">
                    <div className="sk-acts">
                      <button
                        type="button"
                        className="l-staf-btn"
                        data-size="sm"
                        onClick={() => onRecordIn(i.id)}
                      >
                        <Plus aria-hidden="true" style={{ fontSize: 16 }} />
                        Masuk<span className="sk-sr"> — {i.name}</span>
                      </button>
                      {owner ? (
                        <button
                          type="button"
                          className="l-staf-iconbtn"
                          aria-label={`Ubah ${i.name}`}
                          title="Ubah batas minimum & satuan"
                          onClick={() => onEdit(i.id)}
                        >
                          <Pencil aria-hidden="true" style={{ fontSize: 16 }} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="l-staf-empty" hidden={list.length > 0}>
        <SearchX aria-hidden="true" />
        <strong>Tidak ada bahan yang cocok</strong>
        <span>Coba kata lain atau tampilkan semua bahan.</span>
        <button
          type="button"
          className="l-staf-btn"
          data-size="sm"
          style={{ marginTop: "var(--space-2)" }}
          onClick={() => {
            onQuery("");
            onFilter("ALL");
          }}
        >
          Tampilkan semua
        </button>
      </div>
      <div className="sk-foot">
        <span>
          {list.length === ingredients.length
            ? `${list.length} bahan`
            : `Menampilkan ${list.length} dari ${ingredients.length} bahan`}
        </span>
        <span className="sk-legend">
          <i aria-hidden="true" />
          Garis tipis pada bar = batas minimum
        </span>
      </div>
    </section>
  );
}
