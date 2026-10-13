import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, KeyRound, Shield, UserPlus, X } from "lucide-react";
import { ROLE_LABEL, tgl } from "@starter/shared/fnb/domain";
import type { StaffRole } from "@starter/shared/fnb/types";
import { Dialog, useToast } from "@/components/fnb/dialog";
import { ApiError } from "@/lib/api/client";
import { useCreateStaff, useUpdateStaff } from "../hooks";
import { EMAIL_RE, type PermissionRow, type StaffMember } from "../model";

/** "Tambah staf" / "Ubah data staf" dialog. `target` null = add. */
export function StaffEditor({
  open,
  target,
  staff,
  perms,
  primaryId,
  meId,
  onClose,
  onSaved,
}: {
  open: boolean;
  target: StaffMember | null;
  staff: StaffMember[];
  perms: PermissionRow[];
  primaryId: string | undefined;
  meId: string;
  onClose: () => void;
  onSaved: (id: string, created: boolean) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="staf-s-title">
      <StaffForm
        target={target}
        staff={staff}
        perms={perms}
        primaryId={primaryId}
        meId={meId}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Dialog>
  );
}

type Errors = { name?: string; email?: string; password?: string };

function StaffForm({
  target: s,
  staff,
  perms,
  primaryId,
  meId,
  onClose,
  onSaved,
}: {
  target: StaffMember | null;
  staff: StaffMember[];
  perms: PermissionRow[];
  primaryId: string | undefined;
  meId: string;
  onClose: () => void;
  onSaved: (id: string, created: boolean) => void;
}) {
  const toast = useToast();
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const [name, setName] = useState(s?.name ?? "");
  const [email, setEmail] = useState(s?.email ?? "");
  const [role, setRole] = useState<StaffRole>(s?.role ?? "CASHIER");
  const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<Errors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const pending = create.isPending || update.isPending;

  const isPrimary = !!s && s.id === primaryId;
  const isSelf = !!s && s.id === meId;
  const roleLocked = isPrimary || isSelf;
  const showWarn = role === "OWNER" && !(s && s.role === "OWNER");

  const cashierCan = perms.filter((p) => p.CASHIER);
  const ownerExtra = perms.filter((p) => !p.CASHIER);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanEmail = email.trim().toLowerCase();
    const next: Errors = {};
    if (cleanName.length < 2) next.name = "Isi nama lengkap staf.";
    const dup = staff.find(
      (x) => x.id !== s?.id && x.email.toLowerCase() === cleanEmail,
    );
    if (!cleanEmail) next.email = "Isi email untuk masuk ke aplikasi.";
    else if (!EMAIL_RE.test(cleanEmail))
      next.email = "Format email belum benar, contoh: nama@kedaisenja.id";
    else if (dup) next.email = `Email ini sudah dipakai akun ${dup.name}.`;
    if (!s && password && password.length < 8)
      next.password = "Kata sandi minimal 8 karakter, atau kosongkan.";
    setErrs(next);
    if (next.name) return nameRef.current?.focus();
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();

    const input = { name: cleanName, email: cleanEmail, role };
    try {
      if (s) {
        const r = await update.mutateAsync({ before: s, input });
        onSaved(s.id, false);
        toast(
          r.emailChanged
            ? `Data ${cleanName} disimpan · email kini ${cleanEmail}`
            : r.roleChanged
              ? `${cleanName} kini berperan sebagai ${ROLE_LABEL[role]}`
              : `Data ${cleanName} disimpan`,
        );
      } else {
        const created = await create.mutateAsync({
          ...input,
          ...(password ? { password } : {}),
        });
        onSaved(created.id, true);
        toast(
          password
            ? `${cleanName} ditambahkan dan sudah bisa masuk`
            : `${cleanName} ditambahkan · atur kata sandinya agar bisa masuk`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan.";
      if (err instanceof ApiError && err.status === 409 && /email/i.test(msg)) {
        setErrs({ email: msg });
        emailRef.current?.focus();
      } else toast(msg);
    }
  }

  return (
    <>
      <div className="l-staf-dialog-head">
        <div>
          <h2 id="staf-s-title">{s ? "Ubah data staf" : "Tambah staf"}</h2>
          <p>
            {s
              ? `${s.name} · bergabung ${tgl(s.createdAt)}`
              : "Staf masuk dengan email dan kata sandi yang Anda atur."}
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
        id="staf-s-form"
        noValidate
        onSubmit={submit}
      >
        <div className="ak-form">
          <div className="l-staf-field">
            <label htmlFor="staf-s-name">Nama lengkap</label>
            <input
              ref={nameRef}
              className="l-staf-input"
              id="staf-s-name"
              maxLength={60}
              autoComplete="off"
              placeholder="mis. Putri Anggraini"
              data-autofocus
              aria-describedby="staf-s-name-err"
              aria-invalid={errs.name ? true : undefined}
              value={name}
              onChange={(e) => {
                setName(e.currentTarget.value);
                setErrs((x) => ({ ...x, name: undefined }));
              }}
            />
            <p
              className="l-staf-error"
              id="staf-s-name-err"
              hidden={!errs.name}
            >
              {errs.name}
            </p>
          </div>
          <div className="l-staf-field">
            <label htmlFor="staf-s-email">Email</label>
            <input
              ref={emailRef}
              className="l-staf-input"
              id="staf-s-email"
              type="email"
              maxLength={80}
              autoComplete="off"
              placeholder="nama@kedaisenja.id"
              aria-describedby="staf-s-email-err"
              aria-invalid={errs.email ? true : undefined}
              value={email}
              onChange={(e) => {
                setEmail(e.currentTarget.value);
                setErrs((x) => ({ ...x, email: undefined }));
              }}
            />
            <p
              className="l-staf-error"
              id="staf-s-email-err"
              hidden={!errs.email}
            >
              {errs.email}
            </p>
          </div>
          {s ? null : (
            <div className="l-staf-field">
              <label htmlFor="staf-s-password">
                Kata sandi awal <span className="ak-faint">(opsional)</span>
              </label>
              <input
                ref={passwordRef}
                className="l-staf-input"
                id="staf-s-password"
                type="password"
                maxLength={128}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                aria-describedby="staf-s-password-err"
                aria-invalid={errs.password ? true : undefined}
                value={password}
                onChange={(e) => {
                  setPassword(e.currentTarget.value);
                  setErrs((x) => ({ ...x, password: undefined }));
                }}
              />
              <p
                className="l-staf-error"
                id="staf-s-password-err"
                hidden={!errs.password}
              >
                {errs.password}
              </p>
            </div>
          )}
          <fieldset className="ak-span ak-fieldset">
            <legend className="ak-legend">Peran</legend>
            <div className="ak-roles">
              <RoleCard
                value="OWNER"
                title="Pemilik"
                sub="Akses penuh"
                selected={role}
                locked={roleLocked}
                onPick={setRole}
              >
                {ownerExtra.length ? (
                  <>
                    <li className="ak-pre">Semua akses kasir, ditambah:</li>
                    {ownerExtra.map((p) => (
                      <PermLi key={p.key} label={p.label} />
                    ))}
                  </>
                ) : (
                  <PermLi label="Semua akses aplikasi" />
                )}
              </RoleCard>
              <RoleCard
                value="CASHIER"
                title="Kasir"
                sub="Layar kasir & stok bahan"
                selected={role}
                locked={roleLocked}
                onPick={setRole}
              >
                {cashierCan.length ? (
                  cashierCan.map((p) => <PermLi key={p.key} label={p.label} />)
                ) : (
                  <li className="ak-pre">
                    Belum ada akses — atur di tab Hak Akses
                  </li>
                )}
              </RoleCard>
            </div>
            <p className="l-staf-hint" hidden={!roleLocked}>
              {isPrimary
                ? "Peran akun pemilik utama tidak bisa diubah."
                : "Peran akun Anda sendiri tidak bisa diubah."}
            </p>
            <div
              className="l-staf-alert ak-role-warn"
              data-tone="warning"
              hidden={!showWarn}
            >
              <Shield aria-hidden="true" />
              <span>
                Pemilik bisa mengelola akun staf, mengubah menu, dan melihat
                laporan penjualan. Berikan hanya kepada orang yang dipercaya.
              </span>
            </div>
          </fieldset>
          <div className="ak-span l-staf-alert" data-tone="neutral">
            <KeyRound aria-hidden="true" />
            <span>
              {s
                ? "Email dipakai untuk masuk. Kata sandi diganti lewat tombol kunci di daftar staf."
                : "Tanpa kata sandi, akun belum bisa masuk sampai Anda mengaturnya dari daftar staf."}
            </span>
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
          form="staf-s-form"
          disabled={pending}
        >
          {s ? (
            "Simpan perubahan"
          ) : (
            <>
              <UserPlus aria-hidden="true" style={{ fontSize: 18 }} />
              Tambah staf
            </>
          )}
        </button>
      </div>
    </>
  );
}

function RoleCard({
  value,
  title,
  sub,
  selected,
  locked,
  onPick,
  children,
}: {
  value: StaffRole;
  title: string;
  sub: string;
  selected: StaffRole;
  locked: boolean;
  onPick: (r: StaffRole) => void;
  children: ReactNode;
}) {
  return (
    <div className="ak-role">
      <label className="ak-role-top">
        <input
          type="radio"
          name="staf-role"
          value={value}
          checked={selected === value}
          disabled={locked}
          onChange={() => onPick(value)}
        />
        <span className="ak-radio" aria-hidden="true" />
        <span>
          <strong>{title}</strong>
          <small>{sub}</small>
        </span>
      </label>
      <ul className="ak-perms">{children}</ul>
    </div>
  );
}

function PermLi({ label }: { label: string }) {
  return (
    <li>
      <Check aria-hidden="true" style={{ fontSize: 14 }} />
      <span>{label}</span>
    </li>
  );
}
