import { KeyRound, Pencil, Search, SearchX } from "lucide-react";
import {
  ago,
  hhmm,
  initials,
  ROLE_LABEL,
  tgl,
} from "@starter/shared/fnb/domain";
import type { StaffRole } from "@starter/shared/fnb/types";
import { deactivateBlock, type StaffMember } from "../model";

export type StaffFilter = "ALL" | "ACTIVE" | "INACTIVE";

const FILTERS: [StaffFilter, string][] = [
  ["ALL", "Semua"],
  ["ACTIVE", "Aktif"],
  ["INACTIVE", "Nonaktif"],
];

export function RoleChip({ role }: { role: StaffRole }) {
  return role === "OWNER" ? (
    <span className="l-staf-chip" data-tone="dark">
      {ROLE_LABEL.OWNER}
    </span>
  ) : (
    <span className="l-staf-chip" data-tone="plain">
      {ROLE_LABEL.CASHIER}
    </span>
  );
}

/** "Daftar akun" card: search, status filter, table, empty state. */
export function StaffLedger({
  staff,
  now,
  meId,
  primaryId,
  filter,
  q,
  fresh,
  onFilter,
  onQuery,
  onClear,
  onEdit,
  onToggle,
  onSetPassword,
}: {
  staff: StaffMember[];
  now: number;
  meId: string | undefined;
  primaryId: string | undefined;
  filter: StaffFilter;
  q: string;
  fresh: string[];
  onFilter: (f: StaffFilter) => void;
  onQuery: (q: string) => void;
  onClear: () => void;
  onEdit: (s: StaffMember) => void;
  onToggle: (s: StaffMember, active: boolean) => void;
  onSetPassword: (s: StaffMember) => void;
}) {
  const count = (k: StaffFilter) =>
    k === "ALL"
      ? staff.length
      : staff.filter((s) => s.isActive === (k === "ACTIVE")).length;
  const needle = q.trim().toLowerCase();
  const isPrimary = (s: StaffMember) => s.id === primaryId;
  const list = staff
    .filter(
      (s) =>
        (filter === "ALL" || s.isActive === (filter === "ACTIVE")) &&
        (!needle ||
          s.name.toLowerCase().includes(needle) ||
          s.email.toLowerCase().includes(needle)),
    )
    .sort(
      (a, b) =>
        Number(isPrimary(b)) - Number(isPrimary(a)) ||
        (a.role === "OWNER" ? 0 : 1) - (b.role === "OWNER" ? 0 : 1) ||
        a.name.localeCompare(b.name, "id"),
    );
  const owners = staff.filter((s) => s.role === "OWNER").length;

  return (
    <div className="l-staf-card ak-ledger">
      <div className="l-staf-card-head">
        <div>
          <h2>Daftar akun</h2>
          <p>Setiap staf masuk dengan email &amp; kata sandinya sendiri.</p>
        </div>
        <label className="l-staf-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            placeholder="Cari nama atau email…"
            aria-label="Cari staf"
            autoComplete="off"
            value={q}
            onChange={(e) => onQuery(e.currentTarget.value)}
          />
        </label>
      </div>
      <div className="ak-toolbar">
        <div
          className="l-staf-seg"
          role="group"
          aria-label="Saring status akun"
        >
          {FILTERS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => onFilter(k)}
            >
              {l}
              <small>{count(k)}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="l-staf-table-wrap ak-table-wrap" hidden={!list.length}>
        <table className="l-staf-table ak-table">
          <thead>
            <tr>
              <th scope="col">Nama</th>
              <th scope="col" className="ak-col-role">
                Peran
              </th>
              <th scope="col">Status</th>
              <th scope="col">Terakhir masuk</th>
              <th scope="col" className="ak-col-join">
                Bergabung
              </th>
              <th scope="col" className="ak-end">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <StaffRow
                key={s.id}
                s={s}
                now={now}
                isMe={s.id === meId}
                block={deactivateBlock(s, staff, meId)}
                fresh={fresh.includes(s.id)}
                onEdit={onEdit}
                onToggle={onToggle}
                onSetPassword={onSetPassword}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="l-staf-empty" hidden={list.length > 0}>
        <SearchX aria-hidden="true" />
        <strong>Tidak ada staf yang cocok</strong>
        <span>Coba kata lain atau tampilkan semua akun.</span>
        <button
          type="button"
          className="l-staf-btn"
          data-size="sm"
          style={{ marginTop: "var(--space-2)" }}
          onClick={onClear}
        >
          Tampilkan semua
        </button>
      </div>
      <div className="ak-foot">
        <span>
          {staff.length} akun · {owners} pemilik, {staff.length - owners} kasir
        </span>
        <span>Kata sandi staf diatur lewat tombol kunci di tiap baris.</span>
      </div>
    </div>
  );
}

