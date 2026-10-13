import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, BellOff, Plus, Search } from "lucide-react";
import { hhmm, rp, rpShort, tglPanjang } from "@starter/shared/fnb/domain";
import type { OrderDto } from "@starter/shared/fnb/types";
import { useToast } from "@/components/fnb/dialog";
import { StafPage } from "@/components/fnb/shell";
import {
  useAdvanceOrder,
  useCancelOrder,
  useTodayOrders,
} from "@/features/orders/hooks";
import { useSettings } from "@/features/settings/hooks";
import { useNow } from "@/lib/use-now";
import { useNewQrOrders } from "../hooks";
import {
  advanceMessage,
  isActive,
  LANES,
  matchesQuery,
  playChime,
  sameDay,
  TYPE_TABS,
  whereLabel,
  type TypeFilter,
} from "../helpers";
import { CancelDialog } from "./kasir-dialogs";
import { OrderCard } from "./order-card";
import { OrderDrawer, type DrawerAction } from "./order-drawer";

const FRESH_MS = 6000;

// Like the prototype's root.kasirState: filter and sound survive leaving and
// returning to the board within this browser session.
const remembered: { type: TypeFilter; q: string; sound: boolean } = {
  type: "ALL",
  q: "",
  sound: true,
};
const remember = (patch: Partial<typeof remembered>) =>
  Object.assign(remembered, patch);

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Terjadi kesalahan. Coba lagi.";

