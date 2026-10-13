import { useRef, useState, type FormEvent } from "react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";
import { fmtQty, STOCK_BADGE, stockStatus } from "@starter/shared/fnb/domain";
import type {
  IngredientDto,
  MenuDto,
  RecipeItemDto,
  StockMovementDto,
} from "@starter/shared/fnb/types";
import { Dialog } from "@/components/fnb/dialog";
import type { StockInResult } from "../api";
import { useRecordStockIn } from "../hooks";
import {
  blockedMenuIds,
  byName,
  byStatus,
  isoDay,
  joinList,
  QUICK,
  r2,
  UNIT_HINT,
  UNIT_NAME,
} from "../ledger";
import { StatusChip } from "./stock-ui";

type Props = {
  /** null = closed; "" = no ingredient picked yet. */
  ingredientId: string | null;
  onClose: () => void;
  ingredients: IngredientDto[];
  menus: MenuDto[];
  recipes: RecipeItemDto[];
  movements: StockMovementDto[];
  onRecorded: (result: StockInResult) => void;
};

export function StockInDialog({ ingredientId, onClose, ...rest }: Props) {
  return (
    <Dialog
      open={ingredientId !== null}
      onClose={onClose}
      labelledBy="stok-c-title"
      data-part="catat"
    >
      {ingredientId !== null ? (
        <StockInForm initialId={ingredientId} onClose={onClose} {...rest} />
      ) : null}
    </Dialog>
  );
}

function StockInForm({
  initialId,
  onClose,
  ingredients,
  menus,
  recipes,
  movements,
  onRecorded,
}: Omit<Props, "ingredientId"> & { initialId: string }) {
  const low = ingredients
    .filter((i) => stockStatus(i) !== "AMAN")
    .sort((a, b) => byStatus(a, b) || byName(a, b));
  const ok = ingredients.filter((i) => stockStatus(i) === "AMAN").sort(byName);
  const today = isoDay(Date.now());

  const [ingId, setIngId] = useState(() =>
    initialId && ingredients.some((i) => i.id === initialId)
      ? initialId
      : ((low[0] ?? ok[0])?.id ?? ""),
  );
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [qtyErr, setQtyErr] = useState("");
  const [dateErr, setDateErr] = useState("");
  const ingRef = useRef<HTMLSelectElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const record = useRecordStockIn();

  const ing = ingredients.find((i) => i.id === ingId);
  const notes = [
    ...new Set(
      movements.filter((m) => m.type === "IN" && m.note).map((m) => m.note),
    ),
  ];

  async function save(again: boolean) {
    if (!ing || record.isPending) return;
    const q = parseFloat(qty);
    const dv = date || today;
    let bad: HTMLElement | null = null;
    if (!(q > 0)) {
      setQtyErr("Isi jumlah bahan yang masuk (lebih dari 0).");
      bad ??= qtyRef.current;
    } else if (q > 1e6) {
      setQtyErr("Jumlahnya terlalu besar — cek lagi satuannya.");
      bad ??= qtyRef.current;
    } else setQtyErr("");
    if (dv > today) {
      setDateErr("Tanggal tidak boleh setelah hari ini.");
      bad ??= dateRef.current;
    } else setDateErr("");
    if (bad) {
      bad.focus();
      return;
    }
    try {
      const result = await record.mutateAsync({
        input: {
          ingredientId: ing.id,
          qty: q,
          date: dv,
          note: note.trim().replace(/\s+/g, " "),
        },
        ctx: { ingredients, menus },
      });
      onRecorded(result);
      if (again) {
        setQty("");
        setNote("");
        ingRef.current?.focus();
      } else onClose();
    } catch (err) {
      setQtyErr(err instanceof Error ? err.message : "Gagal menyimpan.");
      qtyRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void save(false);
  }

  const option = (i: IngredientDto) => {
    const st = stockStatus(i);
    return (
      <option key={i.id} value={i.id}>
        {i.name} — sisa {fmtQty(i.stockQty, i.unit)}
        {st !== "AMAN" ? " · " + STOCK_BADGE[st].label.toLowerCase() : ""}
      </option>
    );
  };

  return (
    <>
      <div className="l-staf-dialog-head">
        <div>
          <h2 id="stok-c-title">Catat bahan masuk</h2>
          <p>
            Tambahkan stok saat bahan datang dari pemasok atau hasil belanja.
          </p>
        </div>
        <button
          className="l-staf-iconbtn"
          type="button"
          aria-label="Tutup"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <form
        className="l-staf-dialog-body"
        id="stok-c-form"
        noValidate
        onSubmit={onSubmit}
      >
        <div className="sk-form">
          <div className="l-staf-field sk-span">
            <label htmlFor="stok-c-ing">Bahan</label>
            <select
              ref={ingRef}
              className="l-staf-select"
              id="stok-c-ing"
              value={ingId}
              data-autofocus={!initialId || undefined}
              onChange={(e) => {
                setIngId(e.target.value);
                setQtyErr("");
              }}
            >
              {low.length ? (
                <optgroup label="Perlu restock">{low.map(option)}</optgroup>
              ) : null}
              {ok.length ? (
                <optgroup label="Stok aman">{ok.map(option)}</optgroup>
              ) : null}
            </select>
          </div>
          <div className="l-staf-field">
            <label htmlFor="stok-c-qty">Jumlah masuk</label>
            <div className="l-staf-affix">
              <input
                ref={qtyRef}
                id="stok-c-qty"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="0"
                aria-describedby="stok-c-qty-hint stok-c-qty-err"
                aria-invalid={qtyErr ? true : undefined}
                data-autofocus={!!initialId || undefined}
                value={qty}
                onChange={(e) => {
                  setQty(e.target.value);
                  if (parseFloat(e.target.value) > 0) setQtyErr("");
                }}
              />
              <span>{ing ? UNIT_NAME[ing.unit] : ""}</span>
            </div>
            <div className="sk-quick" role="group" aria-label="Jumlah cepat">
              {ing
                ? QUICK[ing.unit].map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={parseFloat(qty) === v}
                      onClick={() => {
                        setQty(String(v));
                        setQtyErr("");
                        qtyRef.current?.focus();
                      }}
                    >
                      {fmtQty(v, ing.unit)}
                    </button>
                  ))
                : null}
            </div>
            <p className="l-staf-hint" id="stok-c-qty-hint">
              {ing ? UNIT_HINT[ing.unit] : ""}
            </p>
            <p className="l-staf-error" id="stok-c-qty-err" hidden={!qtyErr}>
              {qtyErr}
            </p>
          </div>
          <div className="l-staf-field">
            <label htmlFor="stok-c-date">Tanggal masuk</label>
            <input
              ref={dateRef}
              className="l-staf-input"
              type="date"
              id="stok-c-date"
              max={today}
              aria-describedby="stok-c-date-err"
              aria-invalid={dateErr ? true : undefined}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setDateErr("");
              }}
            />
            <p className="l-staf-error" id="stok-c-date-err" hidden={!dateErr}>
              {dateErr}
            </p>
          </div>
          <div className="l-staf-field sk-span">
            <label htmlFor="stok-c-note">
              Catatan / pemasok <span className="sk-opt">(opsional)</span>
            </label>
            <input
              className="l-staf-input"
              id="stok-c-note"
              list="stok-note-list"
              maxLength={80}
              autoComplete="off"
              placeholder="mis. Pemasok susu — CV Sapi Murni"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <datalist id="stok-note-list">
              {notes.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div className="sk-span sk-preview" aria-live="polite">
            {ing ? (
              <Preview
                ing={ing}
                qty={parseFloat(qty)}
                ingredients={ingredients}
                menus={menus}
                recipes={recipes}
              />
            ) : null}
          </div>
        </div>
      </form>
      <div className="l-staf-dialog-foot">
        <button
          className="l-staf-btn"
          data-variant="ghost"
          type="button"
          onClick={onClose}
        >
          Batal
        </button>
        <span className="sk-grow" />
        <button
          className="l-staf-btn"
          type="button"
          disabled={record.isPending}
          onClick={() => void save(true)}
        >
          Simpan &amp; catat lagi
        </button>
        <button
          className="l-staf-btn"
          data-variant="primary"
          type="submit"
          form="stok-c-form"
          disabled={record.isPending}
        >
          Simpan
        </button>
      </div>
    </>
  );
}

