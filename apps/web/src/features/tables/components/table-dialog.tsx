import { useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { TableDto } from "@starter/shared/fnb/types";
import { Dialog } from "@/components/fnb/dialog";
import { errorMessage } from "@/features/menu/components/page-state";
import { isValidTableNo, normTableNo, tableNoError } from "../api";
import { useCreateTable } from "../hooks";
import { areaList } from "./tables-tab";

export function TableDialog({
  open,
  onClose,
  ...props
}: { open: boolean } & TableFormProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      labelledBy="menu-meja-tm-title"
    >
      {open && <TableForm onClose={onClose} {...props} />}
    </Dialog>
  );
}

type TableFormProps = {
  tables: TableDto[];
  /** Current table filter; an area filter preselects that area. */
  filter: string;
  onClose: () => void;
  onSaved: (table: TableDto) => void;
};

function TableForm({ tables, filter, onClose, onSaved }: TableFormProps) {
  const create = useCreateTable();
  const areas = areaList(tables);
  const [no, setNo] = useState(() => {
    const nums = tables
      .map((t) => parseInt(t.tableNumber, 10))
      .filter((n) => !isNaN(n));
    return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0");
  });
  const [area, setArea] = useState(
    areas.includes(filter) ? filter : (areas[0] ?? ""),
  );
  const [err, setErr] = useState("");
  const selected = useRef(false);

  const v = normTableNo(no);
  const hint =
    v && isValidTableNo(v)
      ? `Akan tampil sebagai “Meja ${v}”. Angka otomatis jadi 2 digit.`
      : "Angka otomatis jadi 2 digit, mis. 7 → 07.";

  const fail = (msg: string) => {
    setErr(msg);
    document.getElementById("menu-meja-t-no")?.focus();
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const msg = tableNoError(v, tables);
    if (msg) return fail(msg);
    try {
      onSaved(await create.mutateAsync({ tableNumber: v, area }));
    } catch (error) {
      fail(errorMessage(error));
    }
  }

  return (
    <form className="mm-form" noValidate onSubmit={submit}>
      <div className="l-staf-dialog-head">
        <div>
          <h2 id="menu-meja-tm-title">Tambah meja</h2>
          <p>Setiap meja otomatis mendapat QR unik untuk pemesanan.</p>
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
        <div className="mm-fgrid">
          <div className="l-staf-field">
            <label htmlFor="menu-meja-t-no">Nomor meja</label>
            <input
              data-autofocus
              className="l-staf-input"
              id="menu-meja-t-no"
              maxLength={6}
              autoComplete="off"
              placeholder="Contoh: 13"
              aria-describedby="menu-meja-t-no-err menu-meja-t-hint"
              aria-invalid={err ? true : undefined}
              style={{ fontVariantNumeric: "tabular-nums" }}
              value={no}
              onFocus={(e) => {
                // Select the suggested number once, when the dialog opens.
                if (selected.current) return;
                selected.current = true;
                e.currentTarget.select();
              }}
              onChange={(e) => {
                setNo(e.target.value);
                setErr("");
              }}
            />
          </div>
          <div className="l-staf-field">
            <label htmlFor="menu-meja-t-area">Area</label>
            <select
              className="l-staf-select"
              id="menu-meja-t-area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <p
            className="l-staf-error mm-span2"
            id="menu-meja-t-no-err"
            hidden={!err}
          >
            {err}
          </p>
          <p className="l-staf-hint mm-span2" id="menu-meja-t-hint">
            {hint}
          </p>
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
          disabled={create.isPending}
        >
          Tambah meja
        </button>
      </div>
    </form>
  );
}
