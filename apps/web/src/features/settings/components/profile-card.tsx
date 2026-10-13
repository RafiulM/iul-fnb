import { useRef, useState, type Ref } from "react";
import { Trash2, Upload } from "lucide-react";
import { initials } from "@starter/shared/fnb/domain";
import type { FieldKey, SettingsDraft } from "./draft";
import { LogoError, logoDataUrl } from "./logo";

export type FormProps = {
  draft: SettingsDraft;
  update: (fn: (d: SettingsDraft) => void) => void;
  /** Error shown for a field (only once touched). */
  err: (key: FieldKey) => string;
  touch: (key: FieldKey) => void;
};

export function ProfileCard({
  draft,
  update,
  err,
  touch,
  sectionRef,
}: FormProps & { sectionRef: Ref<HTMLElement> }) {
  const name = draft.cafeName.trim();
  const ini = (name && initials(name)) || "?";
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [logoErr, setLogoErr] = useState("");

  async function takeFile(file: File | undefined) {
    if (!file) return;
    try {
      const url = await logoDataUrl(file);
      update((d) => {
        d.logoUrl = url;
      });
      setLogoErr("");
    } catch (e) {
      setLogoErr(
        e instanceof LogoError ? e.message : "Logo gagal diunggah. Coba lagi.",
      );
    }
  }

  const nameErr = err("name");
  const phoneErr = err("phone");
  const igErr = err("ig");

  return (
    <section
      ref={sectionRef}
      className="l-staf-card pg-sec"
      tabIndex={-1}
      aria-labelledby="pengaturan-h-profil"
      data-sec="profil"
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="pengaturan-h-profil">Profil kafe</h2>
          <p>Nama, logo, dan alamat muncul di semua tampilan pelanggan.</p>
        </div>
      </div>
      <div className="l-staf-card-body">
        <div className="pg-logo-row">
          <span className="pg-logo" aria-hidden="true" data-part="logo-tile">
            {draft.logoUrl ? <img src={draft.logoUrl} alt="" /> : ini}
          </span>
          <button
            type="button"
            className="pg-drop"
            aria-describedby={
              logoErr
                ? "pengaturan-err-logo pengaturan-logo-hint"
                : "pengaturan-logo-hint"
            }
            data-part="logo-drop"
            data-drag={drag ? "" : undefined}
            onClick={() => fileRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDrag(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              void takeFile(e.dataTransfer.files[0]);
            }}
          >
            <Upload aria-hidden="true" />
            <span>
              <strong>{draft.logoUrl ? "Ganti logo" : "Unggah logo"}</strong>
              <small id="pengaturan-logo-hint">
                PNG atau JPG persegi, maks. 1 MB. Klik atau seret file ke sini.
                Selama belum ada logo, kami pakai inisial nama kafe.
              </small>
            </span>
          </button>
          {draft.logoUrl && (
            <button
              type="button"
              className="l-staf-btn pg-logo-actions"
              data-size="sm"
              onClick={() => {
                update((d) => {
                  d.logoUrl = null;
                });
                setLogoErr("");
              }}
            >
              <Trash2 aria-hidden="true" />
              Hapus logo
            </button>
          )}
          <input
            ref={fileRef}
            className="pg-drop-file"
            type="file"
            accept="image/png,image/jpeg"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              void takeFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {logoErr && (
          <p className="l-staf-error pg-logo-err" id="pengaturan-err-logo">
            {logoErr}
          </p>
        )}
        <div className="pg-grid">
          <div className="l-staf-field pg-span2">
            <label htmlFor="pengaturan-name">
              Nama kafe{" "}
              <span className="pg-req" aria-hidden="true">
                *
              </span>
            </label>
            <input
              className="l-staf-input"
              id="pengaturan-name"
              type="text"
              maxLength={40}
              autoComplete="organization"
              required
              aria-required="true"
              aria-invalid={nameErr ? "true" : "false"}
              aria-describedby="pengaturan-err-name pengaturan-hint-name"
              value={draft.cafeName}
              onChange={(e) =>
                update((d) => {
                  d.cafeName = e.target.value;
                })
              }
              onBlur={() => touch("name")}
            />
            <p
              className="l-staf-error"
              id="pengaturan-err-name"
              hidden={!nameErr}
            >
              {nameErr}
            </p>
            <small className="l-staf-hint" id="pengaturan-hint-name">
              Tampil di halaman pelanggan, struk, dan layar kasir.
            </small>
          </div>
          <div className="l-staf-field pg-span2">
            <label htmlFor="pengaturan-address">Alamat</label>
            <textarea
              className="l-staf-textarea"
              id="pengaturan-address"
              rows={2}
              maxLength={140}
              aria-describedby="pengaturan-hint-address"
              value={draft.address}
              onChange={(e) =>
                update((d) => {
                  d.address = e.target.value;
                })
              }
            />
            <small className="l-staf-hint" id="pengaturan-hint-address">
              Tampil di bawah nama kafe dan di bagian atas struk.
            </small>
          </div>
          <div className="l-staf-field">
            <label htmlFor="pengaturan-phone">Telepon</label>
            <input
              className="l-staf-input"
              id="pengaturan-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder="0812-0000-0000"
              aria-invalid={phoneErr ? "true" : "false"}
              aria-describedby="pengaturan-err-phone pengaturan-hint-phone"
              value={draft.phone}
              onChange={(e) =>
                update((d) => {
                  d.phone = e.target.value;
                })
              }
              onBlur={() => touch("phone")}
            />
            <p
              className="l-staf-error"
              id="pengaturan-err-phone"
              hidden={!phoneErr}
            >
              {phoneErr}
            </p>
            <small className="l-staf-hint" id="pengaturan-hint-phone">
              Dicetak di struk bersama alamat.
            </small>
          </div>
          <div className="l-staf-field">
            <label htmlFor="pengaturan-ig">
              Instagram <span className="pg-opt-tag">(opsional)</span>
            </label>
            <div className="l-staf-affix" data-invalid={igErr ? "" : undefined}>
              <span aria-hidden="true">@</span>
              <input
                id="pengaturan-ig"
                type="text"
                maxLength={30}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="namakafe"
                aria-invalid={igErr ? "true" : "false"}
                aria-describedby="pengaturan-err-ig pengaturan-hint-ig"
                value={draft.instagram}
                onChange={(e) => {
                  const clean = e.target.value
                    .replace(/^@+/, "")
                    .replace(/\s+/g, "");
                  update((d) => {
                    d.instagram = clean;
                  });
                }}
                onBlur={() => touch("ig")}
              />
            </div>
            <p className="l-staf-error" id="pengaturan-err-ig" hidden={!igErr}>
              {igErr}
            </p>
            <small className="l-staf-hint" id="pengaturan-hint-ig">
              Tampil di bagian bawah halaman pelanggan.
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}
