import { useState, type ReactNode, type RefObject } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Check, Eye, Lock } from "lucide-react";
import { useToast } from "@/components/fnb/dialog";
import { authClient } from "@/lib/auth-client";
import {
  OPS,
  OWNER_ONLY_PAGES,
  PERM_DESC,
  REQUIRES,
  SENSITIVE,
  type CashierAccess,
  type PermissionRow,
  type StaffMember,
} from "../model";

/** "Hak per peran" matrix with its sticky save bar. */
export function PermissionMatrix({
  perms,
  draft,
  saving,
  savebarRef,
  onToggle,
  onCancel,
  onSave,
}: {
  perms: PermissionRow[];
  draft: CashierAccess;
  saving: boolean;
  savebarRef: RefObject<HTMLDivElement | null>;
  onToggle: (key: PermissionRow["key"], on: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const groups: [string, PermissionRow[]][] = (
    [
      ["Operasional harian", perms.filter((p) => OPS.includes(p.key))],
      ["Kelola & laporan", perms.filter((p) => !OPS.includes(p.key))],
    ] as [string, PermissionRow[]][]
  ).filter((g) => g[1].length);
  const changed = perms.filter((p) => p.CASHIER !== draft[p.key]).length;
  const on = perms.filter((p) => draft[p.key]).length;

  return (
    <div className="l-staf-card ak-matrix-card">
      <div className="l-staf-card-head">
        <div>
          <h2>Hak akses per peran</h2>
          <p>
            Atur apa saja yang boleh dilakukan kasir. Pemilik selalu punya akses
            penuh agar tidak ada yang terkunci.
          </p>
        </div>
      </div>
      <div className="l-staf-table-wrap ak-matrix-wrap">
        <table className="l-staf-table ak-matrix">
          <thead>
            <tr>
              <th scope="col">Akses</th>
              <th scope="col" className="ak-c">
                Pemilik<small>selalu penuh</small>
              </th>
              <th scope="col" className="ak-c">
                Kasir
                <small>
                  {on} dari {perms.length} akses
                </small>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map(([label, list]) => (
              <Group key={label} label={label}>
                {list.map((p) => (
                  <PermRow
                    key={p.key}
                    p={p}
                    perms={perms}
                    draft={draft}
                    onToggle={onToggle}
                  />
                ))}
              </Group>
            ))}
          </tbody>
        </table>
      </div>
      <div
        ref={savebarRef}
        className="ak-savebar"
        role="region"
        aria-label="Perubahan hak akses"
        hidden={!changed}
      >
        <span className="ak-sb-dot" aria-hidden="true" />
        <div className="ak-grow">
          <strong>Ada perubahan belum disimpan</strong>
          <small>{changed} akses kasir diubah</small>
        </div>
        <button
          type="button"
          className="l-staf-btn"
          data-size="sm"
          onClick={onCancel}
        >
          Batal
        </button>
        <button
          type="button"
          className="l-staf-btn"
          data-size="sm"
          data-variant="primary"
          disabled={saving}
          onClick={onSave}
        >
          Simpan
        </button>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <tr className="ak-grp">
        <th scope="colgroup" colSpan={3}>
          {label}
        </th>
      </tr>
      {children}
    </>
  );
}

function PermRow({
  p,
  perms,
  draft,
  onToggle,
}: {
  p: PermissionRow;
  perms: PermissionRow[];
  draft: CashierAccess;
  onToggle: (key: PermissionRow["key"], on: boolean) => void;
}) {
  const parentKey = REQUIRES[p.key];
  const parent = parentKey ? perms.find((x) => x.key === parentKey) : undefined;
  const locked = !!parent && !draft[parent.key];
  const changed = p.CASHIER !== draft[p.key];
  return (
    <tr data-changed={changed ? "" : undefined}>
      <th scope="row">
        <div className="ak-perm">
          <strong>
            {p.label}
            {SENSITIVE.has(p.key) ? (
              <span className="l-staf-chip" data-tone="warning">
                Sensitif
              </span>
            ) : null}
          </strong>
          <small>{PERM_DESC[p.key]}</small>
          {parent && locked ? (
            <small className="ak-dep">
              <Lock aria-hidden="true" style={{ fontSize: 12 }} />
              Aktifkan “{parent.label}” dulu
            </small>
          ) : null}
        </div>
      </th>
      <td className="ak-c">
        <label className="l-staf-switch" title="Pemilik selalu punya akses ini">
          <input
            type="checkbox"
            role="switch"
            checked
            readOnly
            disabled
            aria-label={`Pemilik: ${p.label} (selalu aktif)`}
          />
          <span />
        </label>
      </td>
      <td className="ak-c">
        <label className="l-staf-switch">
          <input
            type="checkbox"
            role="switch"
            checked={draft[p.key]}
            disabled={locked}
            aria-label={`Kasir: ${p.label}`}
            onChange={(e) => onToggle(p.key, e.currentTarget.checked)}
          />
          <span />
        </label>
        {changed ? <span className="ak-chg">Diubah</span> : null}
      </td>
    </tr>
  );
}

/** "Coba sebagai kasir": role preview. Roles come from the signed-in account,
 *  so the demo signs out and lets the owner sign in with a cashier account. */
export function CashierDemo({
  perms,
  cashier,
  dirty,
  onBlocked,
}: {
  perms: PermissionRow[];
  cashier: StaffMember | undefined;
  dirty: boolean;
  onBlocked: () => void;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const navigate = useNavigate();
  const toast = useToast();
  const can = perms.filter((p) => p.CASHIER);

  async function tryCashier() {
    if (dirty) return onBlocked();
    setPending(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign out failed");
      await router.invalidate();
      await navigate({ to: "/sign-in", replace: true });
    } catch {
      toast("Gagal keluar. Coba lagi.");
      setPending(false);
    }
  }

  return (
    <section className="l-staf-card ak-demo" aria-labelledby="staf-demo-title">
      <div className="l-staf-card-body">
        <div className="ak-demo-top">
          <h2 id="staf-demo-title">Coba sebagai kasir</h2>
          <span className="l-staf-chip" data-tone="plain">
            Demo
          </span>
        </div>
        <p className="ak-demo-txt">
          Akses dibagi menurut peran. Lihat aplikasi seperti yang dilihat{" "}
          <strong>{cashier ? `${cashier.name} (Kasir)` : "kasir"}</strong>:
          halaman khusus pemilik disembunyikan dari menu samping dan terkunci
          bila dibuka langsung.
        </p>
        <p className="ak-eyebrow">Kasir bisa</p>
        <ul className="ak-mini">
          {can.length ? (
            can.map((p) => (
              <li key={p.key}>
                <Check aria-hidden="true" style={{ fontSize: 15 }} />
                <span>{p.label}</span>
              </li>
            ))
          ) : (
            <li>Belum ada akses</li>
          )}
        </ul>
        <p className="ak-eyebrow">Disembunyikan dari kasir</p>
        <div className="ak-locks">
          {OWNER_ONLY_PAGES.map((l) => (
            <span key={l} className="l-staf-chip" data-tone="plain">
              <Lock aria-hidden="true" style={{ fontSize: 12 }} />
              {l}
            </span>
          ))}
        </div>
        <button
          type="button"
          className="l-staf-btn"
          data-block
          disabled={pending}
          onClick={tryCashier}
        >
          <Eye aria-hidden="true" />
          Masuk sebagai kasir
        </button>
        <p className="l-staf-hint ak-demo-note">
          Tombol ini mengeluarkan Anda — masuk lagi dengan akun kasir. Untuk
          kembali, klik ikon keluar di bawah menu samping lalu masuk sebagai
          Pemilik. Menu samping memakai hak akses bawaan, jadi perubahan pada
          tabel belum ikut terbawa.
        </p>
      </div>
    </section>
  );
}
