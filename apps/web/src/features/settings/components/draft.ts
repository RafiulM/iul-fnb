import type {
  CafeSettingsDto,
  OpeningHoursDto,
} from "@starter/shared/fnb/types";

// Form draft for the Pengaturan page (prototype `S.draft`). Percentages stay
// as the typed text so an empty or half-typed number input is not lost.

export type SettingsDraft = Omit<
  CafeSettingsDto,
  "taxPercent" | "servicePercent"
> & { taxPercent: string; servicePercent: string };

export type SectionKey = "profil" | "jam" | "pajak" | "struk";
export type PreviewKey = "pelanggan" | "struk";

/** Monday first — the same order as CafeSettingsDto.hours. */
export const DAYS = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

export const SECTIONS: SectionKey[] = ["profil", "jam", "pajak", "struk"];

export const SECTION_LABEL: Record<SectionKey, string> = {
  profil: "Profil kafe",
  jam: "Jam operasional",
  pajak: "Pajak & layanan",
  struk: "Format struk",
};

export const fromSettings = (s: CafeSettingsDto): SettingsDraft => ({
  ...structuredClone(s),
  taxPercent: String(s.taxPercent),
  servicePercent: String(s.servicePercent),
});

export const toNum = (s: string) =>
  s.trim() === "" ? NaN : Number(s.replace(",", "."));

export const dotTime = (t: string) => t.replace(":", ".");
export const pct = (v: number) =>
  v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
export const oneLine = (s: string) => s.trim().replace(/\s*\n\s*/g, ", ");
/** 0 = Senin. */
export const todayIdx = (now: number) => (new Date(now).getDay() + 6) % 7;
export const nowHM = (now: number) => {
  const d = new Date(now);
  return (
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0")
  );
};

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Sections whose draft differs from the saved settings. */
export function changedSections(
  d: SettingsDraft,
  s: CafeSettingsDto,
): SectionKey[] {
  const diff: Record<SectionKey, boolean> = {
    profil:
      d.cafeName !== s.cafeName ||
      d.address !== s.address ||
      d.phone !== s.phone ||
      d.instagram !== s.instagram ||
      d.logoUrl !== s.logoUrl,
    jam: !same(d.hours, s.hours),
    pajak:
      !Object.is(toNum(d.taxPercent), s.taxPercent) ||
      !Object.is(toNum(d.servicePercent), s.servicePercent) ||
      d.taxInclusive !== s.taxInclusive,
    struk: !same(d.receipt, s.receipt),
  };
  return SECTIONS.filter((k) => diff[k]);
}

/* ---------- Validation (same rules and copy as the prototype) ---------- */

export type FieldKey = "name" | "phone" | "ig" | "tax" | "service";
export const FIELD_KEYS: FieldKey[] = ["name", "phone", "ig", "tax", "service"];

export const pctErr = (v: number) =>
  Number.isFinite(v) && v >= 0 && v <= 100
    ? ""
    : "Masukkan angka 0–100. Isi 0 bila tidak dipakai.";

export const hourErr = (h: OpeningHoursDto) => {
  if (!h.open) return "";
  if (!h.from || !h.to) return "Isi jam buka dan jam tutup.";
  if (h.to <= h.from) return "Jam tutup harus setelah jam buka.";
  return "";
};

export function fieldErrors(d: SettingsDraft): Record<FieldKey, string> {
  const phone = d.phone.trim();
  return {
    name: d.cafeName.trim() ? "" : "Nama kafe wajib diisi.",
    phone:
      !phone || /^\+?[0-9][0-9\s-]{5,18}$/.test(phone)
        ? ""
        : "Gunakan angka saja, boleh dengan spasi, tanda + atau -.",
    ig:
      !d.instagram || /^[A-Za-z0-9._]{1,30}$/.test(d.instagram)
        ? ""
        : "Hanya huruf, angka, titik, dan garis bawah.",
    tax: pctErr(toNum(d.taxPercent)),
    service: pctErr(toNum(d.servicePercent)),
  };
}

/** Draft → settings to save (text trimmed like the prototype's save()). */
export const toSettings = (d: SettingsDraft): CafeSettingsDto => ({
  ...structuredClone(d),
  cafeName: d.cafeName.trim(),
  address: d.address.trim(),
  phone: d.phone.trim(),
  taxPercent: toNum(d.taxPercent),
  servicePercent: toNum(d.servicePercent),
  receipt: {
    ...d.receipt,
    header: d.receipt.header.trim(),
    footer: d.receipt.footer.trim(),
  },
});

/* ---------- Unsaved draft survives in-app navigation (prototype root.pengaturanState) ---------- */

export type PageState = {
  draft: SettingsDraft;
  touched: string[];
  preview: PreviewKey;
};

let kept: PageState | null = null;
export const keptState = () => kept;
export const keepState = (s: PageState | null) => {
  kept = s;
};
