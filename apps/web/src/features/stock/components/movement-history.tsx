import { Fragment } from "react";
import { Minus, Package, Plus, RefreshCw } from "lucide-react";
import { fmtQty, hhmm } from "@starter/shared/fnb/domain";
import type { IngredientDto } from "@starter/shared/fnb/types";
import { dayLabel, firstName, isoDay, type MoveGroup } from "../ledger";

export type MoveFilter = "ALL" | "IN" | "OUT";

const MV_FILTERS: [MoveFilter, string][] = [
  ["ALL", "Semua"],
  ["IN", "Masuk"],
  ["OUT", "Keluar"],
];

export function MovementHistory({
  groups,
  ingredients,
  fresh,
  filter,
  onFilter,
  now,
  onOpen,
}: {
  groups: MoveGroup[];
  ingredients: IngredientDto[];
  fresh: ReadonlySet<string>;
  filter: MoveFilter;
  onFilter: (f: MoveFilter) => void;
  now: number;
  onOpen: (id: string) => void;
}) {
  const ing = (id: string) => ingredients.find((i) => i.id === id);
  const list = groups.filter((g) => filter === "ALL" || g.type === filter);

  return (
    <section className="l-staf-card sk-hist" aria-labelledby="stok-hist-title">
      <div className="l-staf-card-head">
        <div>
          <h2 id="stok-hist-title">Pergerakan stok</h2>
          <p>Bahan masuk &amp; keluar terbaru</p>
        </div>
      </div>
      <div className="sk-hist-tools">
        <div
          className="l-staf-seg"
          data-block=""
          role="group"
          aria-label="Saring pergerakan"
        >
          {MV_FILTERS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => onFilter(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="sk-hist-list"
        role="region"
        tabIndex={0}
        aria-label="Daftar pergerakan stok"
      >
        {list.length ? (
          list.map((g, n) => {
            const prev = list[n - 1];
            const head =
              !prev || isoDay(prev.createdAt) !== isoDay(g.createdAt) ? (
                <h3 className="sk-day">{dayLabel(g.createdAt, now)}</h3>
              ) : null;
            const isFresh = g.ids.some((id) => fresh.has(id));
            return (
              <Fragment key={g.key}>
                {head}
                {g.kind === "single" ? (
                  <SingleMove g={g} ing={ing} fresh={isFresh} onOpen={onOpen} />
                ) : (
                  <SaleMove g={g} ing={ing} fresh={isFresh} />
                )}
              </Fragment>
            );
          })
        ) : (
          <div className="l-staf-empty">
            <Package aria-hidden="true" style={{ fontSize: 28 }} />
            <strong>Belum ada pergerakan</strong>
            Catatan bahan masuk dan penjualan akan muncul di sini.
          </div>
        )}
      </div>
      <div className="sk-hist-foot">
        <RefreshCw aria-hidden="true" />
        Stok keluar tercatat otomatis dari setiap pesanan.
      </div>
    </section>
  );
}

function SingleMove({
  g,
  ing,
  fresh,
  onOpen,
}: {
  g: MoveGroup;
  ing: (id: string) => IngredientDto | undefined;
  fresh: boolean;
  onOpen: (id: string) => void;
}) {
  const line = g.lines[0];
  const i = line ? ing(line.ingredientId) : undefined;
  if (!line || !i) return null;
  const isIn = g.dir === "in";
  const meta = [
    g.note || "Tanpa catatan",
    g.createdBy ? "dicatat " + firstName(g.createdBy) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="sk-mv" data-fresh={fresh ? "" : undefined}>
      <span className="sk-mvi" data-dir={g.dir} aria-hidden="true">
        {isIn ? (
          <Plus style={{ fontSize: 14 }} />
        ) : (
          <Minus style={{ fontSize: 14 }} />
        )}
      </span>
      <div className="sk-mv-txt">
        <button
          type="button"
          className="sk-mv-name"
          onClick={() => onOpen(i.id)}
        >
          {i.name}
        </button>
        <small>{meta}</small>
      </div>
      <div className="sk-mv-end">
        <span className="sk-mv-qty">
          <span className="sk-sr">{isIn ? "Masuk " : "Keluar "}</span>
          {isIn ? "+" : "−"}
          {fmtQty(line.qty, i.unit)}
        </span>
        <span className="sk-mv-time">{hhmm(g.createdAt)}</span>
      </div>
    </div>
  );
}

function SaleMove({
  g,
  ing,
  fresh,
}: {
  g: MoveGroup;
  ing: (id: string) => IngredientDto | undefined;
  fresh: boolean;
}) {
  const parts = g.lines.flatMap((l) => {
    const i = ing(l.ingredientId);
    return i ? [{ i, qty: l.qty }] : [];
  });
  return (
    <div className="sk-mv" data-fresh={fresh ? "" : undefined}>
      <span className="sk-mvi" data-dir="out" aria-hidden="true">
        <Minus style={{ fontSize: 14 }} />
      </span>
      <div className="sk-mv-txt">
        <strong>{g.title}</strong>
        <small>
          <span className="sk-sr">Keluar: </span>
          {parts.map(({ i, qty }, n) => (
            <Fragment key={i.id}>
              {n > 0 ? " · " : null}
              {i.name} <b>−{fmtQty(qty, i.unit)}</b>
            </Fragment>
          ))}
        </small>
      </div>
      <div className="sk-mv-end">
        <span className="sk-mv-time">{hhmm(g.createdAt)}</span>
      </div>
    </div>
  );
}
