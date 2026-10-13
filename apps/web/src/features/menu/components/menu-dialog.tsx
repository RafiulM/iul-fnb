import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Check,
  Package,
  Plus,
  StickyNote,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { fmtQty, STOCK_BADGE, stockStatus } from "@starter/shared/fnb/domain";
import type {
  IngredientDto,
  MenuCategoryDto,
  MenuDto,
  RecipeItemDto,
} from "@starter/shared/fnb/types";
import { Dialog, useToast } from "@/components/fnb/dialog";
import { useSaveMenu } from "../hooks";
import { TAG_TONE } from "./menu-tab";
import { errorMessage, errorStatus } from "./page-state";

const TAG_LIST = Object.keys(TAG_TONE);
const EMOJIS = [
  "🍽️",
  "🍳",
  "🍗",
  "🍜",
  "🍱",
  "🍖",
  "🍛",
  "🍝",
  "🍲",
  "🥗",
  "🍔",
  "🥟",
  "☕",
  "🧊",
  "🍵",
  "🥤",
  "🧋",
  "🍋",
  "🥑",
  "🍹",
  "🥛",
  "🍟",
  "🍌",
  "🍞",
  "🥐",
  "🍰",
  "🧁",
  "🍩",
  "🍪",
  "💧",
];
const UPLOAD_SOON = "Prototipe: unggah foto belum aktif — pakai ikon dulu, ya";

const fmtNum = (n: number) =>
  n.toLocaleString("id-ID", { maximumFractionDigits: 2 });

/** "18" → 18, "0,5" → 0.5, "1.000" → 1000 (Indonesian number format) */
function parseQty(s: string) {
  let v = s.trim().replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) v = v.replace(/\./g, "");
  v = v.replace(",", ".");
  return /^\d*\.?\d+$/.test(v) ? parseFloat(v) : NaN;
}

let rowKey = 0;
const newRowKey = () => ++rowKey;

export type MenuDialogTarget = { id: string | null; presetCat?: string };

export function MenuDialog({
  target,
  onClose,
  ...props
}: {
  target: MenuDialogTarget | null;
  onClose: () => void;
} & Omit<MenuFormProps, "target" | "onClose">) {
  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      size="lg"
      labelledBy="menu-meja-mm-title"
    >
      {target && <MenuForm target={target} onClose={onClose} {...props} />}
    </Dialog>
  );
}

type RecipeRow = { key: number; ing: string; qty: string };
type RowError = { msg: string; field: "ing" | "qty" };
type FieldErrors = { name?: string; cat?: string; price?: string };

type MenuFormProps = {
  target: MenuDialogTarget;
  menus: MenuDto[];
  categories: MenuCategoryDto[];
  ingredients: IngredientDto[];
  recipeItems: RecipeItemDto[];
  /** Category filter on the Menu tab, the default for a new menu. */
  filterCat: string;
  onClose: () => void;
  onSaved: (menu: MenuDto, isNew: boolean) => void;
  onDelete: (menu: MenuDto) => void;
};

