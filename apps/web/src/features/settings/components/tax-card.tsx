import type { Ref } from "react";
import { Zap } from "lucide-react";
import { rp } from "@starter/shared/fnb/domain";
import { pct, pctErr, toNum, type SettingsDraft } from "./draft";
import type { FormProps } from "./profile-card";

export function TaxCard({
  draft,
  update,
  err,
  touch,
  onEdit,
  sectionRef,
}: FormProps & { onEdit: () => void; sectionRef: Ref<HTMLElement> }) {
  const taxErr = err("tax");
  const serviceErr = err("service");
  return (
    <section
      ref={sectionRef}
      className="l-staf-card pg-sec"
      tabIndex={-1}
      aria-labelledby="pengaturan-h-pajak"
      data-sec="pajak"
      data-preview="struk"
      onChange={onEdit}
    >
      <div className="l-staf-card-head">
        <div>
          <h2 id="pengaturan-h-pajak">Pajak &amp; biaya layanan</h2>
          <p>Persentase otomatis masuk ke tagihan pelanggan.</p>
        </div>
      </div>
      <div className="l-staf-card-body">
        <div className="pg-grid">
          <div className="l-staf-field">
            <label htmlFor="pengaturan-tax">Pajak (PB1)</label>
            <div
              className="l-staf-affix"
              data-invalid={taxErr ? "" : undefined}
            >
              <input
                id="pengaturan-tax"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="any"
                aria-invalid={taxErr ? "true" : "false"}
                aria-describedby="pengaturan-err-tax pengaturan-hint-tax"
                value={draft.taxPercent}
                onChange={(e) => {
                  update((d) => {
                    d.taxPercent = e.target.value;
                  });
                  touch("tax");
                }}
                onBlur={() => touch("tax")}
              />
              <span aria-hidden="true">%</span>
            </div>
            <p
              className="l-staf-error"
              id="pengaturan-err-tax"
              hidden={!taxErr}
            >
              {taxErr}
            </p>
            <small className="l-staf-hint" id="pengaturan-hint-tax">
              Pajak restoran daerah, umumnya 10%.
            </small>
          </div>
          <div className="l-staf-field">
            <label htmlFor="pengaturan-service">Biaya layanan</label>
            <div
              className="l-staf-affix"
              data-invalid={serviceErr ? "" : undefined}
            >
              <input
                id="pengaturan-service"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="any"
                aria-invalid={serviceErr ? "true" : "false"}
                aria-describedby="pengaturan-err-service pengaturan-hint-service"
                value={draft.servicePercent}
                onChange={(e) => {
                  update((d) => {
                    d.servicePercent = e.target.value;
                  });
                  touch("service");
                }}
                onBlur={() => touch("service")}
              />
              <span aria-hidden="true">%</span>
            </div>
            <p
              className="l-staf-error"
              id="pengaturan-err-service"
              hidden={!serviceErr}
            >
              {serviceErr}
            </p>
            <small className="l-staf-hint" id="pengaturan-hint-service">
              Isi 0 bila kafe tidak memungut biaya layanan.
            </small>
          </div>
          <div className="pg-opt pg-span2" data-boxed="">
            <div className="pg-opt-txt">
              <label htmlFor="pengaturan-incl">
                Harga menu sudah termasuk pajak
              </label>
              <small id="pengaturan-hint-incl">
                Aktifkan bila harga di menu sudah termasuk PB1, jadi pajak tidak
                ditambahkan lagi di tagihan.
              </small>
            </div>
            <label className="l-staf-switch">
              <input
                type="checkbox"
                role="switch"
                id="pengaturan-incl"
                aria-describedby="pengaturan-hint-incl"
                checked={draft.taxInclusive}
                onChange={(e) =>
                  update((d) => {
                    d.taxInclusive = e.target.checked;
                  })
                }
              />
              <span />
            </label>
          </div>
        </div>
        <TaxExample draft={draft} />
        <div className="l-staf-alert pg-pajak-note" data-tone="neutral">
          <Zap aria-hidden="true" />
          <span>
            Keranjang pelanggan dan tagihan kasir memakai angka ini secara
            otomatis, jadi tidak perlu dihitung manual.
          </span>
        </div>
      </div>
    </section>
  );
}

/** "Contoh tagihan" for an order of Rp 100.000 (prototype renderCalc). */
function TaxExample({ draft }: { draft: SettingsDraft }) {
  const t = toNum(draft.taxPercent);
  const s = toNum(draft.servicePercent);
  if (pctErr(t) || pctErr(s))
    return (
      <div className="pg-calc" data-part="calc">
        <div className="pg-calc-head">
          <span>Contoh tagihan</span>
        </div>
        <p className="pg-calc-sum">
          Lengkapi angka pajak dan biaya layanan untuk melihat contohnya.
        </p>
      </div>
    );
  const base = 100000;
  const incl = draft.taxInclusive;
  const svc = Math.round((base * s) / 100);
  const tax = incl
    ? Math.round(base - base / (1 + t / 100))
    : Math.round((base * t) / 100);
  const total = base + svc + (incl ? 0 : tax);
  const steps = [
    {
      k: "Contoh tagihan",
      v: rp(base),
      d: incl ? "termasuk pajak" : "harga menu",
    },
    {
      k: `Pajak ${pct(t)}%`,
      v: (incl ? "" : "+ ") + rp(tax),
      d: incl ? "sudah di harga" : "ditambahkan",
    },
    {
      k: `Layanan ${pct(s)}%`,
      v: "+ " + rp(svc),
      d: s ? "ditambahkan" : "tidak dipungut",
    },
    { k: "Total dibayar", v: rp(total), d: "oleh pelanggan", total: true },
  ];
  return (
    <div className="pg-calc" data-part="calc">
      <div className="pg-calc-head">
        <span>Contoh tagihan</span>
        <span className="l-staf-chip" data-tone="plain">
          {incl ? "Harga termasuk pajak" : "Pajak ditambahkan"}
        </span>
      </div>
      <div className="pg-calc-flow">
        {steps.map((x) => (
          <div
            key={x.k}
            className="pg-cstep"
            data-total={x.total ? "" : undefined}
          >
            <small>{x.k}</small>
            <strong>{x.v}</strong>
            <em>{x.d}</em>
          </div>
        ))}
      </div>
      <p className="pg-calc-sum">
        Untuk pesanan senilai <b>{rp(base)}</b>, pelanggan membayar{" "}
        <b>{rp(total)}</b>
        {incl && t ? `, dan ${rp(tax)} di antaranya adalah pajak` : ""}.
      </p>
    </div>
  );
}
