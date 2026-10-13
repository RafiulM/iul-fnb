import { useRef, useState, type FormEvent } from "react";
import { Bell, X } from "lucide-react";
import { fmtQty, stockStatus } from "@starter/shared/fnb/domain";
import type { IngredientDto, StockUnit } from "@starter/shared/fnb/types";
import { Dialog } from "@/components/fnb/dialog";
import { useCreateIngredient, useUpdateIngredient } from "../hooks";
import { UNIT_NAME, UNITS } from "../ledger";
import { StatusChip } from "./stock-ui";

const cleanName = (v: string) => v.trim().replace(/\s+/g, " ");
const nameTaken = (list: IngredientDto[], name: string, exceptId?: string) =>
  list.some(
    (x) => x.id !== exceptId && x.name.toLowerCase() === name.toLowerCase(),
  );

function DialogHead({
  id,
  title,
  sub,
  onClose,
}: {
  id: string;
  title: string;
  sub: string;
  onClose: () => void;
}) {
  return (
    <div className="l-staf-dialog-head">
      <div>
        <h2 id={id}>{title}</h2>
        <p>{sub}</p>
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
  );
}

function UnitSelect({
  id,
  value,
  onChange,
  describedBy,
}: {
  id: string;
  value: StockUnit;
  onChange: (unit: StockUnit) => void;
  describedBy?: string;
}) {
  return (
    <select
      className="l-staf-select"
      id={id}
      aria-describedby={describedBy}
      value={value}
      onChange={(e) => onChange(e.target.value as StockUnit)}
    >
      {UNITS.map((u) => (
        <option key={u.value} value={u.value}>
          {u.label}
        </option>
      ))}
    </select>
  );
}

/* ---------- Tambah bahan (pemilik) ---------- */

export function AddIngredientDialog({
  open,
  onClose,
  ingredients,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  ingredients: IngredientDto[];
  onCreated: (ing: IngredientDto, movementId: string | null) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="stok-a-title"
      data-part="add"
    >
      {open ? (
        <AddForm
          onClose={onClose}
          ingredients={ingredients}
          onCreated={onCreated}
        />
      ) : null}
    </Dialog>
  );
}

