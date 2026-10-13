import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Banknote,
  Calendar,
  ChevronDown,
  Coffee,
  CreditCard,
  Download,
  QrCode,
  RotateCcw,
  Search,
  SearchX,
  User,
  UserRound,
  X,
} from "lucide-react";
import {
  hhmm,
  ORDER_STATUS,
  PAY_METHOD,
  rp,
  tgl,
  tglPanjang,
} from "@starter/shared/fnb/domain";
import type { OrderDto } from "@starter/shared/fnb/types";
import { useToast } from "@/components/fnb/dialog";
import { StafPage } from "@/components/fnb/shell";
import { useTodayOrders, useTransactionsPeriod } from "@/features/orders/hooks";
import { useSettings } from "@/features/settings/hooks";
import { downloadCSV } from "@/lib/csv";
import { useNow } from "@/lib/use-now";
import {
  activeKeys,
  cashierNames,
  csvRows,
  dayLabel,
  dayTotals,
  DEFAULT_FILTERS,
  FILTER_LABEL,
  filterTransactions,
  groupByDay,
  isDirty,
  itemsText,
  metrics,
  nf,
  PAGE,
  periodText,
  RANGE,
  RANGE_BUTTONS,
  rangeDates,
  slug,
  SOURCE,
  valueLabel,
  whereLabel,
  ymd,
  type FilterKey,
  type RiwayatFilters,
} from "../filters";
import { TransactionDrawer } from "./transaction-drawer";

// Port of design/src/pages/riwayat.page.html ("Riwayat Transaksi").

type PageState = RiwayatFilters & { shown: number };

// Like the prototype's root.riwayatState: filters survive leaving the page.
let savedState: PageState = { ...DEFAULT_FILTERS, shown: PAGE };

/** The range the page opens with, so the route loader fetches that one. */
export const savedRange = () => savedState.range;

