import { useState, type ReactNode } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import {
  ChartColumn,
  ClipboardList,
  History,
  LogOut,
  Package,
  QrCode,
  SlidersHorizontal,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { initials, ROLE_LABEL } from "@starter/shared/fnb/domain";
import type { StaffRole } from "@starter/shared/fnb/types";
import { useToast } from "@/components/fnb/dialog";
import { useSettingsMaybe } from "@/features/settings/hooks";
import { useTablesMaybe } from "@/features/tables/hooks";
import { authClient } from "@/lib/auth-client";
import { QR_MENU_URL, tableMenuUrl } from "@/lib/env";

// Port of design/src/layouts/staf.layout.html (the "staf" layout).

export type NavItem = {
  to: string;
  label: string;
  title: string;
  icon: LucideIcon;
  /** Also active on sub-paths (/kasir/manual, /kasir/bayar). */
  prefix?: boolean;
  ownerOnly?: boolean;
};

export const NAV: { group: string; ownerOnly?: boolean; items: NavItem[] }[] = [
  {
    group: "Operasional",
    items: [
      {
        to: "/kasir",
        label: "Pesanan",
        title: "Pesanan",
        icon: ClipboardList,
        prefix: true,
      },
      {
        to: "/riwayat",
        label: "Riwayat transaksi",
        title: "Riwayat transaksi",
        icon: History,
      },
      { to: "/stok", label: "Stok Bahan", title: "Stok Bahan", icon: Package },
    ],
  },
  {
    group: "Kelola",
    ownerOnly: true,
    items: [
      {
        to: "/menu-meja",
        label: "Menu & Meja",
        title: "Menu & Meja",
        icon: Utensils,
        ownerOnly: true,
      },
    ],
  },
  {
    group: "Insight & akun",
    ownerOnly: true,
    items: [
      {
        to: "/penjualan",
        label: "Penjualan",
        title: "Penjualan",
        icon: ChartColumn,
        ownerOnly: true,
      },
      {
        to: "/staf",
        label: "Akun & Staf",
        title: "Akun & Staf",
        icon: Users,
        ownerOnly: true,
      },
      {
        to: "/pengaturan",
        label: "Pengaturan",
        title: "Pengaturan",
        icon: SlidersHorizontal,
        ownerOnly: true,
      },
    ],
  },
];

const isCurrent = (item: NavItem, pathname: string) =>
  pathname === item.to || (!!item.prefix && pathname.startsWith(item.to + "/"));

export function StafRail({
  user,
  role,
}: {
  user: { name: string };
  role: StaffRole;
}) {
  const { pathname } = useLocation();
  const { data: settings } = useSettingsMaybe();
  const { data: tables } = useTablesMaybe();
  const cafeName = settings?.cafeName ?? "Kedai Senja";
  const firstTable = tables?.find((t) => t.isActive);
  const owner = role === "OWNER";

  return (
    <aside className="l-staf-rail" aria-label="Navigasi aplikasi kasir">
      <Link
        className="l-staf-brand"
        to="/kasir"
        aria-label={`${cafeName} — IUL FnB POS`}
      >
        <span className="l-staf-mono" aria-hidden="true">
          {initials(cafeName)}
        </span>
        <span>
          <strong>{cafeName}</strong>
          <small>IUL FnB · POS</small>
        </span>
      </Link>

      <nav className="l-staf-nav" aria-label="Menu utama">
        {NAV.filter((g) => owner || !g.ownerOnly).map((g) => (
          <NavGroup key={g.group} group={g.group}>
            {g.items
              .filter((i) => owner || !i.ownerOnly)
              .map((i) => (
                <Link
                  key={i.to}
                  className="l-staf-link"
                  to={i.to}
                  title={i.title}
                  aria-current={isCurrent(i, pathname) ? "page" : undefined}
                >
                  <i.icon aria-hidden="true" />
                  <span className="l-staf-label">{i.label}</span>
                </Link>
              ))}
          </NavGroup>
        ))}
      </nav>

      <div className="l-staf-foot">
        <a
          className="l-staf-qr"
          href={firstTable ? tableMenuUrl(firstTable.tableNumber) : QR_MENU_URL}
          target="_blank"
          rel="noopener"
          title="Menu pelanggan (QR)"
        >
          <QrCode aria-hidden="true" />
          <span className="l-staf-label">Menu pelanggan</span>
        </a>
        <div className="l-staf-user">
          <span className="l-staf-avatar" aria-hidden="true">
            {initials(user.name)}
          </span>
          <span className="l-staf-who">
            <strong>{user.name}</strong>
            <small>{ROLE_LABEL[role]}</small>
          </span>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}

function NavGroup({ group, children }: { group: string; children: ReactNode }) {
  return (
    <>
      <p className="l-staf-group">{group}</p>
      {children}
    </>
  );
}

function SignOutButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const navigate = useNavigate();
  const toast = useToast();
  async function signOut() {
    setPending(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign out failed");
      await router.invalidate();
      await navigate({ to: "/sign-in", replace: true });
    } catch {
      toast("Gagal keluar. Coba lagi.");
    } finally {
      setPending(false);
    }
  }
  return (
    <button
      type="button"
      className="l-staf-out"
      aria-label="Keluar"
      title="Keluar"
      onClick={signOut}
      disabled={pending}
    >
      <LogOut aria-hidden="true" />
    </button>
  );
}

/**
 * One staf-layout page: fills the layout's title / headerActions / content
 * slots. Everything is wrapped in [data-page="<id>"] so the page's CSS
 * (styles/pages/<id>.css) applies to header, content, and its dialogs.
 */
export function StafPage({
  id,
  title,
  actions,
  children,
}: {
  id: string;
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-page={id} style={{ display: "contents" }}>
      <header className="l-staf-head">
        <h1 className="l-staf-title">{title}</h1>
        <div className="l-staf-actions">{actions}</div>
      </header>
      <div className="l-staf-content">{children}</div>
    </div>
  );
}
