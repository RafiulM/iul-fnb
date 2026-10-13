import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChartColumn, Coffee, Table } from "lucide-react";
import { rp } from "@starter/shared/fnb/domain";
import {
  bestOf,
  chartSummary,
  metricName,
  nf,
  periodText,
  sum,
  type Bucket,
  type Metric,
  type Period,
  type RangeKey,
} from "@/features/sales/aggregate";
import { chartGeometry, valFmt, valFull } from "@/features/sales/chart";
import { useElementWidth } from "./bits";

// "Grafik penjualan" card: hand-made SVG bars with tooltip, keyboard reading,
// a data-table view, and an empty state.

const tipText = (b: Bucket) =>
  `${b.title}${b.current ? ", masih berjalan" : ""}: penjualan ${rp(b.rev)}, ${nf(b.cnt)} pesanan.`;

export function SalesChart({
  buckets,
  period: p,
  metric,
  onMetric,
  tableView,
  onTableView,
  openFrom,
  early,
  announce,
}: {
  buckets: Bucket[];
  period: Period;
  metric: Metric;
  onMetric: (m: Metric) => void;
  tableView: boolean;
  onTableView: (v: boolean) => void;
  /** Today's opening time "08:00", for the early-morning empty state. */
  openFrom: string;
  early: boolean;
  announce: (msg: string) => void;
}) {
  const has = buckets.some((b) => b.cnt > 0);
  const isHour = p.key === "today";

  return (
    <section
      className="l-staf-card"
      aria-labelledby="penjualan-chart-title"
      data-node-id="penjualan.chart"
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="penjualan-chart-title">Grafik penjualan</h2>
          <p>
            {(isHour ? "Per jam · " : "Per hari · ") +
              periodText(p.start, p.end)}
          </p>
        </div>
        <div className="pj-tools">
          <div
            className="l-staf-seg pj-seg-sm"
            role="group"
            aria-label="Ukuran yang ditampilkan"
            data-part="metric-seg"
          >
            {(
              [
                ["rev", "Penjualan"],
                ["cnt", "Pesanan"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={metric === m}
                onClick={() => metric !== m && onMetric(m)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="l-staf-iconbtn pj-toggle"
            type="button"
            aria-pressed={tableView}
            aria-label={
              tableView ? "Tampilkan sebagai grafik" : "Tampilkan sebagai tabel"
            }
            title={
              tableView ? "Tampilkan sebagai grafik" : "Tampilkan sebagai tabel"
            }
            onClick={() => onTableView(!tableView)}
          >
            {tableView ? (
              <ChartColumn aria-hidden="true" style={{ fontSize: 18 }} />
            ) : (
              <Table aria-hidden="true" style={{ fontSize: 18 }} />
            )}
          </button>
        </div>
      </div>
      <div className="l-staf-card-body">
        {has && <ChartMeta buckets={buckets} metric={metric} isHour={isHour} />}
        <div className="pj-chart-box" hidden={!has || tableView}>
          {has && !tableView && (
            <Plot
              buckets={buckets}
              metric={metric}
              period={p}
              announce={announce}
            />
          )}
        </div>
        <div className="pj-chart-table" hidden={!has || !tableView}>
          {has && <ChartTable buckets={buckets} period={p} />}
        </div>
        <div className="l-staf-empty pj-chart-empty" hidden={has}>
          <Coffee aria-hidden="true" style={{ fontSize: 28 }} />
          <h3>Belum ada penjualan {isHour ? "hari ini" : "di periode ini"}</h3>
          <p>
            {early
              ? `Kedai buka pukul ${openFrom.replace(":", ".")}. Grafik terisi otomatis begitu pesanan pertama selesai.`
              : "Grafik terisi otomatis begitu ada pesanan yang selesai."}
          </p>
        </div>
      </div>
    </section>
  );
}

function ChartMeta({
  buckets: B,
  metric,
  isHour,
}: {
  buckets: Bucket[];
  metric: Metric;
  isHour: boolean;
}) {
  const best = bestOf(B, metric);
  const full = B.filter((b) => !b.future && !b.current);
  const hasCur = B.some((b) => b.current);
  return (
    <div className="pj-chart-meta">
      <div>
        <span>
          {isHour ? "Jam tersibuk" : "Hari tersibuk"}: <b>{best.short}</b> ·{" "}
          {valFmt(best[metric], metric)}
        </span>
        {!isHour && full.length > 0 && (
          <>
            <span className="pj-dot-sep" aria-hidden="true">
              ·
            </span>
            <span>
              Rata-rata{" "}
              <b>{valFmt(sum(full, (b) => b[metric]) / full.length, metric)}</b>{" "}
              per hari
            </span>
          </>
        )}
      </div>
      <span className="pj-keys" aria-hidden="true">
        <span className="pj-key">
          <i style={{ background: "var(--pj-mute)" }} />
          {isHour ? "Jam sebelumnya" : "Hari sebelumnya"}
        </span>
        {hasCur && (
          <span className="pj-key">
            <i style={{ background: "var(--color-accent)" }} />
            {isHour ? "Jam ini" : "Hari ini"} (berjalan)
          </span>
        )}
      </span>
    </div>
  );
}

function ChartTable({
  buckets,
  period: p,
}: {
  buckets: Bucket[];
  period: Period;
}) {
  const B = buckets.filter((b) => !b.future);
  const isHour = p.key === "today";
  const tr = sum(B, (b) => b.rev);
  const tc = sum(B, (b) => b.cnt);
  return (
    <table className="l-staf-table">
      <caption className="pj-sr">
        Data grafik penjualan, {periodText(p.start, p.end)}
      </caption>
      <thead>
        <tr>
          <th scope="col">{isHour ? "Jam" : "Tanggal"}</th>
          <th scope="col" className="l-staf-num">
            Penjualan
          </th>
          <th scope="col" className="l-staf-num">
            Pesanan
          </th>
          <th scope="col" className="l-staf-num">
            Rata-rata
          </th>
        </tr>
      </thead>
      <tbody>
        {B.slice()
          .reverse()
          .map((b) => (
            <tr key={b.title} data-cur={b.current ? "" : undefined}>
              <td>
                {b.title}
                {b.current && (
                  <span className="l-staf-chip" data-tone="accent">
                    berjalan
                  </span>
                )}
              </td>
              <td className="l-staf-num">{rp(b.rev)}</td>
              <td className="l-staf-num">{nf(b.cnt)}</td>
              <td className="l-staf-num">{b.cnt ? rp(b.rev / b.cnt) : "—"}</td>
            </tr>
          ))}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          <td className="l-staf-num">{rp(tr)}</td>
          <td className="l-staf-num">{nf(tc)}</td>
          <td className="l-staf-num">{tc ? rp(tr / tc) : "—"}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function Plot({
  buckets: B,
  metric,
  period: p,
  announce,
}: {
  buckets: Bucket[];
  metric: Metric;
  period: Period;
  announce: (msg: string) => void;
}) {
  const plotRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const W = useElementWidth(plotRef);
  const mode = p.key as RangeKey;
  const geo = useMemo(
    () => (W ? chartGeometry(B, metric, mode, W) : null),
    [B, metric, mode, W],
  );
  // The active bar belongs to one range; switching range clears it.
  const [act, setAct] = useState<{ k: string; i: number } | null>(null);
  const active =
    act && act.k === p.key && B[act.i] && !B[act.i]!.future ? act.i : null;

  const validIdx = () =>
    B.map((b, i) => (b.future ? -1 : i)).filter((i) => i >= 0);

  function setActive(i: number | null, speak = false) {
    if (i == null || !B[i] || B[i].future) {
      setAct(null);
      return;
    }
    setAct({ k: p.key, i });
    if (speak) announce(tipText(B[i]));
  }

  // Tooltip placement needs its rendered size.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!tip || !geo || active == null) return;
    const b = B[active]!;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const x = geo.M.l + geo.band * (active + 0.5);
    const yTop = geo.Y(b[metric]);
    if (yTop - th - 10 >= 0) {
      // Fits above the bar.
      tip.style.transform = "";
      tip.style.left =
        Math.min(Math.max(x, tw / 2 + 2), geo.W - tw / 2 - 2) + "px";
      tip.style.top = yTop + "px";
    } else {
      // Tall bar: put it beside so it does not cover the card head.
      const gap = geo.bw / 2 + 10;
      tip.style.transform = "none";
      tip.style.left =
        (x + gap + tw <= geo.W ? x + gap : Math.max(0, x - gap - tw)) + "px";
      tip.style.top = Math.max(0, yTop - 4) + "px";
    }
  }, [active, geo, metric, B]);

  function pickBar(e: React.PointerEvent<HTMLDivElement>) {
    if (!geo) return;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const i = Math.floor((x - geo.M.l) / geo.band);
    setActive(x >= geo.M.l - 6 && i >= 0 && i < B.length ? i : null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const v = validIdx();
    if (!v.length) return;
    let pos = active == null ? -1 : v.indexOf(active);
    if (e.key === "ArrowRight")
      pos = pos < 0 ? v.length - 1 : Math.min(v.length - 1, pos + 1);
    else if (e.key === "ArrowLeft")
      pos = pos < 0 ? v.length - 1 : Math.max(0, pos - 1);
    else if (e.key === "Home") pos = 0;
    else if (e.key === "End") pos = v.length - 1;
    else if (e.key === "Escape" && active != null) {
      setActive(null);
      return;
    } else return;
    e.preventDefault();
    setActive(v[pos]!, true);
  }

  const b = active != null ? B[active] : undefined;
  const other: Metric = metric === "rev" ? "cnt" : "rev";
  const keyColor = b?.current ? "var(--color-accent)" : "var(--pj-mute)";

  return (
    <>
      <div
        ref={plotRef}
        className="pj-plot"
        tabIndex={0}
        role="group"
        aria-label={
          geo
            ? `Grafik ${metricName(metric).toLowerCase()}. Tekan panah kiri atau kanan untuk membaca tiap batang.`
            : "Grafik penjualan"
        }
        data-part="plot"
        onPointerMove={pickBar}
        onPointerDown={pickBar}
        onPointerLeave={(e) => {
          if (
            e.pointerType === "mouse" &&
            !e.currentTarget.matches(":focus-visible")
          )
            setActive(null);
        }}
        onFocus={(e) => {
          if (active == null && e.currentTarget.matches(":focus-visible")) {
            const v = validIdx();
            const cur = B.findIndex((x) => x.current);
            if (v.length)
              setActive(
                cur >= 0 && v.includes(cur) ? cur : v[v.length - 1]!,
                true,
              );
          }
        }}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        {geo && (
          <svg
            className="pj-cx"
            width={geo.W}
            height={geo.H}
            viewBox={`0 0 ${geo.W} ${geo.H}`}
            role="img"
            aria-label={chartSummary(B, metric, p, valFull)}
          >
            {geo.ticks.map((t, k) => (
              <g key={k}>
                <line
                  className={"grid" + (t.base ? " base" : "")}
                  x1={geo.M.l}
                  x2={geo.W - geo.M.r}
                  y1={t.y}
                  y2={t.y}
                />
                <text x={geo.M.l - 10} y={t.y} dy="0.32em" textAnchor="end">
                  {t.label}
                </text>
              </g>
            ))}
            <rect
              className="hband"
              x={active != null ? geo.M.l + geo.band * active : 0}
              y={geo.M.t - 10}
              width={geo.band}
              height={geo.ph + 10}
              rx="6"
              visibility={active != null ? "visible" : "hidden"}
            />
            {geo.bars.map((bar) => (
              <path
                key={bar.i}
                className={
                  "bar" +
                  (bar.current ? " cur" : "") +
                  (bar.i === active ? " on" : "")
                }
                data-i={bar.i}
                d={bar.d}
              />
            ))}
            {geo.xlabels.map((l) => (
              <g key={l.i}>
                <text
                  className={"xlab" + l.cls}
                  x={l.x}
                  y={l.y0 + 18}
                  textAnchor="middle"
                >
                  {l.label}
                </text>
                {l.sub && (
                  <text
                    className={"xsub" + l.cls}
                    x={l.x}
                    y={l.y0 + 33}
                    textAnchor="middle"
                  >
                    {l.sub}
                  </text>
                )}
              </g>
            ))}
            {geo.dlabels.map((l) => (
              <text
                key={l.i}
                className="dl"
                x={l.x}
                y={l.y}
                textAnchor="middle"
              >
                {l.text}
              </text>
            ))}
          </svg>
        )}
      </div>
      <div
        ref={tipRef}
        className="pj-tip"
        data-part="chart-tip"
        hidden={!b || !geo}
      >
        {b && (
          <>
            <div className="tt">
              {b.title}
              {b.current ? " · masih berjalan" : ""}
            </div>
            {[metric, other].map((m, k) => (
              <div className="tr" key={m}>
                <i
                  className="k"
                  style={k === 0 ? { background: keyColor } : undefined}
                />
                <b>{m === "rev" ? rp(b.rev) : nf(b.cnt)}</b>
                <span>{m === "rev" ? "penjualan" : "pesanan"}</span>
              </div>
            ))}
            {b.cnt > 0 && (
              <div className="tr sub">
                <span>Rata-rata {rp(b.rev / b.cnt)} per pesanan</span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
