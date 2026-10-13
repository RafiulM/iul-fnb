import { useLayoutEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import {
  HOURS,
  heatBin,
  nf,
  nf1,
  pad,
  type Heat,
  type Period,
} from "@/features/sales/aggregate";
import { CardEmpty, useElementWidth } from "./bits";

// "Jam tersibuk" card: orders per hour (per weekday for 7/30 days) on an Ink
// ramp, with hover/arrow-key reading.

type Pos = { r: number; c: number };

export function SalesHeatmap({
  heat,
  period: p,
  announce,
}: {
  heat: Heat;
  period: Period;
  announce: (msg: string) => void;
}) {
  const isToday = p.key === "today";
  const avg = p.key === "30d";
  const heatVal = (v: number) => (avg ? nf1(v) : nf(v));
  const sub = isToday
    ? "Pesanan per jam, hari ini"
    : p.key === "7d"
      ? "Pesanan per jam di tiap hari, 7 hari terakhir"
      : "Rata-rata pesanan per jam di tiap hari, 30 hari terakhir";

  return (
    <section
      className="l-staf-card pj-heat-card"
      aria-labelledby="penjualan-heat-title"
      data-node-id="penjualan.heat"
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="penjualan-heat-title">Jam tersibuk</h2>
          <p>{sub}</p>
        </div>
        <div className="pj-scale" aria-hidden="true">
          <span>Sepi</span>
          <i className="b1" />
          <i className="b2" />
          <i className="b3" />
          <i className="b4" />
          <i className="b5" />
          <span>Ramai</span>
        </div>
      </div>
      <div className="l-staf-card-body">
        {heat.max && heat.best ? (
          <HeatGrid
            heat={heat}
            isToday={isToday}
            avg={avg}
            heatVal={heatVal}
            announce={announce}
            best={heat.best}
            rangeKey={p.key}
          />
        ) : (
          <div className="pj-heat-note">
            <CardEmpty
              icon={Clock}
              title="Belum ada data jam ramai"
              text="Peta ini terisi dari pesanan yang selesai."
            />
          </div>
        )}
      </div>
    </section>
  );
}

function HeatGrid({
  heat,
  best,
  isToday,
  avg,
  heatVal,
  announce,
  rangeKey,
}: {
  heat: Heat;
  rangeKey: string;
  best: NonNullable<Heat["best"]>;
  isToday: boolean;
  avg: boolean;
  heatVal: (v: number) => string;
  announce: (msg: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef);
  // The active cell belongs to one range; switching range clears it.
  const [act, setAct] = useState<{ k: string; pos: Pos } | null>(null);
  const pos =
    act && act.k === rangeKey && heat.rows[act.pos.r] ? act.pos : null;

  const bestRow = heat.rows[best.r]!;
  const when = `${pad(HOURS[best.c]!)}.00–${pad(HOURS[best.c]!)}.59`;
  const noteLabel = isToday
    ? `Paling ramai hari ini: pukul ${when} · ${nf(best.v)} pesanan`
    : `Paling ramai: ${bestRow.full}, pukul ${when} · ${heatVal(best.v)} pesanan${avg ? " rata-rata" : ""}`;

  function tipFor({ r, c }: Pos) {
    const row = heat.rows[r]!;
    const cell = row.cells[c]!;
    const label = `${row.full} · ${pad(cell.h)}.00–${pad(cell.h)}.59`;
    if (cell.v == null)
      return { label, value: null, text: `${label}, belum berjalan.` };
    return {
      label,
      value: cell.v,
      k: cell.k,
      full: row.full,
      text: `${label}: ${heatVal(cell.v)} pesanan${avg ? " rata-rata" : ""}.`,
    };
  }

  function setActive(next: Pos | null, speak = false) {
    setAct(next ? { k: rangeKey, pos: next } : null);
    if (next && speak) announce(tipFor(next).text);
  }

  // Tooltip placement needs the rendered cell and tip sizes.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const wrap = wrapRef.current;
    if (!tip || !wrap || !pos) return;
    const cell = wrap.querySelector<HTMLElement>(
      `.hc[data-r="${pos.r}"][data-c="${pos.c}"]`,
    );
    if (!cell) return;
    tip.style.transform = "";
    const tw = tip.offsetWidth;
    const ww = wrap.clientWidth;
    const x = cell.offsetLeft + cell.offsetWidth / 2;
    tip.style.left = Math.min(Math.max(x, tw / 2), ww - tw / 2) + "px";
    tip.style.top = cell.offsetTop + "px";
  }, [pos, width]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const rows = heat.rows.length;
    const cols = HOURS.length;
    let { r, c } = pos ?? { r: 0, c: 0 };
    if (e.key === "ArrowRight") c = Math.min(cols - 1, c + 1);
    else if (e.key === "ArrowLeft") c = Math.max(0, c - 1);
    else if (e.key === "ArrowDown") r = Math.min(rows - 1, r + 1);
    else if (e.key === "ArrowUp") r = Math.max(0, r - 1);
    else if (e.key === "Home") c = 0;
    else if (e.key === "End") c = cols - 1;
    else if (e.key === "Escape" && pos) {
      setActive(null);
      return;
    } else return;
    e.preventDefault();
    setActive({ r, c }, true);
  }

  const tip = pos ? tipFor(pos) : null;

  return (
    <>
      <div
        ref={wrapRef}
        className="pj-heat-wrap"
        tabIndex={0}
        role="group"
        aria-label="Peta jam tersibuk. Tekan tombol panah untuk membaca tiap jam."
        data-part="heat-wrap"
        onPointerOver={(e) => {
          const c = (e.target as HTMLElement).closest<HTMLElement>(".hc");
          if (c) setActive({ r: Number(c.dataset.r), c: Number(c.dataset.c) });
        }}
        onPointerLeave={(e) => {
          if (
            e.pointerType === "mouse" &&
            !e.currentTarget.matches(":focus-visible")
          )
            setActive(null);
        }}
        onFocus={(e) => {
          if (pos || !e.currentTarget.matches(":focus-visible")) return;
          setActive({ r: best.r, c: best.c }, true);
        }}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        <div
          className="pj-heat"
          role="img"
          aria-label={noteLabel}
          data-one={isToday ? "" : undefined}
        >
          {heat.rows.map((row, ri) => (
            <HeatRowCells
              key={row.full}
              ri={ri}
              row={row}
              max={heat.max}
              pos={pos}
            />
          ))}
          <div />
          {HOURS.map((h) => (
            <div className="hx" key={h}>
              {h % 2 === 0 ? pad(h) : ""}
            </div>
          ))}
        </div>
        <div ref={tipRef} className="pj-tip" hidden={!tip}>
          {tip && (
            <>
              <div className="tt">{tip.label}</div>
              {tip.value == null ? (
                <div className="tr">
                  <span>Belum berjalan</span>
                </div>
              ) : (
                <>
                  <div className="tr">
                    <b>{heatVal(tip.value)}</b>
                    <span>{avg ? "pesanan rata-rata" : "pesanan"}</span>
                  </div>
                  {avg && (
                    <div className="tr sub">
                      <span>
                        dari {tip.k} hari {tip.full}
                      </span>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div className="pj-heat-note">
        {isToday ? (
          <>
            Paling ramai hari ini: <b>pukul {when}</b> · {nf(best.v)} pesanan
          </>
        ) : (
          <>
            Paling ramai:{" "}
            <b>
              {bestRow.full}, pukul {when}
            </b>{" "}
            · {heatVal(best.v)} pesanan{avg ? " rata-rata" : ""}
          </>
        )}
      </div>
    </>
  );
}

function HeatRowCells({
  ri,
  row,
  max,
  pos,
}: {
  ri: number;
  row: Heat["rows"][number];
  max: number;
  pos: Pos | null;
}) {
  return (
    <>
      <div className="rl">{row.label}</div>
      {row.cells.map((cell, ci) => (
        <div
          key={cell.h}
          className={
            `hc ${heatBin(cell.v, max)}`.trim() +
            (pos && pos.r === ri && pos.c === ci ? " on" : "")
          }
          data-r={ri}
          data-c={ci}
        />
      ))}
    </>
  );
}
