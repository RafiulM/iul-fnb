import { useCallback, useEffect, useRef, useState } from "react";

export type MenuMejaTab = "menu" | "kategori" | "meja";
export const TABS: MenuMejaTab[] = ["menu", "kategori", "meja"];

export type UiState = {
  tab: MenuMejaTab;
  /** Menu search text. */
  q: string;
  /** Menu category filter ("all" or a category id). */
  cat: string;
  avail: "all" | "on" | "off";
  /** Table filter: "all", an area name, or "off". */
  tFilter: string;
  /** Category tab in the customer preview. */
  pCat: string;
};

const DEFAULT_UI: UiState = {
  tab: "menu",
  q: "",
  cat: "all",
  avail: "all",
  tFilter: "all",
  pCat: "all",
};

// Like the prototype's root.menuMejaState: tab and filters survive leaving
// and re-opening the page (not a reload).
let savedUi = DEFAULT_UI;

export function useUiState() {
  const [ui, setUi] = useState(savedUi);
  const patch = useCallback((p: Partial<UiState>) => {
    setUi((s) => (savedUi = { ...s, ...p }));
  }, []);
  return [ui, patch] as const;
}

/**
 * "Baru diubah" marker: data-state="current" on a card/row for 2.6 s
 * (an orange edge, no animation), like the prototype's markCurrent().
 */
export function useMarks() {
  const [marked, setMarked] = useState<ReadonlySet<string>>(new Set());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const all = timers.current;
    return () => all.forEach(clearTimeout);
  }, []);
  const mark = useCallback((key: string) => {
    setMarked((s) => new Set(s).add(key));
    const t = setTimeout(() => {
      timers.current.delete(t);
      setMarked((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }, 2600);
    timers.current.add(t);
  }, []);
  const state = useCallback(
    (key: string) => (marked.has(key) ? "current" : undefined),
    [marked],
  );
  return { mark, state };
}

export const reduceMotion = () => {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

export const errorMessage = (e: unknown) =>
  e instanceof Error && e.message ? e.message : "Terjadi kesalahan. Coba lagi.";

export const errorStatus = (e: unknown) =>
  e && typeof e === "object" && "status" in e && typeof e.status === "number"
    ? e.status
    : 0;