function AddForm({
  onClose,
  ingredients,
  onCreated,
}: {
  onClose: () => void;
  ingredients: IngredientDto[];
  onCreated: (ing: IngredientDto, movementId: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<StockUnit>("gram");
  const [stock, setStock] = useState("");
  const [min, setMin] = useState("");
  const [err, setErr] = useState({ name: "", stock: "", min: "" });
  const nameRef = useRef<HTMLInputElement>(null);
  const stockRef = useRef<HTMLInputElement>(null);
  const minRef = useRef<HTMLInputElement>(null);
  const create = useCreateIngredient();

  const s = stock === "" ? 0 : parseFloat(stock);
  const m = parseFloat(min);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (create.isPending) return;
    const n = cleanName(name);
    const next = { name: "", stock: "", min: "" };
    let bad: HTMLInputElement | null = null;
    if (!n) {
      next.name = "Isi nama bahan dulu.";
      bad ??= nameRef.current;
    } else if (nameTaken(ingredients, n)) {
      next.name = "Bahan dengan nama ini sudah ada.";
      bad ??= nameRef.current;
    }
    if (!(s >= 0)) {
      next.stock = "Stok awal tidak boleh minus.";
      bad ??= stockRef.current;
    }
    if (!(m >= 0)) {
      next.min = "Isi batas minimum (boleh 0).";
      bad ??= minRef.current;
    }
    setErr(next);
    if (bad) {
      bad.focus();
      return;
    }
    try {
      const res = await create.mutateAsync({
        name: n,
        unit,
        stockQty: s,
        minStock: m,
      });
      onCreated(res.ingredient, res.movement?.id ?? null);
      onClose();
    } catch (error) {
      setErr({
        ...next,
        name: error instanceof Error ? error.message : "Gagal menyimpan.",
      });
      nameRef.current?.focus();
    }
  }

  return (
    <>
      <DialogHead
        id="stok-a-title"
        title="Tambah bahan"
        sub="Daftarkan bahan baru yang ingin dipantau stoknya."
        onClose={onClose}
      />
      <form
        className="l-staf-dialog-body"
        id="stok-a-form"
        noValidate
        onSubmit={onSubmit}
      >
        <div className="sk-form">
          <div className="l-staf-field sk-span">
            <label htmlFor="stok-a-name">Nama bahan</label>
            <input
              ref={nameRef}
              className="l-staf-input"
              id="stok-a-name"
              maxLength={40}
              autoComplete="off"
              placeholder="mis. Sirup vanila"
              data-autofocus
              aria-describedby="stok-a-name-err"
              aria-invalid={err.name ? true : undefined}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErr((x) => ({ ...x, name: "" }));
              }}
            />
            <p className="l-staf-error" id="stok-a-name-err" hidden={!err.name}>
              {err.name}
            </p>
          </div>
          <div className="l-staf-field">
            <label htmlFor="stok-a-unit">Satuan</label>
            <UnitSelect id="stok-a-unit" value={unit} onChange={setUnit} />
          </div>
          <div className="l-staf-field">
            <label htmlFor="stok-a-stock">Stok awal</label>
            <div className="l-staf-affix">
              <input
                ref={stockRef}
                id="stok-a-stock"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="0"
                aria-describedby="stok-a-stock-err"
                aria-invalid={err.stock ? true : undefined}
                value={stock}
                onChange={(e) => {
                  const v = e.target.value;
                  setStock(v);
                  if (v === "" || parseFloat(v) >= 0)
                    setErr((x) => ({ ...x, stock: "" }));
                }}
              />
              <span>{UNIT_NAME[unit]}</span>
            </div>
            <p
              className="l-staf-error"
              id="stok-a-stock-err"
              hidden={!err.stock}
            >
              {err.stock}
            </p>
          </div>
          <div className="l-staf-field sk-span">
            <label htmlFor="stok-a-min">Batas minimum</label>
            <div className="l-staf-affix">
              <input
                ref={minRef}
                id="stok-a-min"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="0"
                aria-describedby="stok-a-min-help stok-a-min-err"
                aria-invalid={err.min ? true : undefined}
                value={min}
                onChange={(e) => {
                  const v = e.target.value;
                  setMin(v);
                  if (v !== "" && parseFloat(v) >= 0)
                    setErr((x) => ({ ...x, min: "" }));
                }}
              />
              <span>{UNIT_NAME[unit]}</span>
            </div>
            <p className="l-staf-error" id="stok-a-min-err" hidden={!err.min}>
              {err.min}
            </p>
            <div
              className="l-staf-alert sk-helper"
              data-tone="neutral"
              id="stok-a-min-help"
            >
              <Bell aria-hidden="true" />
              <span>
                Saat sisa stok sama dengan atau di bawah angka ini, bahan
                ditandai <strong>Menipis</strong> dan peringatan muncul di layar
                kasir &amp; pemilik.
              </span>
            </div>
          </div>
          <div className="sk-span sk-status-line" aria-live="polite">
            {s >= 0 && m >= 0 ? (
              <>
                <span>Status awal:</span>
                <StatusChip
                  status={stockStatus({ stockQty: s, minStock: m })}
                />
                <span>
                  sisa {fmtQty(s, unit)}, batas {fmtQty(m, unit)}
                </span>
              </>
            ) : (
              <span>
                Isi stok awal &amp; batas minimum untuk melihat status awal.
              </span>
            )}
          </div>
        </div>
      </form>
      <div className="l-staf-dialog-foot">
        <p className="l-staf-hint sk-foot-hint">
          Bahan baru belum terhubung ke resep menu, jadi belum berkurang
          otomatis saat ada penjualan.
        </p>
        <button
          className="l-staf-btn"
          data-variant="ghost"
          type="button"
          onClick={onClose}
        >
          Batal
        </button>
        <button
          className="l-staf-btn"
          data-variant="primary"
          type="submit"
          form="stok-a-form"
          disabled={create.isPending}
        >
          Tambah
        </button>
      </div>
    </>
  );
}

/* ---------- Ubah bahan (pemilik) ---------- */

