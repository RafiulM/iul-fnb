import type { Ref } from "react";
import { Printer } from "lucide-react";
import type { ReceiptFormatDto } from "@starter/shared/fnb/types";
import type { SettingsDraft } from "./draft";

type Toggle = keyof Pick<
  ReceiptFormatDto,
  "showLogo" | "showAddress" | "showTable" | "showCashier" | "showNotes"
>;

const TOGGLES: { key: Toggle; id: string; label: string; hint: string }[] = [
  {
    key: "showLogo",
    id: "logo",
    label: "Tampilkan logo",
    hint: "Logo atau inisial kafe di bagian paling atas.",
  },
  {
    key: "showAddress",
    id: "address",
    label: "Tampilkan alamat & telepon",
    hint: "Di bawah nama kafe.",
  },
  {
    key: "showTable",
    id: "table",
    label: "Tampilkan nomor meja",
    hint: 'Meja pelanggan, atau "Bawa pulang" untuk pesanan tanpa meja.',
  },
  {
    key: "showCashier",
    id: "cashier",
    label: "Tampilkan nama kasir",
    hint: "Kasir yang menerima pembayaran.",
  },
  {
    key: "showNotes",
    id: "notes",
    label: "Tampilkan catatan pesanan",
    hint: 'Mis. "Tidak pedas" di bawah nama menu.',
  },
];

export function ReceiptCard({
  draft,
  update,
  onEdit,
  onTestPrint,
  sectionRef,
}: {
  draft: SettingsDraft;
  update: (fn: (d: SettingsDraft) => void) => void;
  /** Any edit here switches the preview to the receipt. */
  onEdit: () => void;
  onTestPrint: () => void;
  sectionRef: Ref<HTMLElement>;
}) {
  const R = draft.receipt;
  const h = R.header.length;
  const f = R.footer.length;
  return (
    <section
      ref={sectionRef}
      className="l-staf-card pg-sec"
      tabIndex={-1}
      aria-labelledby="pengaturan-h-struk"
      data-sec="struk"
      data-preview="struk"
      onChange={onEdit}
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="pengaturan-h-struk">Format struk</h2>
          <p>Atur informasi yang tercetak di struk pelanggan.</p>
        </div>
      </div>
      <div className="l-staf-card-body">
        <div role="group" aria-label="Informasi yang tampil di struk">
          {TOGGLES.map((t) => (
            <div className="pg-opt" key={t.key}>
              <div className="pg-opt-txt">
                <label htmlFor={`pengaturan-rc-${t.id}`}>{t.label}</label>
                <small id={`pengaturan-rc-${t.id}-hint`}>{t.hint}</small>
              </div>
              <label className="l-staf-switch">
                <input
                  type="checkbox"
                  role="switch"
                  id={`pengaturan-rc-${t.id}`}
                  aria-describedby={`pengaturan-rc-${t.id}-hint`}
                  checked={R[t.key]}
                  onChange={(e) =>
                    update((d) => {
                      d.receipt[t.key] = e.target.checked;
                    })
                  }
                />
                <span />
              </label>
            </div>
          ))}
        </div>

        <div className="pg-grid pg-struk-text">
          <div className="l-staf-field pg-span2">
            <div className="pg-label-row">
              <label htmlFor="pengaturan-header">
                Teks pembuka <span className="pg-opt-tag">(opsional)</span>
              </label>
              <small
                className="l-staf-hint pg-counter"
                id="pengaturan-header-count"
                data-near={h >= 52 ? "" : undefined}
              >
                {h}/60
              </small>
            </div>
            <input
              className="l-staf-input"
              id="pengaturan-header"
              type="text"
              maxLength={60}
              placeholder="mis. Selamat datang di Kedai Senja"
              aria-describedby="pengaturan-hint-header pengaturan-header-count"
              value={R.header}
              onChange={(e) =>
                update((d) => {
                  d.receipt.header = e.target.value;
                })
              }
            />
            <small className="l-staf-hint" id="pengaturan-hint-header">
              Tercetak di bawah nama dan alamat kafe.
            </small>
          </div>
          <div className="l-staf-field pg-span2">
            <div className="pg-label-row">
              <label htmlFor="pengaturan-footer">Teks penutup</label>
              <small
                className="l-staf-hint pg-counter"
                id="pengaturan-footer-count"
                data-near={f >= 70 ? "" : undefined}
              >
                {f}/80
              </small>
            </div>
            <input
              className="l-staf-input"
              id="pengaturan-footer"
              type="text"
              maxLength={80}
              placeholder="mis. Terima kasih, sampai jumpa lagi!"
              aria-describedby="pengaturan-hint-footer pengaturan-footer-count"
              value={R.footer}
              onChange={(e) =>
                update((d) => {
                  d.receipt.footer = e.target.value;
                })
              }
            />
            <small className="l-staf-hint" id="pengaturan-hint-footer">
              Tercetak paling bawah, misalnya ucapan terima kasih atau info
              promo.
            </small>
          </div>
        </div>

        <div className="pg-paper-row">
          <div className="l-staf-field">
            <span className="l-staf-label-text" id="pengaturan-paper-lbl">
              Lebar kertas
            </span>
            <div
              className="l-staf-seg"
              role="group"
              aria-labelledby="pengaturan-paper-lbl"
              data-part="paper-seg"
            >
              {([58, 80] as const).map((mm) => (
                <button
                  key={mm}
                  type="button"
                  aria-pressed={R.paperMm === mm}
                  onClick={() => {
                    update((d) => {
                      d.receipt.paperMm = mm;
                    });
                    onEdit();
                  }}
                >
                  {mm} mm
                </button>
              ))}
            </div>
            <small className="l-staf-hint">
              Sesuaikan dengan ukuran kertas printer kasir.
            </small>
          </div>
          <button
            type="button"
            className="l-staf-btn"
            data-part="test-print"
            onClick={onTestPrint}
          >
            <Printer aria-hidden="true" />
            Cetak struk uji
          </button>
        </div>
      </div>
    </section>
  );
}
