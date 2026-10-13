// Page state that survives leaving the menu list (design: root.pelangganState):
// selected category, search text, and where to return after the detail page.

export const browseState: {
  cat: string;
  q: string;
  /** Returning from the detail page: restore scroll and focus `lastOpen`. */
  restore: boolean;
  scrollY: number;
  lastOpen: string | null;
  /** One-off message for the next menu-list render (e.g. new table session). */
  notice: string | null;
  /** The detail page was replaced by an alternative menu: animate the hero. */
  altJump: boolean;
} = {
  cat: "all",
  q: "",
  restore: false,
  scrollY: 0,
  lastOpen: null,
  notice: null,
  altJump: false,
};

/** Update browseState (a function call, so components never mutate it inline). */
export function patchBrowseState(patch: Partial<typeof browseState>) {
  Object.assign(browseState, patch);
}

/**
 * One-off toast for the next customer screen that mounts (design: session
 * `flash`, e.g. "✓ 2× Nasi Goreng masuk keranjang"). setFlash before
 * navigating; the destination calls takeFlash() on mount and toasts it.
 */
let flash: string | null = null;

export function setFlash(message: string) {
  flash = message;
}

export function takeFlash() {
  const message = flash;
  flash = null;
  return message;
}
