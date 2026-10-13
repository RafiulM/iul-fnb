import type { Ref } from "react";
import { RefreshCw } from "lucide-react";
import {
  DAYS,
  dotTime,
  hourErr,
  nowHM,
  todayIdx,
  type SettingsDraft,
} from "./draft";

export function HoursCard({
  draft,
  now,
  touchedHours,
  onHour,
  onSameAll,
  onEdit,
  sectionRef,
}: {
  draft: SettingsDraft;
  now: number;
  /** Rows whose error may show (prototype S.touched "h<i>"). */
  touchedHours: (i: number) => boolean;
  onHour: (i: number, patch: Partial<SettingsDraft["hours"][number]>) => void;
  onSameAll: () => void;
  /** Any edit in this section switches the preview to the customer page. */
  onEdit: () => void;
  sectionRef: Ref<HTMLElement>;
}) {
  const ti = todayIdx(now);
  return (
    <section
      ref={sectionRef}
      className="l-staf-card pg-sec"
      tabIndex={-1}
      aria-labelledby="pengaturan-h-jam"
      data-sec="jam"
      data-preview="pelanggan"
      onChange={onEdit}
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="pengaturan-h-jam">Jam operasional</h2>
          <p>Jam buka dan tutup tampil di halaman menu pelanggan.</p>
        </div>
        <button
          type="button"
          className="l-staf-btn"
          data-size="sm"
          data-part="same-all"
          onClick={onSameAll}
        >
          <RefreshCw aria-hidden="true" />
          Samakan semua hari dengan Senin
        </button>
      </div>
      <div className="l-staf-card-body">
        <NowStatus hours={draft.hours} now={now} />
        <ul
          className="pg-hours"
          aria-label="Jam buka per hari"
          data-part="hours"
        >
          {draft.hours.map((h, i) => {
            const msg = hourErr(h);
            const show = touchedHours(i) ? msg : "";
            const errId = `pengaturan-err-h${i}`;
            return (
              <li
                key={DAYS[i]}
                className="pg-hrow"
                data-i={i}
                data-closed={h.open ? undefined : ""}
              >
                <div className="pg-hday">
                  <span>{DAYS[i]}</span>
                  {i === ti && (
                    <span className="l-staf-chip" data-tone="accent">
                      Hari ini
                    </span>
                  )}
                </div>
                <label className="pg-htoggle">
                  <span className="l-staf-switch">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={h.open}
                      aria-label={`Buka hari ${DAYS[i]}`}
                      onChange={(e) => onHour(i, { open: e.target.checked })}
                    />
                    <span />
                  </span>
                  <span className="pg-hstate" aria-hidden="true">
                    {h.open ? "Buka" : "Tutup"}
                  </span>
                </label>
                <div className="pg-htimes">
                  <input
                    type="time"
                    className="l-staf-input"
                    value={h.from}
                    aria-label={`Jam buka ${DAYS[i]}`}
                    aria-describedby={errId}
                    aria-invalid={show && h.open && !h.from ? "true" : "false"}
                    disabled={!h.open}
                    onChange={(e) => onHour(i, { from: e.target.value })}
                  />
                  <span className="pg-hdash" aria-hidden="true">
                    –
                  </span>
                  <input
                    type="time"
                    className="l-staf-input"
                    value={h.to}
                    aria-label={`Jam tutup ${DAYS[i]}`}
                    aria-describedby={errId}
                    aria-invalid={show && (!h.to || h.from) ? "true" : "false"}
                    disabled={!h.open}
                    onChange={(e) => onHour(i, { to: e.target.value })}
                  />
                </div>
                <p className="l-staf-error" id={errId} hidden={!show}>
                  {show}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** "Sekarang: Buka · tutup pukul 22.00" line (prototype renderStatus). */
function NowStatus({
  hours,
  now,
}: {
  hours: SettingsDraft["hours"];
  now: number;
}) {
  const i = todayIdx(now);
  const h = hours[i];
  const cur = nowHM(now);
  const nextOpen = () => {
    for (let k = 1; k <= 7; k++) {
      const j = (i + k) % 7;
      const n = hours[j];
      if (n.open && !hourErr(n))
        return ` · buka lagi ${k === 1 ? "besok" : k === 7 ? DAYS[j] + " depan" : DAYS[j]} pukul ${dotTime(n.from)}`;
    }
    return " · belum ada hari buka";
  };
  let tone: "ok" | "warn" | "off";
  let text: string;
  if (hourErr(h)) {
    tone = "warn";
    text = `jam hari ${DAYS[i]} belum lengkap`;
  } else if (!h.open) {
    tone = "off";
    text = `Tutup hari ini (${DAYS[i]})` + nextOpen();
  } else if (cur < h.from) {
    tone = "off";
    text = `Belum buka · buka pukul ${dotTime(h.from)}`;
  } else if (cur < h.to) {
    tone = "ok";
    text = `Buka · tutup pukul ${dotTime(h.to)}`;
  } else {
    tone = "off";
    text = "Sudah tutup" + nextOpen();
  }
  return (
    <div className="pg-now" aria-live="polite" data-part="now">
      <i className="pg-dot" data-tone={tone} aria-hidden="true" />
      <span>
        <b>Sekarang:</b> {text}
      </span>
    </div>
  );
}
