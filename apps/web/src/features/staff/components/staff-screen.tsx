import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Plus } from "lucide-react";
import type { StaffRole } from "@starter/shared/fnb/types";
import { StafPage } from "@/components/fnb/shell";
import { useToast } from "@/components/fnb/dialog";
import { useNow } from "@/lib/use-now";
import {
  useSavePermissions,
  useSetStaffActive,
  useSetStaffPassword,
  useStaffMembers,
  useStaffPermissions,
} from "../hooks";
import {
  cashierAccess,
  findMe,
  primaryOwnerId,
  REQUIRES,
  type CashierAccess,
  type PermissionRow,
  type StaffMember,
} from "../model";
import { CashierDemo, PermissionMatrix } from "./access-panel";
import { DeactivateDialog } from "./deactivate-dialog";
import { PasswordDialog } from "./password-dialog";
import { StaffEditor } from "./staff-editor";
import { StaffLedger, type StaffFilter } from "./staff-ledger";
import { StaffLocked } from "./staff-locked";

// Port of design/src/pages/staf.page.html ("Akun & Staf", owner only).

type Tab = "staf" | "akses";

/** Like the prototype's root.stafState: survives leaving and reopening the page. */
const memory: {
  tab: Tab;
  filter: StaffFilter;
  q: string;
  draft: CashierAccess | null;
} = { tab: "staf", filter: "ALL", q: "", draft: null };

type SessionUser = { name: string; email: string };

export function StaffScreen({
  role,
  user,
}: {
  role: StaffRole;
  user: SessionUser;
}) {
  if (role === "CASHIER")
    return (
      <StafPage id="staf" title="Akun & Staf">
        <main aria-label="Akun & Staf" className="p-staf">
          <StaffLocked name={user.name} />
        </main>
      </StafPage>
    );
  return <OwnerStaff user={user} />;
}

const changedCount = (perms: PermissionRow[], draft: CashierAccess) =>
  perms.filter((p) => p.CASHIER !== draft[p.key]).length;

/** Rows that just changed get a temporary accent marker (6 s). */
function useFresh() {
  const [ids, setIds] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);
  const mark = useCallback((id: string) => {
    setIds((x) => (x.includes(id) ? x : [...x, id]));
    timers.current.push(
      setTimeout(() => setIds((x) => x.filter((i) => i !== id)), 6000),
    );
  }, []);
  return [ids, mark] as const;
}