export function RiwayatPage() {
  const now = useNow();
  const [state, setState] = useState<PageState>(savedState);
  // Only the selected range is read from the database; switching range keeps
  // the old rows on screen (a transition) until the new ones arrive.
  const [loading, startTransition] = useTransition();
  const { from, to } = rangeDates(state.range, now);
  const { data: all } = useTransactionsPeriod(from, to);
  const { data: board } = useTodayOrders();
  const { data: settings } = useSettings();
  const toast = useToast();

  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    savedState = state;
  }, [state]);

  const qRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const focusRow = useRef<number | null>(null);

  // "Sesi ini" = finished or cancelled orders on today's cashier board,
  // whatever range is loaded.
  const sessionIds = useMemo(() => new Set(board.map((o) => o.id)), [board]);
  const sessionCount = board.filter(
    (o) => o.status === "SELESAI" || o.status === "DIBATALKAN",
  ).length;

  // Cashiers in the loaded range; a picked one stays listed so the filter
  // survives switching to a range where they have no transactions.
  const names = useMemo(() => {
    const n = cashierNames(all);
    return state.cashier && !n.includes(state.cashier)
      ? [...n, state.cashier]
      : n;
  }, [all, state.cashier]);
  const f = useMemo<RiwayatFilters>(
    () => ({
      range: state.range,
      q: state.q,
      method: state.method,
      source: state.source,
      status: state.status,
      cashier: state.cashier,
    }),
    [
      state.range,
      state.q,
      state.method,
      state.source,
      state.status,
      state.cashier,
    ],
  );
  const list = useMemo(() => filterTransactions(all, f), [all, f]);
  const m = metrics(list);
  const days = useMemo(() => dayTotals(list), [list]);
  const shown = list.slice(0, state.shown);
  const groups = groupByDay(shown);
  const tags = activeKeys(f);
  const q = f.q.trim();
  const has = list.length > 0;

  const openTx = openId ? (all.find((t) => t.id === openId) ?? null) : null;

  function change(patch: Partial<RiwayatFilters>) {
    setState((s) => ({ ...s, ...patch, shown: PAGE }));
  }

  function clear(k: FilterKey | "q") {
    change({ [k]: "" });
    (k === "q"
      ? qRef.current
      : document.getElementById(`riwayat-f-${k}`)
    )?.focus();
  }

  function reset() {
    setState({ ...DEFAULT_FILTERS, shown: PAGE });
    qRef.current?.focus();
  }

  function more() {
    focusRow.current = state.shown;
    setState((s) => ({ ...s, shown: s.shown + PAGE }));
  }

  // After "Tampilkan lebih banyak" reveals the last page, keep focus on the
  // first new row (the button disappears).
  useEffect(() => {
    const from = focusRow.current;
    if (from == null) return;
    focusRow.current = null;
    if (shown.length < list.length) return;
    const rows = tableRef.current?.querySelectorAll<HTMLElement>(".r-tx");
    rows?.[from]?.focus({ preventScroll: true });
  });

  // Day headers stick right under the sticky column header.
  useLayoutEffect(() => {
    const measure = () => {
      const h = theadRef.current?.offsetHeight;
      if (h) tableRef.current?.style.setProperty("--r-head", h + "px");
    };
    measure();
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, [has]);

  function downloadFiltered() {
    if (!list.length) return;
    downloadCSV(
      `riwayat-transaksi-${slug(settings.cafeName)}-${ymd(new Date())}.csv`,
      csvRows(list),
    );
    toast(
      `CSV diunduh · ${nf(list.length)} transaksi (${RANGE[f.range].toLowerCase()})`,
    );
  }

  const emptyRange =
    f.range === "yesterday"
      ? "kemarin"
      : f.range === "today"
        ? "hari ini"
        : "di rentang ini";
  const anyInRange = all.length > 0;

  return (
    <StafPage
      id="riwayat"
      title="Riwayat Transaksi"
      actions={
        <button
          className="l-staf-btn"
          data-variant="primary"
          type="button"
          data-action="csv"
          disabled={!has}
          title={
            has
              ? `Unduh ${nf(list.length)} transaksi terfilter sebagai CSV`
              : "Tidak ada transaksi untuk diunduh"
          }
          onClick={downloadFiltered}
        >
          <Download aria-hidden="true" />
          Unduh CSV
        </button>
      }
    >
      <main
        aria-label="Riwayat Transaksi"
        className="p-riwayat"
        data-node-id="riwayat"
        aria-busy={loading}
      >
        <p className="r-context" data-node-id="riwayat.context">
          <span>
            <Calendar aria-hidden="true" style={{ fontSize: 16 }} />
            {tglPanjang(now)} · pukul {hhmm(now)}
          </span>
          <span
            className="l-staf-chip"
            data-tone={sessionCount ? "accent" : "plain"}
          >
            {sessionCount
              ? `${nf(sessionCount)} transaksi dari sesi kasir hari ini`
              : "Tersambung ke layar Pesanan"}
          </span>
        </p>

        <section
          className="r-filters"
          aria-label="Filter transaksi"
          data-node-id="riwayat.filters"
        >
          <div className="r-frow">
            <div
              className="l-staf-seg r-range"
              role="group"
              aria-label="Rentang tanggal"
            >
              {RANGE_BUTTONS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={f.range === key}
                  onClick={() => {
                    if (key !== f.range)
                      startTransition(() => change({ range: key }));
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="l-staf-search">
              <Search aria-hidden="true" />
              <input
                ref={qRef}
                type="search"
                placeholder="Cari pesanan, meja, menu, pelanggan"
                aria-label="Cari transaksi berdasarkan nomor pesanan, meja, menu, atau pelanggan"
                autoComplete="off"
                value={f.q}
                onChange={(e) => change({ q: e.target.value })}
              />
            </label>
          </div>
          <div className="r-frow r-picks">
            <Pick
              k="method"
              value={f.method}
              onChange={(v) =>
                change({ method: v as RiwayatFilters["method"] })
              }
              options={[
                ["CASH", "Tunai"],
                ["NON_CASH", "Non-tunai"],
              ]}
            />
            <Pick
              k="source"
              value={f.source}
              onChange={(v) =>
                change({ source: v as RiwayatFilters["source"] })
              }
              options={[
                ["QR", "QR"],
                ["MANUAL", "Kasir"],
              ]}
            />
            <Pick
              k="status"
              value={f.status}
              onChange={(v) =>
                change({ status: v as RiwayatFilters["status"] })
              }
              options={[
                ["SELESAI", "Selesai"],
                ["DIBATALKAN", "Dibatalkan"],
              ]}
            />
            <Pick
              k="cashier"
              value={f.cashier}
              onChange={(v) => change({ cashier: v })}
              options={names.map((n) => [n, n])}
            />
          </div>
          <div className="r-summary" data-node-id="riwayat.summary">
            <span aria-live="polite">
              <b>{nf(list.length)}</b> transaksi · {RANGE[f.range]},{" "}
              {periodText(f.range, now)}
            </span>
            <span className="r-tags">
              {q && (
                <button
                  type="button"
                  className="r-tag"
                  aria-label={`Hapus pencarian ${q}`}
                  onClick={() => clear("q")}
                >
                  <span>Cari</span>“{q}”
                  <X aria-hidden="true" style={{ fontSize: 14 }} />
                </button>
              )}
              {tags.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="r-tag"
                  aria-label={`Hapus filter ${FILTER_LABEL[k].toLowerCase()} ${valueLabel(k, f[k])}`}
                  onClick={() => clear(k)}
                >
                  <span>{FILTER_LABEL[k]}</span>
                  {valueLabel(k, f[k])}
                  <X aria-hidden="true" style={{ fontSize: 14 }} />
                </button>
              ))}
            </span>
            <button
              className="l-staf-btn"
              data-variant="ghost"
              data-size="sm"
              type="button"
              hidden={!isDirty(f)}
              onClick={reset}
            >
              <RotateCcw aria-hidden="true" />
              Reset filter
            </button>
          </div>
        </section>

        <section
          className="r-kpis"
          aria-label="Ringkasan transaksi terfilter"
          data-node-id="riwayat.metrics"
        >
          <div className="l-staf-metric">
            <span>Jumlah transaksi</span>
            <strong>{nf(m.done)}</strong>
            <small>
              {m.voids ? (
                <>
                  <b>{nf(m.voids)}</b> dibatalkan, tidak dihitung
                </>
              ) : (
                "selesai & lunas"
              )}
            </small>
          </div>
          <div className="l-staf-metric">
            <span>Total penjualan</span>
            <strong title={rp(m.rev)}>{rp(m.rev)}</strong>
            <small>
              {m.done ? (
                <>
                  Rata-rata <b>{rp(m.rev / m.done)}</b>
                </>
              ) : (
                "Belum ada penjualan"
              )}
            </small>
          </div>
          <div className="l-staf-metric">
            <span>Tunai</span>
            <strong title={rp(m.cash.amt)}>{rp(m.cash.amt)}</strong>
            <small>
              <b>{nf(m.cash.n)}</b> transaksi · {m.pct(m.cash.amt)}
            </small>
          </div>
          <div className="l-staf-metric">
            <span>Non-tunai</span>
            <strong title={rp(m.non.amt)}>{rp(m.non.amt)}</strong>
            <small>
              <b>{nf(m.non.n)}</b> transaksi · {m.pct(m.non.amt)}
            </small>
          </div>
        </section>

        <section
          className="l-staf-card r-ledger"
          aria-labelledby="riwayat-ledger-title"
          data-node-id="riwayat.ledger"
        >
          <div className="l-staf-card-head">
            <div>
              <h2 id="riwayat-ledger-title">Daftar transaksi</h2>
              <p>
                {has
                  ? `Terbaru di atas${days.size > 1 ? `, dikelompokkan per hari (${nf(days.size)} hari)` : ""}. `
                  : ""}
                Pilih baris untuk melihat detail dan mencetak ulang struk.
              </p>
            </div>
          </div>
          <table ref={tableRef} className="l-staf-table r-table" hidden={!has}>
            <caption className="r-sr">
              Daftar transaksi dikelompokkan per hari, terbaru di atas. Pilih
              baris untuk membuka detail.
            </caption>
            <thead ref={theadRef}>
              <tr>
                <th scope="col" className="c-jam">
                  Jam
                </th>
                <th scope="col" className="c-code">
                  No. pesanan
                </th>
                <th scope="col" className="c-src">
                  Sumber
                </th>
                <th scope="col" className="c-meja">
                  Meja
                </th>
                <th scope="col" className="c-items">
                  Item
                </th>
                <th scope="col" className="c-total l-staf-num">
                  Total
                </th>
                <th scope="col" className="c-pm">
                  Metode
                </th>
                <th scope="col" className="c-kasir">
                  Kasir
                </th>
                <th scope="col" className="c-st">
                  Status
                </th>
              </tr>
            </thead>
            {groups.map((g) => {
              const o = days.get(g.k)!;
              const [bold, rest] = dayLabel(g.k, now);
              return (
                <tbody key={g.k}>
                  <tr className="r-day">
                    <th colSpan={9} scope="rowgroup">
                      <div className="r-day-in">
                        <span>
                          <b>{bold}</b> · {rest}
                        </span>
                        <span className="r-day-sum">
                          {nf(o.n)} transaksi
                          {o.voids ? ` · ${nf(o.voids)} batal` : ""} · Total{" "}
                          <b>{rp(o.rev)}</b>
                        </span>
                      </div>
                    </th>
                  </tr>
                  {g.rows.map((t) => (
                    <TxRow
                      key={t.id}
                      t={t}
                      session={sessionIds.has(t.id)}
                      onOpen={() => setOpenId(t.id)}
                    />
                  ))}
                </tbody>
              );
            })}
          </table>
          {!has && (
            <div className="l-staf-empty">
              {anyInRange || q || tags.length ? (
                <>
                  <SearchX aria-hidden="true" style={{ fontSize: 28 }} />
                  <h3>Tidak ada transaksi yang cocok</h3>
                  <p>
                    Coba kata kunci lain, ubah rentang tanggal, atau hapus
                    sebagian filter.
                  </p>
                  <button
                    type="button"
                    className="l-staf-btn"
                    data-size="sm"
                    onClick={reset}
                  >
                    <RotateCcw aria-hidden="true" style={{ fontSize: 16 }} />
                    Reset filter
                  </button>
                </>
              ) : (
                <>
                  <Coffee aria-hidden="true" style={{ fontSize: 28 }} />
                  <h3>Belum ada transaksi {emptyRange}</h3>
                  <p>
                    Pesanan yang sudah dibayar atau dibatalkan dari layar
                    Pesanan otomatis tercatat di sini.
                  </p>
                </>
              )}
            </div>
          )}
          {has && (
            <div className="r-foot">
              <span>
                {shown.length < list.length ? (
                  <>
                    Menampilkan <b>{nf(shown.length)}</b> dari{" "}
                    <b>{nf(list.length)}</b> transaksi
                  </>
                ) : (
                  <>
                    Semua <b>{nf(list.length)}</b> transaksi ditampilkan
                  </>
                )}
              </span>
              <button
                className="l-staf-btn"
                data-size="sm"
                type="button"
                hidden={shown.length >= list.length}
                aria-label={`Tampilkan ${nf(Math.min(PAGE, list.length - shown.length))} transaksi lagi`}
                onClick={more}
              >
                <ChevronDown aria-hidden="true" />
                Tampilkan lebih banyak
              </button>
            </div>
          )}
        </section>

        <TransactionDrawer
          tx={openTx}
          session={!!openTx && sessionIds.has(openTx.id)}
          settings={settings}
          now={now}
          onClose={() => setOpenId(null)}
        />
      </main>
    </StafPage>
  );
}

function Pick({
  k,
  value,
  onChange,
  options,
}: {
  k: FilterKey;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  const id = `riwayat-f-${k}`;
  return (
    <div className="r-pick" data-on={value ? "" : undefined}>
      <label htmlFor={id}>{FILTER_LABEL[k]}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Semua</option>
        {options.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TxRow({
  t,
  session,
  onOpen,
}: {
  t: OrderDto;
  session: boolean;
  onOpen: () => void;
}) {
  const st = ORDER_STATUS[t.status];
  const items = itemsText(t);
  return (
    <tr
      className="r-tx"
      tabIndex={0}
      data-void={t.status === "DIBATALKAN" ? "" : undefined}
      data-session={session ? "" : undefined}
      aria-label={`${t.code}${session ? " (sesi ini)" : ""}, ${tgl(t.createdAt, { day: "numeric", month: "short" })} pukul ${hhmm(t.createdAt)}, ${whereLabel(t)}, ${rp(t.totalAmount)}, ${st.label}. Buka detail`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <td className="c-jam">{hhmm(t.createdAt)}</td>
      <td className="c-code">
        <span className="r-code">
          <b>{t.code}</b>
          {session && (
            <span className="l-staf-chip r-sesi" data-tone="accent">
              Sesi ini
            </span>
          )}
        </span>
      </td>
      <td className="c-src">
        <span className="l-staf-chip r-src" data-tone="plain">
          {t.orderType === "QR" ? (
            <QrCode aria-hidden="true" style={{ fontSize: 13 }} />
          ) : (
            <User aria-hidden="true" style={{ fontSize: 13 }} />
          )}
          {SOURCE[t.orderType]}
        </span>
      </td>
      <td className="c-meja">
        {t.tableNumber ? (
          "Meja " + t.tableNumber
        ) : (
          <span className="r-muted">Bawa pulang</span>
        )}
      </td>
      <td className="c-items">
        <span className="r-items" title={items}>
          {items}
        </span>
      </td>
      <td className="c-total l-staf-num">
        <span className="r-tot">{rp(t.totalAmount)}</span>
      </td>
      <td className="c-pm">
        {t.paymentMethod ? (
          <span className="r-pm">
            {t.paymentMethod === "CASH" ? (
              <Banknote aria-hidden="true" style={{ fontSize: 16 }} />
            ) : (
              <CreditCard aria-hidden="true" style={{ fontSize: 16 }} />
            )}
            {PAY_METHOD[t.paymentMethod]}
          </span>
        ) : (
          <span className="r-muted">—</span>
        )}
      </td>
      <td className="c-kasir">
        {t.cashierName ? (
          <span className="r-kasir" title={t.cashierName}>
            <UserRound aria-hidden="true" style={{ fontSize: 14 }} />
            <span>{t.cashierName}</span>
          </span>
        ) : (
          <span className="r-muted">—</span>
        )}
      </td>
      <td className="c-st">
        <span className="l-staf-chip" data-tone={st.tone}>
          {st.label}
        </span>
      </td>
    </tr>
  );
}
