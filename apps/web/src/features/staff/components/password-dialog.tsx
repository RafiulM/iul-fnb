import { useState, type FormEvent } from "react";
import { KeyRound, X } from "lucide-react";
import { initials, ROLE_LABEL } from "@starter/shared/fnb/domain";
import { Dialog } from "@/components/fnb/dialog";
import type { StaffMember } from "../model";

const MIN = 8;

/**
 * "Atur kata sandi": the owner sets a staff member's password (no email
 * provider yet, so there are no invitation or reset links). It completes an
 * invited account and signs the account out everywhere.
 */
export function PasswordDialog({
  target,
  pending,
  onClose,
  onConfirm,
}: {
  target: StaffMember | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (s: StaffMember, password: string) => void;
}) {
  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      size="sm"
      labelledBy="staf-pw-title"
    >
      {target ? (
        <PasswordForm
          key={target.id}
          target={target}
          pending={pending}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      ) : null}
    </Dialog>
  );
}

function PasswordForm({
  target,
  pending,
  onClose,
  onConfirm,
}: {
  target: StaffMember;
  pending: boolean;
  onClose: () => void;
  onConfirm: (s: StaffMember, password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN) {
      setErr(`Kata sandi minimal ${MIN} karakter.`);
      return;
    }
    onConfirm(target, password);
  }

  return (
    <>
      <div className="l-staf-dialog-head">
        <div>
          <h2 id="staf-pw-title">Atur kata sandi</h2>
          <p>
            {target.invited
              ? "Akun ini belum bisa masuk sampai kata sandinya diatur."
              : "Kata sandi lama tidak berlaku lagi dan akun ini keluar dari semua perangkat."}
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
        id="staf-pw-form"
        noValidate
        onSubmit={submit}
      >
        <div className="ak-person">
          <span className="ak-avatar" aria-hidden="true">
            {initials(target.name)}
          </span>
          <div>
            <strong>{target.name}</strong>
            <small>
              {target.email} · {ROLE_LABEL[target.role]}
            </small>
          </div>
        </div>
        <div className="l-staf-field">
          <label htmlFor="staf-pw-input">Kata sandi baru</label>
          <input
            className="l-staf-input"
            id="staf-pw-input"
            type="password"
            autoComplete="new-password"
            minLength={MIN}
            maxLength={128}
            data-autofocus
            aria-describedby="staf-pw-err"
            aria-invalid={err ? true : undefined}
            value={password}
            onChange={(e) => {
              setPassword(e.currentTarget.value);
              setErr("");
            }}
          />
          <p className="l-staf-error" id="staf-pw-err" hidden={!err}>
            {err}
          </p>
        </div>
        <p className="l-staf-hint">
          Sampaikan kata sandi ini langsung ke {target.name}.
        </p>
      </form>
      <div className="l-staf-dialog-foot">
        <button className="l-staf-btn" type="button" onClick={onClose}>
          Batal
        </button>
        <button
          className="l-staf-btn"
          data-variant="primary"
          type="submit"
          form="staf-pw-form"
          disabled={pending}
        >
          <KeyRound aria-hidden="true" />
          Simpan kata sandi
        </button>
      </div>
    </>
  );
}
