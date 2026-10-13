import { useEffect, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import {
  Banknote,
  Clock,
  ExternalLink,
  Eye,
  Receipt,
  Store,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/components/fnb/dialog";
import { ReceiptPaper, usePrint } from "@/components/fnb/receipt";
import { StafPage } from "@/components/fnb/shell";
import { useCategories, useMenus } from "@/features/menu/hooks";
import { useSettings, useUpdateSettings } from "@/features/settings/hooks";
import { useTablesMaybe } from "@/features/tables/hooks";
import { QR_MENU_URL, tableMenuUrl } from "@/lib/env";
import { useNow } from "@/lib/use-now";
import {
  changedSections,
  dotTime,
  FIELD_KEYS,
  fieldErrors,
  fromSettings,
  hourErr,
  keepState,
  keptState,
  SECTION_LABEL,
  SECTIONS,
  toSettings,
  type FieldKey,
  type PreviewKey,
  type SectionKey,
  type SettingsDraft,
} from "./draft";
import { HoursCard } from "./hours-card";
import { LivePreview, previewSettings, sampleOrder } from "./live-preview";
import { ProfileCard } from "./profile-card";
import { ReceiptCard } from "./receipt-card";
import { TaxCard } from "./tax-card";

const NAV_ICON: Record<SectionKey, LucideIcon> = {
  profil: Store,
  jam: Clock,
  pajak: Banknote,
  struk: Receipt,
};

const reduceMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PengaturanPage({ userName }: { userName: string }) {
  const { data: settings } = useSettings();
  const { data: menus } = useMenus();
  const { data: categories } = useCategories();
  const { data: tables } = useTablesMaybe();
  const saveMutation = useUpdateSettings();
  const toast = useToast();
  const print = usePrint();
  const now = useNow(30_000);

  // Unsaved edits survive leaving and re-opening the page (prototype S).
  const [draft, setDraft] = useState<SettingsDraft>(
    () => keptState()?.draft ?? fromSettings(settings),
  );
  const [touched, setTouched] = useState<string[]>(
    () => keptState()?.touched ?? [],
  );
  const [preview, setPreview] = useState<PreviewKey>(
    () => keptState()?.preview ?? "pelanggan",
  );
  useEffect(() => {
    keepState({ draft, touched, preview });
  }, [draft, touched, preview]);

  const update = (fn: (d: SettingsDraft) => void) =>
    setDraft((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  const touch = (key: string) =>
    setTouched((t) => (t.includes(key) ? t : [...t, key]));

  const errors = fieldErrors(draft);
  const err = (key: FieldKey) => (touched.includes(key) ? errors[key] : "");

  const changed = changedSections(draft, settings);
  const dirty = changed.length > 0;

  /* ---------- Refs: page focus, sections, scroll-spy ---------- */
  const mainRef = useRef<HTMLElement>(null);
  const formsRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const navInRef = useRef<HTMLDivElement>(null);
  const profilRef = useRef<HTMLElement>(null);
  const jamRef = useRef<HTMLElement>(null);
  const pajakRef = useRef<HTMLElement>(null);
  const strukRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Record<SectionKey, HTMLAnchorElement | null>>({
    profil: null,
    jam: null,
    pajak: null,
    struk: null,
  });
  const focusMain = () => mainRef.current?.focus({ preventScroll: true });

  const [active, setActive] = useState<SectionKey>("profil");
  const spyLockUntil = useRef(0);
  const sectionEl = (k: SectionKey) =>
    ({ profil: profilRef, jam: jamRef, pajak: pajakRef, struk: strukRef })[k]
      .current;

  useEffect(() => {
    let raf = 0;
    const spy = () => {
      if (performance.now() < spyLockUntil.current) return;
      const line = matchMedia("(max-width: 720px)").matches ? 200 : 140;
      let cur: SectionKey = SECTIONS[0];
      for (const k of SECTIONS) {
        const el = sectionEl(k);
        if (el && el.getBoundingClientRect().top <= line) cur = k;
      }
      const atBottom =
        scrollY > 0 &&
        innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom && matchMedia("(min-width: 901px)").matches)
        cur = SECTIONS[SECTIONS.length - 1];
      setActive(cur);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(spy);
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", spy);
    spy();
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", spy);
    };
  }, []);

  // Keep the active link visible in the horizontally scrolling nav (narrow screens).
  useEffect(() => {
    const navIn = navInRef.current;
    const a = linkRefs.current[active];
    if (!navIn || !a || navIn.scrollWidth <= navIn.clientWidth) return;
    const box = navIn.getBoundingClientRect();
    const r = a.getBoundingClientRect();
    if (r.left < box.left) navIn.scrollLeft -= box.left - r.left + 8;
    else if (r.right > box.right) navIn.scrollLeft += r.right - box.right + 8;
  }, [active]);

  function goTo(e: MouseEvent<HTMLAnchorElement>, key: SectionKey | "preview") {
    e.preventDefault();
    const target = key === "preview" ? previewRef.current : sectionEl(key);
    if (!target) return;
    if (key !== "preview") {
      setActive(key);
      spyLockUntil.current = e.timeStamp + 900;
    }
    target.scrollIntoView({
      behavior: reduceMotion() ? "auto" : "smooth",
      block: "start",
    });
    target.focus({ preventScroll: true });
  }

  /* ---------- Hours ---------- */
  function onHour(i: number, patch: Partial<SettingsDraft["hours"][number]>) {
    update((d) => {
      d.hours[i] = { ...d.hours[i], ...patch };
    });
    touch("h" + i);
  }
  function sameAll() {
    const mon = draft.hours[0];
    if (hourErr(mon)) {
      touch("h0");
      toast("Perbaiki dulu jam hari Senin");
      return;
    }
    update((d) => {
      d.hours = d.hours.map(() => ({ ...mon }));
    });
    setTouched((t) => t.filter((k) => !/^h[1-6]$/.test(k)));
    setPreview("pelanggan");
    toast(
      mon.open
        ? `Semua hari kini buka ${dotTime(mon.from)}–${dotTime(mon.to)}`
        : "Semua hari diatur tutup, sama seperti Senin",
    );
  }

  /* ---------- Test print ---------- */
  function testPrint() {
    setPreview("struk");
    print(
      <ReceiptPaper
        order={sampleOrder(menus, userName, Date.now())}
        settings={previewSettings(draft)}
      />,
    );
  }

  /* ---------- Save & cancel ---------- */
  function save() {
    if (saveMutation.isPending) return;
    flushSync(() =>
      setTouched([...FIELD_KEYS, ...draft.hours.map((_, i) => "h" + i)]),
    );
    const firstBad = formsRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    if (firstBad) {
      firstBad.focus({ preventScroll: true });
      firstBad.scrollIntoView({
        behavior: reduceMotion() ? "auto" : "smooth",
        block: "center",
      });
      toast("Ada isian yang perlu diperbaiki dulu");
      return;
    }
    const next = toSettings(draft);
    const submitted = fromSettings(next);
    // Show the trimmed text right away, like the prototype.
    setDraft(submitted);
    saveMutation.mutate(next, {
      onSuccess: (saved) => {
        setDraft((d) =>
          JSON.stringify(d) === JSON.stringify(submitted)
            ? fromSettings(saved)
            : d,
        );
        focusMain();
        toast(
          "Pengaturan disimpan — halaman pelanggan & struk ikut diperbarui",
        );
      },
      onError: (e) =>
        toast(e instanceof Error ? e.message : "Gagal menyimpan. Coba lagi."),
    });
  }
  function cancel() {
    setDraft(fromSettings(settings));
    setTouched([]);
    focusMain();
    toast("Perubahan dibatalkan");
  }

  // Ctrl/Cmd+S saves; warn before closing the tab with unsaved changes.
  const latest = useRef({ save, dirty });
  useEffect(() => {
    latest.current = { save, dirty };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (latest.current.dirty) latest.current.save();
        else toast("Belum ada perubahan untuk disimpan");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toast]);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    addEventListener("beforeunload", onBeforeUnload);
    return () => removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const firstTable = tables?.find((t) => t.isActive);
  const formProps = { draft, update, err, touch };

  return (
    <StafPage
      id="pengaturan"
      title="Pengaturan Kafe"
      actions={
        <>
          <span
            className="l-staf-chip"
            data-tone={dirty ? "warning" : "positive"}
            role="status"
            data-part="save-state"
          >
            {dirty ? "Belum disimpan" : "Semua tersimpan"}
          </span>
          <a
            className="l-staf-btn"
            href={
              firstTable ? tableMenuUrl(firstTable.tableNumber) : QR_MENU_URL
            }
            target="_blank"
            rel="noopener"
            data-part="open-customer"
          >
            <ExternalLink aria-hidden="true" />
            Lihat halaman pelanggan
          </a>
        </>
      }
    >
      <main
        ref={mainRef}
        aria-label="Pengaturan Kafe"
        className="p-pengaturan"
        tabIndex={-1}
      >
        <div className="pg-body" data-part="body">
          <p className="pg-context">
            Tampil di halaman pelanggan, struk, dan tagihan.
          </p>

          <div className="pg-layout">
            <div className="pg-forms" ref={formsRef}>
              <nav className="pg-secnav" aria-label="Bagian pengaturan">
                <div className="pg-secnav-in" ref={navInRef}>
                  {SECTIONS.map((k) => {
                    const Icon = NAV_ICON[k];
                    const on = changed.includes(k);
                    return (
                      <a
                        key={k}
                        ref={(el) => {
                          linkRefs.current[k] = el;
                        }}
                        href="/pengaturan"
                        data-nav={k}
                        aria-current={active === k ? "true" : "false"}
                        data-changed={on ? "" : undefined}
                        onClick={(e) => goTo(e, k)}
                      >
                        <Icon aria-hidden="true" />
                        {SECTION_LABEL[k]}
                        <span className="pg-sr">
                          {on ? " (ada perubahan)" : ""}
                        </span>
                      </a>
                    );
                  })}
                  <a
                    href="/pengaturan"
                    className="pg-jump"
                    data-jump="preview"
                    onClick={(e) => goTo(e, "preview")}
                  >
                    <Eye aria-hidden="true" />
                    Pratinjau
                  </a>
                </div>
              </nav>

              <ProfileCard {...formProps} sectionRef={profilRef} />
              <HoursCard
                draft={draft}
                now={now}
                touchedHours={(i) => touched.includes("h" + i)}
                onHour={onHour}
                onSameAll={sameAll}
                onEdit={() => setPreview("pelanggan")}
                sectionRef={jamRef}
              />
              <TaxCard
                {...formProps}
                onEdit={() => setPreview("struk")}
                sectionRef={pajakRef}
              />
              <ReceiptCard
                draft={draft}
                update={update}
                onEdit={() => setPreview("struk")}
                onTestPrint={testPrint}
                sectionRef={strukRef}
              />
            </div>

            <LivePreview
              draft={draft}
              now={now}
              preview={preview}
              setPreview={setPreview}
              menus={menus}
              categories={categories}
              cashierName={userName}
              asideRef={previewRef}
            />
          </div>

          {/* Save bar (the only black button on this page) */}
          <div
            className="pg-savebar"
            role="region"
            aria-label="Perubahan belum disimpan"
            data-part="savebar"
            data-show={dirty ? "" : undefined}
          >
            <div className="pg-savebar-in">
              <TriangleAlert aria-hidden="true" />
              <div className="pg-savebar-txt">
                <strong>Ada perubahan belum disimpan</strong>
                <small data-part="sb-detail">
                  {dirty
                    ? "Diubah: " +
                      changed.map((s) => SECTION_LABEL[s]).join(", ")
                    : ""}
                </small>
              </div>
              <button
                type="button"
                className="l-staf-btn"
                data-part="cancel"
                onClick={cancel}
                disabled={saveMutation.isPending}
              >
                Batalkan
              </button>
              <button
                type="button"
                className="l-staf-btn"
                data-variant="primary"
                data-part="save"
                onClick={save}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Menyimpan…" : "Simpan perubahan"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </StafPage>
  );
}
