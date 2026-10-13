import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { MenuCategoryDto, MenuDto } from "@starter/shared/fnb/types";
import { Dialog } from "@/components/fnb/dialog";
import { useCreateCategory, useRenameCategory } from "../hooks";
import { errorMessage } from "./page-state";

export type CategoryDialogTarget = { id: string | null };

export function CategoryDialog({
  target,
  onClose,
  ...props
}: {
  target: CategoryDialogTarget | null;
  onClose: () => void;
} & Omit<CategoryFormProps, "target" | "onClose">) {
  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      size="sm"
      labelledBy="menu-meja-ct-title"
    >
      {target && <CategoryForm target={target} onClose={onClose} {...props} />}
    </Dialog>
  );
}

type CategoryFormProps = {
  target: CategoryDialogTarget;
  categories: MenuCategoryDto[];
  menus: MenuDto[];
  onClose: () => void;
  onSaved: (
    category: MenuCategoryDto,
    message: string,
    edited: boolean,
  ) => void;
};

function CategoryForm({
  target,
  categories,
  menus,
  onClose,
  onSaved,
}: CategoryFormProps) {
  const create = useCreateCategory();
  const rename = useRenameCategory();
  const c = target.id ? categories.find((x) => x.id === target.id) : undefined;
  const [name, setName] = useState(c?.name ?? "");
  const [err, setErr] = useState("");
  const first = c ? menus.find((m) => m.categoryId === c.id) : undefined;
  const pending = create.isPending || rename.isPending;

  const fail = (msg: string) => {
    setErr(msg);
    document.getElementById("menu-meja-c-name")?.focus();
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return fail("Nama kategori wajib diisi.");
    if (
      categories.some(
        (x) =>
          x.id !== c?.id && x.name.trim().toLowerCase() === clean.toLowerCase(),
      )
    )
      return fail(`Sudah ada kategori bernama “${clean}”.`);
    try {
      if (c) {
        const category = await rename.mutateAsync({ id: c.id, name: clean });
        onSaved(
          category,
          c.name !== category.name
            ? `“${c.name}” diganti jadi “${category.name}”`
            : `Kategori “${category.name}” disimpan`,
          true,
        );
      } else {
        const category = await create.mutateAsync(clean);
        onSaved(
          category,
          `Kategori “${category.name}” ditambahkan di urutan terakhir`,
          false,
        );
      }
    } catch (error) {
      fail(errorMessage(error));
    }
  }

  return (
    <form className="mm-form" noValidate onSubmit={submit}>
      <div className="l-staf-dialog-head">
        <div>
          <h2 id="menu-meja-ct-title">
            {c ? "Ubah kategori" : "Tambah kategori"}
          </h2>
          <p>Kategori jadi tab di aplikasi pelanggan.</p>
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
        <div className="l-staf-field">
          <label htmlFor="menu-meja-c-name">Nama kategori</label>
          <input
            data-autofocus
            className="l-staf-input"
            id="menu-meja-c-name"
            maxLength={30}
            autoComplete="off"
            placeholder="Contoh: Dessert"
            aria-describedby="menu-meja-c-name-err"
            aria-invalid={err ? true : undefined}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErr("");
            }}
          />
          <p className="l-staf-error" id="menu-meja-c-name-err" hidden={!err}>
            {err}
          </p>
        </div>
        <div className="mm-cat-prev">
          <span className="l-staf-thumb" aria-hidden="true">
            {first?.imageUrl ?? "🍽️"}
          </span>
          <div className="mm-grow">
            <span className="mm-pill-prev">
              {name.trim() || "Nama kategori"}
            </span>
            <small>Begini tampilannya di aplikasi pelanggan.</small>
          </div>
        </div>
      </div>
      <div className="l-staf-dialog-foot">
        <button type="button" className="l-staf-btn" onClick={onClose}>
          Batal
        </button>
        <button
          type="submit"
          className="l-staf-btn"
          data-variant="primary"
          disabled={pending}
        >
          {c ? "Simpan" : "Tambah kategori"}
        </button>
      </div>
    </form>
  );
}
