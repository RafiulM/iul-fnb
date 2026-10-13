import { useRef, type Ref } from "react";
import {
  BatteryFull,
  CreditCard,
  Eye,
  Plus,
  Search,
  Signal,
  Wifi,
} from "lucide-react";
import { hhmm, initials, rp } from "@starter/shared/fnb/domain";
import type {
  CafeSettingsDto,
  MenuCategoryDto,
  MenuDto,
} from "@starter/shared/fnb/types";
import { ReceiptPaper, type ReceiptOrder } from "@/components/fnb/receipt";
import {
  dotTime,
  hourErr,
  oneLine,
  pctErr,
  todayIdx,
  toNum,
  type PreviewKey,
  type SettingsDraft,
} from "./draft";

/** Settings as the preview and the test print show them (prototype previewSettings). */
export function previewSettings(d: SettingsDraft): CafeSettingsDto {
  const safePct = (v: number) => (pctErr(v) ? 0 : v);
  return {
    ...d,
    cafeName: d.cafeName.trim() || "Nama kafe",
    address: oneLine(d.address),
    phone: d.phone.trim(),
    taxPercent: safePct(toNum(d.taxPercent)),
    servicePercent: safePct(toNum(d.servicePercent)),
  };
}

const pick = (menus: MenuDto[], ids: string[]) => {
  const found = ids
    .map((id) => menus.find((m) => m.id === id))
    .filter((m): m is MenuDto => !!m);
  return found.length === ids.length ? found : menus.slice(0, ids.length);
};

/** Sample paid QR order for the receipt preview and test print. */
export function sampleOrder(
  menus: MenuDto[],
  cashierName: string,
  now: number,
): ReceiptOrder {
  const [a, b] = pick(menus, ["m1", "d1"]);
  const line = (m: MenuDto | undefined, qty: number, note: string) =>
    m
      ? [
          {
            id: "sample-" + m.id,
            menuId: m.id,
            name: m.name,
            imageUrl: m.imageUrl,
            price: m.price,
            qty,
            note,
          },
        ]
      : [];
  return {
    code: "A-027",
    createdAt: new Date(now).toISOString(),
    tableNumber: "07",
    orderType: "QR",
    status: "SELESAI",
    items: [...line(a, 2, "Tidak pedas"), ...line(b, 1, "")],
    paymentStatus: "LUNAS",
    paymentMethod: "NON_CASH",
    paymentChannel: "QRIS",
    paidAmount: null,
    cashierName,
    customerName: null,
  };
}