function OwnerStaff({ user }: { user: SessionUser }) {
  const toast = useToast();
  const now = useNow(60_000);
  const { data: staff } = useStaffMembers();
  const { data: perms } = useStaffPermissions();
  const setActive = useSetStaffActive();
  const setPassword = useSetStaffPassword();
  const savePerms = useSavePermissions();

  const me = findMe(staff, user.email);
  const meId = me?.id ?? "";
  const primaryId = primaryOwnerId(staff);

  const [tab, setTabState] = useState<Tab>(memory.tab);
  const [filter, setFilter] = useState<StaffFilter>(memory.filter);
  const [q, setQ] = useState(memory.q);
  const [draft, setDraft] = useState<CashierAccess>(
    () => memory.draft ?? cashierAccess(perms),
  );
  const dirty = changedCount(perms, draft);
  useEffect(() => {
    Object.assign(memory, { tab, filter, q, draft: dirty ? draft : null });
  }, [tab, filter, q, draft, dirty]);

  const [editor, setEditor] = useState<{
    open: boolean;
    target: StaffMember | null;
  }>({ open: false, target: null });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [passwordId, setPasswordId] = useState<string | null>(null);
  const [fresh, markFresh] = useFresh();
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    staf: null,
    akses: null,
  });
  const savebarRef = useRef<HTMLDivElement>(null);

  // Leaving the page with unsaved permission changes.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    addEventListener("beforeunload", onUnload);
    return () => removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  const fail = (err: unknown) =>
    toast(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi.");

  function setTab(t: Tab, focus = false) {
    setTabState(t);
    if (focus) tabRefs.current[t]?.focus();
  }

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    const order: Tab[] = ["staf", "akses"];
    const i = order.indexOf(tab);
    let n: number | null = null;
    if (e.key === "ArrowRight") n = (i + 1) % order.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + order.length) % order.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = order.length - 1;
    if (n === null) return;
    e.preventDefault();
    setTab(order[n], true);
  }

  function toggleActive(s: StaffMember, active: boolean) {
    if (s.id === primaryId) return;
    if (!active) {
      setConfirmId(s.id); // wait for confirmation
      return;
    }
    setActive.mutate(
      { id: s.id, active: true },
      {
        onSuccess: () => {
          markFresh(s.id);
          toast(`${s.name} aktif lagi dan bisa masuk seperti biasa`);
        },
        onError: fail,
      },
    );
  }

  function confirmDeactivate(s: StaffMember) {
    setConfirmId(null);
    setActive.mutate(
      { id: s.id, active: false },
      {
        onSuccess: () => {
          markFresh(s.id);
          toast(
            `${s.name} dinonaktifkan — riwayat transaksinya tetap tersimpan`,
          );
        },
        onError: fail,
      },
    );
  }

  function savePassword(s: StaffMember, password: string) {
    setPassword.mutate(
      { id: s.id, password },
      {
        onSuccess: () => {
          setPasswordId(null);
          markFresh(s.id);
          toast(
            s.invited
              ? `${s.name} sekarang bisa masuk dengan kata sandi baru`
              : `Kata sandi ${s.name} diganti — ia perlu masuk lagi`,
          );
        },
        onError: fail,
      },
    );
  }

  function onSaved(id: string, created: boolean) {
    setEditor((x) => ({ ...x, open: false }));
    markFresh(id);
    if (created) {
      setFilter("ALL");
      setQ("");
      setTab("staf");
    }
  }

  function togglePerm(key: PermissionRow["key"], on: boolean) {
    setDraft((d) => {
      const next = { ...d, [key]: on };
      if (!on)
        for (const [child, parent] of Object.entries(REQUIRES))
          if (parent === key) next[child as PermissionRow["key"]] = false;
      return next;
    });
  }

  function cancelPerms() {
    setDraft(cashierAccess(perms));
    toast("Perubahan hak akses dibatalkan");
  }

  function savePermsNow() {
    savePerms.mutate(draft, {
      onSuccess: (saved) => {
        setDraft(cashierAccess(saved));
        toast("Hak akses kasir disimpan · berlaku saat kasir masuk lagi");
      },
      onError: fail,
    });
  }

  function nudgeSavebar() {
    setTab("akses");
    const bar = savebarRef.current;
    if (bar) {
      bar.removeAttribute("data-nudge");
      void bar.offsetWidth; // restart the animation
      bar.setAttribute("data-nudge", "");
    }
    toast("Simpan atau batalkan perubahan hak akses dulu");
  }

  const active = staff.filter((s) => s.isActive).length;
  const confirmTarget = staff.find((s) => s.id === confirmId) ?? null;
  const passwordTarget = staff.find((s) => s.id === passwordId) ?? null;
  const cashier = staff.find((s) => s.role === "CASHIER");

  return (
    <StafPage
      id="staf"
      title="Akun & Staf"
      actions={
        <button
          className="l-staf-btn"
          data-variant="primary"
          type="button"
          onClick={() => setEditor({ open: true, target: null })}
        >
          <Plus aria-hidden="true" />
          Tambah staf
        </button>
      }
    >
      <main aria-label="Akun & Staf" className="p-staf">
        <p className="ak-context">
          <span>
            {active} akun aktif · {staff.length - active} nonaktif
          </span>
        </p>

        <div className="ak-panel">
          <div
            className="l-staf-tabs"
            role="tablist"
            aria-label="Akun & Staf"
            onKeyDown={onTabKey}
          >
            <button
              ref={(el) => {
                tabRefs.current.staf = el;
              }}
              type="button"
              role="tab"
              id="staf-tab-staf"
              aria-selected={tab === "staf"}
              aria-controls="staf-panel-staf"
              tabIndex={tab === "staf" ? 0 : -1}
              onClick={() => setTab("staf")}
            >
              Staf <span className="ak-count">{staff.length}</span>
            </button>
            <button
              ref={(el) => {
                tabRefs.current.akses = el;
              }}
              type="button"
              role="tab"
              id="staf-tab-akses"
              aria-selected={tab === "akses"}
              aria-controls="staf-panel-akses"
              tabIndex={tab === "akses" ? 0 : -1}
              onClick={() => setTab("akses")}
            >
              Hak Akses
            </button>
          </div>

          <section
            className="ak-panel"
            id="staf-panel-staf"
            role="tabpanel"
            aria-labelledby="staf-tab-staf"
            hidden={tab !== "staf"}
          >
            <StaffLedger
              staff={staff}
              now={now}
              meId={me?.id}
              primaryId={primaryId}
              filter={filter}
              q={q}
              fresh={fresh}
              onFilter={setFilter}
              onQuery={setQ}
              onClear={() => {
                setQ("");
                setFilter("ALL");
              }}
              onEdit={(s) => setEditor({ open: true, target: s })}
              onToggle={toggleActive}
              onSetPassword={(s) => setPasswordId(s.id)}
            />
          </section>

          <section
            className="ak-panel ak-akses"
            id="staf-panel-akses"
            role="tabpanel"
            aria-labelledby="staf-tab-akses"
            hidden={tab !== "akses"}
          >
            <PermissionMatrix
              perms={perms}
              draft={draft}
              saving={savePerms.isPending}
              savebarRef={savebarRef}
              onToggle={togglePerm}
              onCancel={cancelPerms}
              onSave={savePermsNow}
            />
            <div className="ak-side">
              <CashierDemo
                perms={perms}
                cashier={cashier}
                dirty={dirty > 0}
                onBlocked={nudgeSavebar}
              />
            </div>
          </section>
        </div>

        <StaffEditor
          open={editor.open}
          target={editor.target}
          staff={staff}
          perms={perms}
          primaryId={primaryId}
          meId={meId}
          onClose={() => setEditor((x) => ({ ...x, open: false }))}
          onSaved={onSaved}
        />
        <PasswordDialog
          target={passwordTarget}
          pending={setPassword.isPending}
          onClose={() => setPasswordId(null)}
          onConfirm={savePassword}
        />
        <DeactivateDialog
          target={confirmTarget}
          pending={setActive.isPending}
          onClose={() => setConfirmId(null)}
          onConfirm={confirmDeactivate}
        />
      </main>
    </StafPage>
  );
}