function StaffRow({
  s,
  now,
  isMe,
  block,
  fresh,
  onEdit,
  onToggle,
  onSetPassword,
}: {
  s: StaffMember;
  now: number;
  isMe: boolean;
  block: { title: string; note: string } | null;
  fresh: boolean;
  onEdit: (s: StaffMember) => void;
  onToggle: (s: StaffMember, active: boolean) => void;
  onSetPassword: (s: StaffMember) => void;
}) {
  const linkTitle = s.invited ? "Buat kata sandi" : "Atur ulang kata sandi";
  const noteId = `staf-prim-${s.id}`;
  return (
    <tr
      data-id={s.id}
      data-inactive={s.isActive ? undefined : ""}
      data-fresh={fresh ? "" : undefined}
    >
      <td>
        <div className="ak-who-cell">
          <span className="ak-avatar" aria-hidden="true">
            {initials(s.name)}
          </span>
          <div className="ak-who">
            <strong>
              {s.name}
              {isMe ? (
                <span className="l-staf-chip" data-tone="accent">
                  Anda
                </span>
              ) : null}
              <span className="ak-role-inline">
                <RoleChip role={s.role} />
              </span>
            </strong>
            <small>{s.email}</small>
          </div>
        </div>
      </td>
      <td className="ak-col-role">
        <RoleChip role={s.role} />
      </td>
      <td>
        <div className="ak-status">
          <label className="l-staf-switch" title={block?.title}>
            <input
              type="checkbox"
              role="switch"
              data-toggle={s.id}
              checked={s.isActive}
              disabled={!!block}
              aria-label={`Akun ${s.name} aktif`}
              aria-describedby={block ? noteId : undefined}
              onChange={(e) => onToggle(s, e.currentTarget.checked)}
            />
            <span />
          </label>
          <div>
            <span className="ak-st">{s.isActive ? "Aktif" : "Nonaktif"}</span>
            {block ? <small id={noteId}>{block.note}</small> : null}
          </div>
        </div>
      </td>
      <td className="ak-seen">
        {s.lastLoginAt ? (
          <span title={`${tgl(s.lastLoginAt)} ${hhmm(s.lastLoginAt)}`}>
            {ago(s.lastLoginAt, now)}
          </span>
        ) : s.invited ? (
          <span className="l-staf-chip" data-tone="accent">
            Belum ada sandi
          </span>
        ) : (
          <span className="ak-faint">Belum pernah</span>
        )}
      </td>
      <td className="ak-col-join ak-num">{tgl(s.createdAt)}</td>
      <td className="ak-end">
        <div className="ak-acts">
          <button
            type="button"
            className="l-staf-iconbtn"
            aria-label={`Ubah data ${s.name}`}
            title="Ubah data"
            onClick={() => onEdit(s)}
          >
            <Pencil aria-hidden="true" style={{ fontSize: 16 }} />
          </button>
          <button
            type="button"
            className="l-staf-iconbtn"
            aria-label={`${linkTitle} ${s.name}`}
            title={
              s.isActive
                ? linkTitle
                : "Aktifkan akun dulu untuk mengatur kata sandi"
            }
            disabled={!s.isActive}
            onClick={() => onSetPassword(s)}
          >
            <KeyRound aria-hidden="true" style={{ fontSize: 16 }} />
          </button>
        </div>
      </td>
    </tr>
  );
}