export function EditIngredientDialog({
  ingredient,
  onClose,
  ingredients,
  onSaved,
}: {
  /** null = closed. */
  ingredient: IngredientDto | null;
  onClose: () => void;
  ingredients: IngredientDto[];
  onSaved: (ing: IngredientDto, statusChanged: boolean) => void;
}) {
  return (
    <Dialog
      open={!!ingredient}
      onClose={onClose}
      size="sm"
      labelledBy="stok-e-title"
      data-part="edit"
    >
      {ingredient ? (
        <EditForm
          key={ingredient.id}
          ing={ingredient}
          onClose={onClose}
          ingredients={ingredients}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function EditForm({
  ing,
  onClose,
  ingredients,
  onSaved,
}: {
  ing: IngredientDto;
  onClose: () => void;
  ingredients: IngredientDto[];
  onSaved: (ing: IngredientDto, statusChanged: boolean) => void;
}) {
  const [name, setName] = useState(ing.name);
  const [unit, setUnit] = useState<StockUnit>(ing.unit);
  const [min, setMin] = useState(String(ing.minStock));
  const [err, setErr] = useState({ name: "", min: "" });
  // The subtitle shows the ingredient as it was when the dialog opened.
  const [sub] = useState(
    () => `${ing.name} · sisa ${fmtQty(ing.stockQty, ing.unit)}`,
  );
  const nameRef = useRef<HTMLInputElement>(null);
  const minRef = useRef<HTMLInputElement>(null);
  const update = useUpdateIngredient();
  const m = parseFloat(min);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (update.isPending) return;
    const n = cleanName(name);
    const next = { name: "", min: "" };
    let bad: HTMLInputElement | null = null;
    if (!n) {
      next.name = "Nama bahan tidak boleh kosong.";
      bad ??= nameRef.current;
    } else if (nameTaken(ingredients, n, ing.id)) {
      next.name = "Bahan dengan nama ini sudah ada.";
      bad ??= nameRef.current;
    }
    if (!(m >= 0)) {
      next.min = "Isi batas minimum (boleh 0).";
      bad ??= minRef.current;
    }
    setErr(next);
    if (bad) {
      bad.focus();
      return;
    }
    try {
      const res = await update.mutateAsync({
        before: ing,
        input: { name: n, unit, minStock: m },
      });
      onSaved(res.ingredient, stockStatus(res.ingredient) !== res.before);
      onClose();
    } catch (error) {
      setErr({
        ...next,
        name: error instanceof Error ? error.message : "Gagal menyimpan.",
      });
      nameRef.current?.focus();
    }
  }

  return (
    <>
      <DialogHead
        id="stok-e-title"
        title="Ubah bahan"
        sub={sub}
        onClose={onClose}
      />
      <form
        className="l-staf-dialog-body"
        id="stok-e-form"
        noValidate
        onSubmit={onSubmit}
      >
        <div
          className="sk-form"
          style={{ gridTemplateColumns: "minmax(0,1fr)" }}
        >
          <div className="l-staf-field">
            <label htmlFor="stok-e-name">Nama bahan</label>
            <input
              ref={nameRef}
              className="l-staf-input"
              id="stok-e-name"
              maxLength={40}
              autoComplete="off"
              aria-describedby="stok-e-name-err"
              aria-invalid={err.name ? true : undefined}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErr((x) => ({ ...x, name: "" }));
              }}
            />
            <p className="l-staf-error" id="stok-e-name-err" hidden={!err.name}>
              {err.name}
            </p>
          </div>
          <div className="l-staf-field">
            <label htmlFor="stok-e-unit">Satuan</label>
            <UnitSelect
              id="stok-e-unit"
              value={unit}
              onChange={setUnit}
              describedBy="stok-e-unit-warn"
            />
            <p
              className="sk-unit-warn"
              id="stok-e-unit-warn"
              hidden={unit === ing.unit}
            >
              Angka stok &amp; resep tidak ikut dikonversi. Ganti satuan hanya
              jika sebelumnya salah pilih.
            </p>
          </div>
          <div className="l-staf-field">
            <label htmlFor="stok-e-min">Batas minimum</label>
            <div className="l-staf-affix">
              <input
                ref={minRef}
                id="stok-e-min"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                data-autofocus
                aria-describedby="stok-e-min-help stok-e-min-err"
                aria-invalid={err.min ? true : undefined}
                value={min}
                onChange={(e) => {
                  setMin(e.target.value);
                  if (parseFloat(e.target.value) >= 0)
                    setErr((x) => ({ ...x, min: "" }));
                }}
              />
              <span>{UNIT_NAME[unit]}</span>
            </div>
            <p className="l-staf-error" id="stok-e-min-err" hidden={!err.min}>
              {err.min}
            </p>
            <p className="l-staf-hint" id="stok-e-min-help">
              Bahan ditandai <strong>Menipis</strong> saat sisa stok sama dengan
              atau di bawah angka ini.
            </p>
          </div>
          <div className="sk-status-line" aria-live="polite">
            {m >= 0 ? (
              <>
                <span>
                  Dengan batas ini, sisa {fmtQty(ing.stockQty, unit)} berstatus
                </span>
                <StatusChip
                  status={stockStatus({ stockQty: ing.stockQty, minStock: m })}
                />
              </>
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
        <button
          className="l-staf-btn"
          data-variant="primary"
          type="submit"
          form="stok-e-form"
          disabled={update.isPending}
        >
          Simpan
        </button>
      </div>
    </>
  );
}