function Preview({
  ing,
  qty,
  ingredients,
  menus,
  recipes,
}: {
  ing: IngredientDto;
  qty: number;
  ingredients: IngredientDto[];
  menus: MenuDto[];
  recipes: RecipeItemDto[];
}) {
  const st0 = stockStatus(ing);
  if (!(qty > 0)) {
    return (
      <>
        <div>
          <span className="sk-pv-lbl">Stok</span>
          <div className="sk-pv-flow">
            {fmtQty(ing.stockQty, ing.unit)}
            <span className="sk-pv-arrow" aria-hidden="true">
              →
            </span>
            <span className="sk-pv-wait">…</span>
          </div>
        </div>
        <div className="sk-pv-chips">
          <StatusChip status={st0} />
        </div>
        <p className="sk-pv-note" data-tone="muted">
          Isi jumlah untuk melihat stok setelah dicatat.
        </p>
      </>
    );
  }
  const after = r2(ing.stockQty + qty);
  const st1 = stockStatus({ stockQty: after, minStock: ing.minStock });
  const store = { menus, recipeItems: recipes, ingredients };
  const usesIt = new Set(
    recipes.filter((r) => r.ingredientId === ing.id).map((r) => r.menuId),
  );
  const blockedNow = blockedMenuIds(store);
  const blockedAfter = blockedMenuIds(store, (id) =>
    id === ing.id ? after : ingredients.find((i) => i.id === id)?.stockQty,
  );
  const back = menus.filter(
    (m) =>
      usesIt.has(m.id) &&
      blockedNow.includes(m.id) &&
      !blockedAfter.includes(m.id),
  );
  return (
    <>
      <div>
        <span className="sk-pv-lbl">Stok</span>
        <div className="sk-pv-flow">
          {fmtQty(ing.stockQty, ing.unit)}
          <span className="sk-pv-arrow" aria-hidden="true">
            →
          </span>
          <span className="sk-sr"> menjadi </span>
          {fmtQty(after, ing.unit)}
        </div>
      </div>
      <div className="sk-pv-chips">
        <StatusChip status={st0} />
        {st1 !== st0 ? (
          <>
            <span aria-hidden="true">→</span>
            <span className="sk-sr">menjadi</span>
            <StatusChip status={st1} />
          </>
        ) : null}
      </div>
      {back.length ? (
        <p className="sk-pv-note">
          <CircleCheck aria-hidden="true" style={{ fontSize: 15 }} />
          {joinList(back.map((m) => m.name))} bisa dipesan lagi
        </p>
      ) : null}
      {st1 === "MENIPIS" ? (
        <p className="sk-pv-note" data-tone="warning">
          <TriangleAlert aria-hidden="true" style={{ fontSize: 15 }} />
          Masih di bawah batas minimum ({fmtQty(ing.minStock, ing.unit)}).
        </p>
      ) : null}
    </>
  );
}
