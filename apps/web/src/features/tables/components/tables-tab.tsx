import { CircleCheck, Plus, QrCode } from "lucide-react";
import type { TableDto } from "@starter/shared/fnb/types";
import { TableQr } from "@/components/fnb/table-qr";
import { EmptyCard } from "@/features/menu/components/empty-card";

const AREA_ORDER = ["Dalam", "Teras"];

/** Known areas first, then any other area used by a table. */
export function areaList(tables: TableDto[]) {
  const s = new Set(AREA_ORDER);
  tables.forEach((t) => {
    if (t.area) s.add(t.area);
  });
  return [...s];
}

export function TablesTab({
  hidden,
  tables,
  unprinted,
  filter,
  onFilter,
  markState,
  onAdd,
  onQr,
  onToggle,
}: {
  hidden: boolean;
  tables: TableDto[];
  unprinted: string[];
  filter: string;
  onFilter: (v: string) => void;
  markState: (key: string) => "current" | undefined;
  onAdd: () => void;
  onQr: (id: string) => void;
  onToggle: (table: TableDto, on: boolean) => void;
}) {
  const off = tables.filter((t) => !t.isActive).length;
  const chips: [string, string, number][] = [
    ["all", "Semua", tables.length],
    ...areaList(tables).map((a): [string, string, number] => [
      a,
      a,
      tables.filter((t) => t.area === a).length,
    ]),
    ["off", "Nonaktif", off],
  ];
  const list = tables.filter(
    (t) =>
      filter === "all" || (filter === "off" ? !t.isActive : t.area === filter),
  );

  return (
    <section
      className="mm-panel"
      id="menu-meja-panel-meja"
      role="tabpanel"
      aria-labelledby="menu-meja-tab-meja"
      hidden={hidden}
    >
      <div className="mm-tbar">
        <div className="l-staf-seg" role="group" aria-label="Filter meja">
          {chips.map(([v, label, n]) => (
            <button
              key={v}
              type="button"
              aria-pressed={filter === v}
              onClick={() => onFilter(v)}
            >
              {label}
              <small>{n}</small>
            </button>
          ))}
        </div>
        <span className="mm-tnote">
          <QrCode aria-hidden="true" style={{ fontSize: 15 }} />
          QR ilustrasi — QR asli dibuat oleh sistem
        </span>
      </div>
      <div className="mm-tgrid">
        {list.map((t) => (
          <TableCard
            key={t.id}
            table={t}
            unprinted={unprinted.includes(t.id)}
            state={markState(`table:${t.id}`)}
            onQr={() => onQr(t.id)}
            onToggle={(on) => onToggle(t, on)}
          />
        ))}
        {filter !== "off" ? (
          <button type="button" className="mm-add" data-tall="" onClick={onAdd}>
            <span className="mm-add-plus">
              <Plus aria-hidden="true" style={{ fontSize: 20 }} />
            </span>
            <strong>Tambah meja</strong>
            <small>QR unik dibuat otomatis</small>
          </button>
        ) : (
          !list.length && (
            <EmptyCard
              icon={CircleCheck}
              title="Semua meja aktif"
              text="Tidak ada meja yang sedang dinonaktifkan."
            />
          )
        )}
      </div>
    </section>
  );
}

function TableBadges({
  table,
  unprinted,
}: {
  table: TableDto;
  unprinted: boolean;
}) {
  return (
    <>
      {table.isActive ? (
        <span className="l-staf-chip" data-tone="positive">
          Aktif
        </span>
      ) : (
        <span className="l-staf-chip" data-tone="plain">
          Nonaktif
        </span>
      )}
      {unprinted && (
        <span className="l-staf-chip" data-tone="warning">
          Belum dicetak
        </span>
      )}
    </>
  );
}

function TableCard({
  table: t,
  unprinted,
  state,
  onQr,
  onToggle,
}: {
  table: TableDto;
  unprinted: boolean;
  state: "current" | undefined;
  onQr: () => void;
  onToggle: (on: boolean) => void;
}) {
  const switchId = `menu-meja-ta-${t.id}`;
  return (
    <article
      className="mm-tcard"
      data-id={t.id}
      data-off={t.isActive ? undefined : ""}
      data-state={state}
    >
      <div className="mm-tc-top">
        <div className="mm-tc-info">
          <span className="mm-tc-label">Meja</span>
          <strong className="mm-tc-no">{t.tableNumber}</strong>
          <span className="mm-tc-area">Area {t.area || "—"}</span>
          <span className="mm-tc-badges">
            <TableBadges table={t} unprinted={unprinted} />
          </span>
        </div>
        <button
          type="button"
          className="mm-tc-qr"
          aria-label={`Lihat QR Meja ${t.tableNumber}`}
          title="Lihat QR"
          onClick={onQr}
        >
          <TableQr code={t.qrCode} size={92} decorative />
        </button>
      </div>
      <div className="mm-tc-foot">
        <button
          type="button"
          className="l-staf-btn"
          data-size="sm"
          onClick={onQr}
        >
          <QrCode aria-hidden="true" style={{ fontSize: 16 }} />
          Lihat QR
        </button>
        <div className="mm-avail">
          <label className="mm-avail-txt" htmlFor={switchId}>
            {t.isActive ? "Aktif" : "Nonaktif"}
          </label>
          <label className="l-staf-switch">
            <input
              type="checkbox"
              role="switch"
              id={switchId}
              checked={t.isActive}
              onChange={(e) => onToggle(e.target.checked)}
              aria-label={`Meja ${t.tableNumber} aktif`}
            />
            <span />
          </label>
        </div>
      </div>
    </article>
  );
}