export function LivePreview({
  draft,
  now,
  preview,
  setPreview,
  menus,
  categories,
  cashierName,
  asideRef,
}: {
  draft: SettingsDraft;
  now: number;
  preview: PreviewKey;
  setPreview: (p: PreviewKey) => void;
  menus: MenuDto[];
  categories: MenuCategoryDto[];
  cashierName: string;
  asideRef: Ref<HTMLElement>;
}) {
  const tabs = useRef<Record<PreviewKey, HTMLButtonElement | null>>({
    pelanggan: null,
    struk: null,
  });
  const TABS: { key: PreviewKey; id: string; panel: string; label: string }[] =
    [
      {
        key: "pelanggan",
        id: "pengaturan-tab-cust",
        panel: "pengaturan-pv-cust",
        label: "Halaman pelanggan",
      },
      {
        key: "struk",
        id: "pengaturan-tab-rc",
        panel: "pengaturan-pv-rc",
        label: "Struk",
      },
    ];

  return (
    <aside
      ref={asideRef}
      className="pg-preview"
      tabIndex={-1}
      aria-labelledby="pengaturan-h-preview"
      data-part="preview"
    >
      <div className="l-staf-card pg-pv-card">
        <div className="pg-pv-head">
          <div>
            <h2 id="pengaturan-h-preview">Pratinjau langsung</h2>
            <p>Berubah seketika saat kamu mengisi formulir.</p>
          </div>
          <div
            className="l-staf-seg"
            data-block=""
            role="tablist"
            aria-label="Pilih pratinjau"
            data-part="pv-tabs"
          >
            {TABS.map((t, i) => (
              <button
                key={t.key}
                ref={(el) => {
                  tabs.current[t.key] = el;
                }}
                type="button"
                role="tab"
                id={t.id}
                aria-controls={t.panel}
                aria-selected={preview === t.key}
                tabIndex={preview === t.key ? 0 : -1}
                onClick={() => setPreview(t.key)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const n =
                    TABS[
                      (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) %
                        TABS.length
                    ];
                  setPreview(n.key);
                  tabs.current[n.key]?.focus();
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pg-pv-body">
          <div
            role="tabpanel"
            id="pengaturan-pv-cust"
            aria-labelledby="pengaturan-tab-cust"
            hidden={preview !== "pelanggan"}
          >
            <CustomerPreview
              draft={draft}
              now={now}
              menus={menus}
              categories={categories}
            />
          </div>
          <div
            role="tabpanel"
            id="pengaturan-pv-rc"
            aria-labelledby="pengaturan-tab-rc"
            hidden={preview !== "struk"}
          >
            <div className="pg-receipt" data-part="pv-receipt">
              <ReceiptPaper
                order={sampleOrder(menus, cashierName, now)}
                settings={previewSettings(draft)}
              />
            </div>
            <p className="pg-caption" data-part="pv-rc-meta">
              Contoh pesanan Meja 07 · dibayar QRIS · kertas{" "}
              {draft.receipt.paperMm} mm
            </p>
          </div>
        </div>
        <div className="pg-pv-foot">
          <Eye aria-hidden="true" />
          <span>
            Pelanggan baru melihat perubahan setelah kamu menekan{" "}
            <b>Simpan perubahan</b>.
          </span>
        </div>
      </div>
    </aside>
  );
}

/** Miniature of the customer menu page (prototype renderCustomer). */
function CustomerPreview({
  draft,
  now,
  menus,
  categories,
}: {
  draft: SettingsDraft;
  now: number;
  menus: MenuDto[];
  categories: MenuCategoryDto[];
}) {
  const name = draft.cafeName.trim();
  const ini = (name && initials(name)) || "?";
  const addr = oneLine(draft.address);
  const h = draft.hours[todayIdx(now)];
  const bad = !!hourErr(h);
  const items = pick(menus, ["m1", "d1", "s1"]);
  const cats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="pg-phone">
      <div className="pg-screen">
        <div className="pg-c" aria-hidden="true">
          <div className="pg-c-sb">
            <span data-part="pv-clock">{hhmm(now)}</span>
            <span>
              <Signal />
              <Wifi />
              <BatteryFull />
            </span>
          </div>
          <div className="pg-c-head">
            <div className="pg-c-top">
              <div className="pg-c-brand">
                <span className="pg-c-mono" data-part="pv-logo">
                  {draft.logoUrl ? <img src={draft.logoUrl} alt="" /> : ini}
                </span>
                <div>
                  <strong data-part="pv-name">{name || "Nama kafe"}</strong>
                  <small data-part="pv-addr" data-empty={addr ? undefined : ""}>
                    {addr || "Alamat belum diisi"}
                  </small>
                </div>
              </div>
              <div className="pg-c-table">
                <span>Meja</span>
                <strong>07</strong>
              </div>
            </div>
            <p className="pg-c-greet">Selamat datang 👋</p>
            <p className="pg-c-thesis">Mau pesan apa hari ini?</p>
            <div className="pg-c-meta">
              <span
                className="l-staf-chip"
                data-part="pv-hours"
                data-tone={!h.open ? "danger" : bad ? "warning" : "positive"}
              >
                {!h.open
                  ? "Tutup hari ini"
                  : bad
                    ? "Jam belum lengkap"
                    : `Buka · ${dotTime(h.from)}–${dotTime(h.to)}`}
              </span>
              <span className="l-staf-chip" data-tone="plain">
                <CreditCard />
                Bayar di kasir
              </span>
            </div>
          </div>
          <div className="pg-c-search">
            <Search />
            Cari menu, mis. kopi susu
          </div>
          <div className="pg-c-tabs">
            <span data-on="">Semua</span>
            {cats.map((c) => (
              <span key={c.id}>{c.name}</span>
            ))}
          </div>
          <div className="pg-c-list" data-part="pv-list">
            {items.map((m) => (
              <div className="pg-c-item" key={m.id}>
                <span className="pg-c-thumb">{m.imageUrl}</span>
                <span className="pg-c-info">
                  <b>{m.name}</b>
                  <small>{m.description}</small>
                  <strong>{rp(m.price)}</strong>
                </span>
                <span className="pg-c-add">
                  <Plus style={{ fontSize: 18 }} />
                </span>
              </div>
            ))}
          </div>
          <div className="pg-c-bottom">
            <p className="pg-c-ig" data-part="pv-ig" hidden={!draft.instagram}>
              {draft.instagram && (
                <>
                  Ikuti kami di Instagram <b>@{draft.instagram}</b>
                </>
              )}
            </p>
            <div className="pg-c-cart">
              <span>2</span>
              <span>
                <strong>Lihat keranjang</strong>
                <small>2 item</small>
              </span>
              <span>Rp 54.000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