function MenuForm({
  target,
  menus,
  categories,
  ingredients,
  recipeItems,
  filterCat,
  onClose,
  onSaved,
  onDelete,
}: MenuFormProps) {
  const toast = useToast();
  const save = useSaveMenu();
  const m = target.id ? menus.find((x) => x.id === target.id) : undefined;
  const catExists = (id?: string) =>
    !!id && categories.some((c) => c.id === id);

  const [emoji, setEmoji] = useState(m ? m.imageUrl : "🍽️");
  // The grid keeps a custom emoji in front, like the prototype.
  const [emojiList] = useState(() =>
    EMOJIS.includes(emoji) ? EMOJIS : [emoji, ...EMOJIS.slice(0, -1)],
  );
  const [tags, setTags] = useState<string[]>(m ? [...m.tags] : []);
  const [name, setName] = useState(m?.name ?? "");
  const [catId, setCatId] = useState(() => {
    if (m) return m.categoryId;
    const preset = target.presetCat;
    if (preset && catExists(preset)) return preset;
    return catExists(filterCat) ? filterCat : (categories[0]?.id ?? "");
  });
  const [price, setPrice] = useState(
    m ? Math.round(m.price).toLocaleString("id-ID") : "",
  );
  const [desc, setDesc] = useState(m?.description ?? "");
  const [avail, setAvail] = useState(m ? m.isAvailable : true);
  const [rows, setRows] = useState<RecipeRow[]>(() =>
    m
      ? recipeItems
          .filter((r) => r.menuId === m.id)
          .map((r) => ({
            key: newRowKey(),
            ing: r.ingredientId,
            qty: fmtNum(r.qtyUsed),
          }))
      : [],
  );
  const [errs, setErrs] = useState<FieldErrors>({});
  const [rowErrs, setRowErrs] = useState<Record<number, RowError>>({});
  const [over, setOver] = useState(false);

  const ingById = new Map(ingredients.map((i) => [i.id, i]));
  const ingSorted = [...ingredients].sort((a, b) =>
    a.name.localeCompare(b.name, "id"),
  );

  /* ----- Price: thousands separators while typing, caret kept in place ----- */
  const priceRef = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = priceRef.current;
    if (caret.current == null || !el || document.activeElement !== el) return;
    try {
      el.setSelectionRange(caret.current, caret.current);
    } catch {
      /* ignore */
    }
    caret.current = null;
  }, [price]);
  function onPrice(el: HTMLInputElement) {
    const pos = el.selectionStart ?? 0;
    const before = el.value.slice(0, pos).replace(/\D/g, "").length;
    const d = el.value
      .replace(/\D/g, "")
      .replace(/^0+(?=\d)/, "")
      .slice(0, 9);
    const v = d ? Number(d).toLocaleString("id-ID") : "";
    let i = 0;
    let seen = 0;
    while (i < v.length && seen < before) {
      if (/\d/.test(v[i] ?? "")) seen++;
      i++;
    }
    caret.current = i;
    setPrice(v);
    setErrs((e) => ({ ...e, price: undefined }));
  }

  /* ----- Recipe rows ----- */
  const focusAfter = useRef<string | null>(null);
  useEffect(() => {
    if (!focusAfter.current) return;
    document.getElementById(focusAfter.current)?.focus();
    focusAfter.current = null;
  }, [rows]);
  const clearRowErr = (key: number) =>
    setRowErrs((e) => {
      if (!(key in e)) return e;
      const n = { ...e };
      delete n[key];
      return n;
    });
  function updateRow(key: number, p: Partial<RecipeRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
    clearRowErr(key);
  }
  function addRow() {
    focusAfter.current = `menu-meja-rec-ing-${rows.length}`;
    setRows((rs) => [...rs, { key: newRowKey(), ing: "", qty: "" }]);
  }
  function deleteRow(i: number) {
    const left = rows.length - 1;
    focusAfter.current =
      left === 0
        ? "menu-meja-rec-add"
        : `menu-meja-rec-ing-${Math.min(i, left - 1)}`;
    setRows((rs) => rs.filter((_, j) => j !== i));
  }

  /* ----- Capacity: servings left with today's stock ----- */
  const capRows = rows
    .map((r) => ({ ing: ingById.get(r.ing), qty: parseQty(r.qty) }))
    .filter(
      (r): r is { ing: IngredientDto; qty: number } => !!r.ing && r.qty > 0,
    );
  let cap: { tone: "" | "warning" | "danger"; body: ReactNode };
  if (!capRows.length) {
    cap = {
      tone: "",
      body: (
        <>
          <StickyNote aria-hidden="true" style={{ fontSize: 15 }} />
          <span>
            Belum ada bahan. Menu tanpa resep tidak mengurangi stok saat
            terjual.
          </span>
        </>
      ),
    };
  } else {
    let min = Infinity;
    let lim: IngredientDto | null = null;
    for (const r of capRows) {
      const n = Math.floor(r.ing.stockQty / r.qty);
      if (n < min) {
        min = n;
        lim = r.ing;
      }
    }
    const limName = lim?.name ?? "";
    cap =
      min <= 0
        ? {
            tone: "danger",
            body: (
              <>
                <TriangleAlert aria-hidden="true" style={{ fontSize: 15 }} />
                <span>
                  Stok <b>{limName}</b>{" "}
                  {lim && stockStatus(lim) === "HABIS"
                    ? "habis"
                    : "tidak cukup"}{" "}
                  — menu ini belum bisa dibuat. Tandai habis atau catat bahan
                  masuk di Stok Bahan.
                </span>
              </>
            ),
          }
        : {
            tone: min < 10 ? "warning" : "",
            body: (
              <>
                {min < 10 ? (
                  <TriangleAlert aria-hidden="true" style={{ fontSize: 15 }} />
                ) : (
                  <Package aria-hidden="true" style={{ fontSize: 15 }} />
                )}
                <span>
                  Dengan stok sekarang, cukup untuk ±{" "}
                  <b>{min.toLocaleString("id-ID")} porsi</b> lagi (paling cepat
                  habis: {limName}).
                </span>
              </>
            ),
          };
  }

  /* ----- Submit ----- */
  async function submit(e: FormEvent) {
    e.preventDefault();
    const fe: FieldErrors = {};
    const re: Record<number, RowError> = {};
    const bad: string[] = [];
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) fe.name = "Nama menu wajib diisi.";
    else if (
      menus.some(
        (x) =>
          x.id !== target.id &&
          x.name.trim().toLowerCase() === clean.toLowerCase(),
      )
    )
      fe.name = `Sudah ada menu bernama “${clean}”. Pakai nama lain.`;
    if (fe.name) bad.push("menu-meja-f-name");
    if (!catExists(catId)) {
      fe.cat = "Pilih kategori.";
      bad.push("menu-meja-f-cat");
    }
    const priceNum = Number(price.replace(/\D/g, "")) || 0;
    if (priceNum <= 0) {
      fe.price = "Isi harga lebih dari Rp 0.";
      bad.push("menu-meja-f-price");
    }
    const seen = new Set<string>();
    rows.forEach((r, i) => {
      const ing = ingById.get(r.ing);
      const q = parseQty(r.qty);
      let err: RowError | null = null;
      if (!ing)
        err = { msg: "Pilih bahan, atau hapus baris ini.", field: "ing" };
      else if (seen.has(ing.id))
        err = {
          msg: `${ing.name} sudah ada di resep — gabungkan jumlahnya di satu baris.`,
          field: "ing",
        };
      else if (!(q > 0))
        err = {
          msg: `Isi jumlah ${ing.unit} per porsi (lebih dari 0).`,
          field: "qty",
        };
      if (ing) seen.add(ing.id);
      if (err) {
        re[r.key] = err;
        bad.push(`menu-meja-rec-${err.field}-${i}`);
      }
    });
    setErrs(fe);
    setRowErrs(re);
    if (bad[0]) {
      document.getElementById(bad[0])?.focus();
      toast("Periksa lagi isian yang ditandai merah");
      return;
    }
    try {
      const saved = await save.mutateAsync({
        id: m?.id ?? null,
        input: {
          name: clean,
          categoryId: catId,
          price: priceNum,
          description: desc.trim(),
          imageUrl: emoji,
          tags: TAG_LIST.filter((t) => tags.includes(t)),
          isAvailable: avail,
        },
        recipe: rows.map((r) => ({
          ingredientId: r.ing,
          qtyUsed: parseQty(r.qty),
        })),
      });
      onSaved(saved, !m);
    } catch (err) {
      if (errorStatus(err) === 409) {
        setErrs({ name: errorMessage(err) });
        document.getElementById("menu-meja-f-name")?.focus();
      } else toast(errorMessage(err));
    }
  }

  const dropProps = {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      setOver(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setOver(false);
      toast(UPLOAD_SOON);
    },
  };

  return (
    <form className="mm-form" noValidate onSubmit={submit}>
      <div className="l-staf-dialog-head">
        <div>
          <h2 id="menu-meja-mm-title">{m ? "Ubah menu" : "Tambah menu"}</h2>
          <p>
            {m
              ? "Perubahan langsung tampil di aplikasi pelanggan & layar kasir."
              : "Menu baru langsung tampil di aplikasi pelanggan setelah disimpan."}
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
      <div className="l-staf-dialog-body">
        <div className="mm-mgrid">
          <div className="mm-photo">
            <div className="mm-photo-prev">
              <span aria-hidden="true">{emoji}</span>
              <small>Pratinjau</small>
            </div>
            <button
              type="button"
              className="mm-drop"
              data-over={over ? "" : undefined}
              onClick={() => toast(UPLOAD_SOON)}
              {...dropProps}
            >
              <Upload aria-hidden="true" style={{ fontSize: 20 }} />
              <strong>Unggah foto</strong>
              <small>
                Seret ke sini atau klik
                <br />
                JPG/PNG, maks. 2 MB
              </small>
            </button>
            <div>
              <p className="mm-sublabel" id="menu-meja-emo-lbl">
                Atau pakai ikon sementara
              </p>
              <div
                className="mm-emoji"
                role="group"
                aria-labelledby="menu-meja-emo-lbl"
              >
                {emojiList.map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-pressed={e === emoji}
                    aria-label={`Pakai ikon ${e}`}
                    onClick={() => setEmoji(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mm-fgrid">
            <div className="l-staf-field mm-span2">
              <label htmlFor="menu-meja-f-name">Nama menu</label>
              <input
                data-autofocus
                className="l-staf-input"
                id="menu-meja-f-name"
                maxLength={60}
                autoComplete="off"
                placeholder="Contoh: Nasi Goreng Kampung"
                aria-describedby="menu-meja-f-name-err"
                aria-invalid={errs.name ? true : undefined}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrs((x) => ({ ...x, name: undefined }));
                }}
              />
              <p
                className="l-staf-error"
                id="menu-meja-f-name-err"
                hidden={!errs.name}
              >
                {errs.name}
              </p>
            </div>
            <div className="l-staf-field">
              <label htmlFor="menu-meja-f-cat">Kategori</label>
              <select
                className="l-staf-select"
                id="menu-meja-f-cat"
                aria-describedby="menu-meja-f-cat-err"
                aria-invalid={errs.cat ? true : undefined}
                value={catId}
                onChange={(e) => {
                  setCatId(e.target.value);
                  setErrs((x) => ({ ...x, cat: undefined }));
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p
                className="l-staf-error"
                id="menu-meja-f-cat-err"
                hidden={!errs.cat}
              >
                {errs.cat}
              </p>
            </div>
            <div className="l-staf-field">
              <label htmlFor="menu-meja-f-price">Harga</label>
              <div
                className="l-staf-affix"
                aria-invalid={errs.price ? true : undefined}
              >
                <span>Rp</span>
                <input
                  ref={priceRef}
                  id="menu-meja-f-price"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  aria-describedby="menu-meja-f-price-err"
                  aria-invalid={errs.price ? true : undefined}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                  value={price}
                  onChange={(e) => onPrice(e.target)}
                />
              </div>
              <p
                className="l-staf-error"
                id="menu-meja-f-price-err"
                hidden={!errs.price}
              >
                {errs.price}
              </p>
            </div>
            <div className="l-staf-field mm-span2">
              <label htmlFor="menu-meja-f-desc">
                Deskripsi <span className="mm-opt">(opsional)</span>
              </label>
              <textarea
                className="l-staf-textarea"
                id="menu-meja-f-desc"
                rows={2}
                maxLength={140}
                placeholder="Ceritakan singkat isi & rasanya, mis. “Espresso, susu segar, dan gula aren asli.”"
                aria-describedby="menu-meja-desc-count"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
              <p className="l-staf-hint mm-count" id="menu-meja-desc-count">
                <span>{desc.length}</span>/140
              </p>
            </div>
            <div className="l-staf-field mm-span2">
              <span className="l-staf-label-text" id="menu-meja-tag-lbl">
                Label
              </span>
              <div
                className="mm-chips"
                role="group"
                aria-labelledby="menu-meja-tag-lbl"
              >
                {TAG_LIST.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="mm-chip"
                    data-tone={TAG_TONE[t]}
                    aria-pressed={tags.includes(t)}
                    onClick={() =>
                      setTags((ts) =>
                        ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t],
                      )
                    }
                  >
                    <i aria-hidden="true" />
                    {t}
                    <Check
                      className="mm-chk"
                      aria-hidden="true"
                      style={{ fontSize: 14 }}
                    />
                  </button>
                ))}
              </div>
              <p className="l-staf-hint">
                Label tampil di kartu menu pelanggan. Boleh lebih dari satu.
              </p>
            </div>
            <div className="mm-switch-row mm-span2">
              <label className="l-staf-switch">
                <input
                  type="checkbox"
                  role="switch"
                  id="menu-meja-f-avail"
                  checked={avail}
                  onChange={(e) => setAvail(e.target.checked)}
                />
                <span />
              </label>
              <label htmlFor="menu-meja-f-avail">
                <strong>Tersedia untuk dipesan</strong>
                <small>
                  {avail
                    ? "Pelanggan bisa memesan menu ini."
                    : "Tampil sebagai “Habis” — pelanggan tidak bisa memesannya."}
                </small>
              </label>
            </div>
          </div>
        </div>

        <section className="mm-recipe" aria-labelledby="menu-meja-rec-title">
          <div className="mm-recipe-head">
            <div>
              <h3 id="menu-meja-rec-title">Resep — untuk stok otomatis</h3>
              <p>Stok bahan berkurang otomatis setiap menu ini terjual.</p>
            </div>
            <span className="l-staf-chip" data-tone="plain">
              {rows.length ? `${rows.length} bahan` : "Belum ada bahan"}
            </span>
          </div>
          <div className="mm-rec-cols" aria-hidden="true" hidden={!rows.length}>
            <span>Bahan</span>
            <span>Jumlah per porsi</span>
            <span />
          </div>
          <div className="mm-rec-list">
            {rows.map((r, i) => {
              const ing = ingById.get(r.ing);
              const err = rowErrs[r.key];
              const errId = `menu-meja-rec-err-${i}`;
              const badge = ing ? STOCK_BADGE[stockStatus(ing)] : null;
              return (
                <div className="mm-rec-row" key={r.key}>
                  <div className="mm-rec-ing">
                    <select
                      className="l-staf-select"
                      id={`menu-meja-rec-ing-${i}`}
                      aria-label={`Bahan ke-${i + 1}`}
                      aria-describedby={errId}
                      aria-invalid={err?.field === "ing" ? true : undefined}
                      value={r.ing}
                      onChange={(e) =>
                        updateRow(r.key, { ing: e.target.value })
                      }
                    >
                      <option value="">Pilih bahan…</option>
                      {ingSorted.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                          {stockStatus(x) === "HABIS" ? " (stok habis)" : ""}
                        </option>
                      ))}
                    </select>
                    <span className="mm-rec-meta">
                      {ing && badge ? (
                        <>
                          <span>Stok {fmtQty(ing.stockQty, ing.unit)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="mm-st" data-tone={badge.tone}>
                            {badge.label}
                          </span>
                        </>
                      ) : (
                        "Pilih bahan dari daftar stok"
                      )}
                    </span>
                  </div>
                  <div
                    className="l-staf-affix mm-rec-qty"
                    aria-invalid={err?.field === "qty" ? true : undefined}
                  >
                    <input
                      type="text"
                      id={`menu-meja-rec-qty-${i}`}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      aria-label={`Jumlah bahan ke-${i + 1} per porsi`}
                      aria-describedby={errId}
                      aria-invalid={err?.field === "qty" ? true : undefined}
                      value={r.qty}
                      onChange={(e) =>
                        updateRow(r.key, { qty: e.target.value })
                      }
                    />
                    <span className="mm-rec-unit">
                      {ing ? ing.unit : "satuan"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="l-staf-iconbtn mm-rec-del"
                    aria-label={`Hapus bahan ke-${i + 1}`}
                    title="Hapus bahan"
                    onClick={() => deleteRow(i)}
                  >
                    <Trash2 aria-hidden="true" style={{ fontSize: 16 }} />
                  </button>
                  <p
                    className="l-staf-error mm-rec-err"
                    id={errId}
                    hidden={!err}
                  >
                    {err?.msg}
                  </p>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="l-staf-btn mm-rec-add"
            id="menu-meja-rec-add"
            data-size="sm"
            onClick={addRow}
          >
            <Plus aria-hidden="true" />
            Tambah bahan
          </button>
          <p className="mm-rec-cap" aria-live="polite" data-tone={cap.tone}>
            {cap.body}
          </p>
        </section>
      </div>
      <div className="l-staf-dialog-foot">
        <button
          type="button"
          className="l-staf-btn"
          data-variant="danger"
          hidden={!m}
          onClick={() => m && onDelete(m)}
        >
          <Trash2 aria-hidden="true" />
          Hapus menu
        </button>
        <span className="mm-grow" />
        <button type="button" className="l-staf-btn" onClick={onClose}>
          Batal
        </button>
        <button
          type="submit"
          className="l-staf-btn"
          data-variant="primary"
          disabled={save.isPending}
        >
          {m ? "Simpan perubahan" : "Simpan menu"}
        </button>
      </div>
    </form>
  );
}