/** The cashier's live board (design/src/pages/kasir.page.html). */
export function KasirScreen({
  cashierName,
  flash,
  onFlashShown,
}: {
  cashierName: string;
  /** One-off message from another screen (e.g. after a manual order). */
  flash?: string;
  onFlashShown: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const now = useNow(20_000);
  const { data: orders } = useTodayOrders({ live: true });
  const { data: settings } = useSettings();

  const advance = useAdvanceOrder();
  const cancel = useCancelOrder();

  const [type, setTypeState] = useState<TypeFilter>(remembered.type);
  const [q, setQState] = useState(remembered.q);
  const [sound, setSoundState] = useState(remembered.sound);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [cancelCode, setCancelCode] = useState<string | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());

  const setType = (v: TypeFilter) => {
    remember({ type: v });
    setTypeState(v);
  };
  const setQ = (v: string) => {
    remember({ q: v });
    setQState(v);
  };

  /* ----- New-order notification ----- */
  const soundRef = useRef(sound);
  const audio = useRef<AudioContext | null>(null);
  const freshTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = freshTimers.current;
    const chime = audio;
    return () => {
      for (const t of timers) clearTimeout(t);
      void chime.current?.close().catch(() => {});
    };
  }, []);

  // Customer QR orders that arrive while the board is open are highlighted
  // and announced.
  useNewQrOrders((o) => {
    setFresh((s) => new Set(s).add(o.code));
    const t = setTimeout(() => {
      freshTimers.current.delete(t);
      setFresh((s) => {
        const next = new Set(s);
        next.delete(o.code);
        return next;
      });
    }, FRESH_MS);
    freshTimers.current.add(t);
    toast(`Pesanan baru — ${whereLabel(o)} (${o.code})`);
    if (soundRef.current) playChime(audio);
  });

  /* ----- Flash from another screen ----- */
  const flashShown = useRef(false);
  useEffect(() => {
    if (!flash || flashShown.current) return;
    flashShown.current = true;
    toast(flash);
    onFlashShown();
  }, [flash, toast, onFlashShown]);

  /* ----- Derived data ----- */
  const active = useMemo(() => orders.filter(isActive), [orders]);
  const stats = useMemo(() => {
    const unpaid = active.filter((o) => o.paymentStatus === "BELUM");
    const finished = orders.filter(
      (o) => o.status === "SELESAI" && sameDay(o.createdAt, now),
    );
    const sum = (list: OrderDto[]) =>
      list.reduce((n, o) => n + o.totalAmount, 0);
    return [
      {
        label: "Pesanan aktif",
        value: String(active.length),
        em: `${active.filter((o) => o.status === "MENUNGGU").length} baru`,
      },
      {
        label: "Belum dibayar",
        value: rp(sum(unpaid)),
        em: `${unpaid.length} pesanan`,
      },
      {
        label: "Selesai hari ini",
        value: String(finished.length),
        em: "pesanan",
      },
      { label: "Penjualan hari ini", value: rpShort(sum(finished)), em: "" },
    ];
  }, [active, orders, now]);

  const visible = active.filter(
    (o) => (type === "ALL" || o.orderType === type) && matchesQuery(o, q),
  );
  const byCode = (code: string | null) =>
    (code && orders.find((o) => o.code === code)) || null;
  const drawerOrder = byCode(openCode);
  const cancelOrder = byCode(cancelCode);
  const busyCode = advance.isPending ? advance.variables : null;

  /* ----- Actions ----- */
  function doAdvance(code: string) {
    advance.mutate(code, {
      onSuccess: (o) => {
        if (o.status === "SELESAI")
          setOpenCode((c) => (c === o.code ? null : c));
        toast(advanceMessage(o));
      },
      onError: (e) => toast(errorMessage(e)),
    });
  }

  // Payment and receipt live on their own screen.
  function goPay(code: string) {
    setOpenCode(null);
    void navigate({ to: "/kasir/bayar", search: { code } });
  }

  function onAction(act: DrawerAction, code: string) {
    if (act === "advance") doAdvance(code);
    else if (act === "pay" || act === "receipt") goPay(code);
    else setCancelCode(code);
  }

  function confirmCancel(code: string, reason: string) {
    cancel.mutate(
      { code, reason },
      {
        onSuccess: () => {
          setCancelCode(null);
          setOpenCode((c) => (c === code ? null : c));
          toast(`${code} dibatalkan — ${reason.toLowerCase()}`);
        },
        onError: (e) => toast(errorMessage(e)),
      },
    );
  }

  function toggleSound() {
    const next = !sound;
    remember({ sound: next });
    soundRef.current = next;
    setSoundState(next);
    toast(next ? "Suara notifikasi aktif" : "Suara notifikasi dimatikan");
  }

  const actions = (
    <>
      <button
        className="l-staf-iconbtn"
        type="button"
        aria-pressed={sound}
        aria-label="Suara notifikasi pesanan baru"
        title="Suara notifikasi"
        onClick={toggleSound}
      >
        {sound ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}
      </button>
      <button
        className="l-staf-btn"
        data-variant="primary"
        type="button"
        onClick={() => void navigate({ to: "/kasir/manual" })}
      >
        <Plus aria-hidden="true" />
        Pesanan manual
      </button>
    </>
  );

  return (
    <StafPage id="kasir" title="Pesanan" actions={actions}>
      <main aria-label="Pesanan" className="p-kasir">
        <div className="k-context">
          <span>{`${tglPanjang(now)} · ${hhmm(now)} · Kasir: ${cashierName}`}</span>
          <span className="l-staf-chip" data-tone="positive">
            Pesanan QR masuk otomatis
          </span>
        </div>

        <section className="k-stats" aria-label="Ringkasan hari ini">
          {stats.map((s) => (
            <div key={s.label} className="l-staf-metric">
              <span>{s.label}</span>
              <strong>
                {s.value}
                {s.em ? <em>{s.em}</em> : null}
              </strong>
            </div>
          ))}
        </section>

        <div className="k-toolbar">
          <div
            className="l-staf-seg"
            role="tablist"
            aria-label="Sumber pesanan"
          >
            {TYPE_TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={type === key}
                onClick={() => setType(key)}
              >
                {label}
                <small>
                  {
                    active.filter((o) => key === "ALL" || o.orderType === key)
                      .length
                  }
                </small>
              </button>
            ))}
          </div>
          <label className="l-staf-search">
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Cari no. pesanan, meja, atau menu"
              aria-label="Cari pesanan"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>

        <div className="k-board" aria-live="polite">
          {LANES.map((lane) => {
            const list = visible
              .filter((o) => o.status === lane.key)
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            return (
              <section
                key={lane.key}
                className="k-lane"
                aria-labelledby={`kasir-lane-${lane.key}`}
              >
                <header className="k-lane-head">
                  <h2 id={`kasir-lane-${lane.key}`}>{lane.title}</h2>
                  <span
                    className="l-staf-chip"
                    data-tone={
                      lane.key === "MENUNGGU" && list.length
                        ? "accent"
                        : "plain"
                    }
                  >
                    {list.length}
                  </span>
                </header>
                <div className="k-lane-body">
                  {list.length ? (
                    list.map((o) => (
                      <OrderCard
                        key={o.code}
                        order={o}
                        now={now}
                        fresh={fresh.has(o.code)}
                        busy={busyCode === o.code}
                        onOpen={setOpenCode}
                        onAction={onAction}
                      />
                    ))
                  ) : (
                    <div className="k-lane-empty">
                      {q ? "Tidak ada yang cocok" : lane.empty}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <OrderDrawer
          order={drawerOrder}
          settings={settings}
          now={now}
          busy={!!drawerOrder && busyCode === drawerOrder.code}
          onClose={() => setOpenCode(null)}
          onAction={onAction}
        />
        <CancelDialog
          order={cancelOrder}
          pending={cancel.isPending}
          onClose={() => setCancelCode(null)}
          onConfirm={confirmCancel}
        />
      </main>
    </StafPage>
  );
}
