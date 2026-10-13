// The open manual-order ticket (prototype `iulfnb:pos.manual_draft`). It is
// device-local: kept in this browser's localStorage so it survives reloads
// and leaving the page, and sent to the API only when the order is saved.

export type DineType = "DINE_IN" | "TAKEAWAY";

export type ManualDraftLine = { menuId: string; qty: number; note: string };

export type ManualDraft = {
  dine: DineType;
  /** Table id, "" = no table. */
  tableId: string;
  customer: string;
  lines: ManualDraftLine[];
};

const KEY = "iulfnb:manual-draft";

export const emptyDraft = (): ManualDraft => ({
  dine: "DINE_IN",
  tableId: "",
  customer: "",
  lines: [],
});

/** Nothing worth keeping (the prototype's isBlank). */
export const isBlankDraft = (d: ManualDraft) =>
  !d.lines.length && !d.customer.trim() && !d.tableId && d.dine === "DINE_IN";

function parseDraft(value: unknown): ManualDraft | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<ManualDraft>;
  if (!Array.isArray(v.lines)) return null;
  return {
    dine: v.dine === "TAKEAWAY" ? "TAKEAWAY" : "DINE_IN",
    tableId: typeof v.tableId === "string" ? v.tableId : "",
    customer: typeof v.customer === "string" ? v.customer : "",
    lines: v.lines
      .filter(
        (l): l is ManualDraftLine =>
          !!l && typeof l.menuId === "string" && Number.isInteger(l.qty),
      )
      .map((l) => ({
        menuId: l.menuId,
        qty: l.qty,
        note: typeof l.note === "string" ? l.note : "",
      })),
  };
}

export async function getManualDraft() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** `null` (or a blank draft) removes it. */
export async function saveManualDraft(draft: ManualDraft | null) {
  const kept = draft && !isBlankDraft(draft) ? draft : null;
  try {
    if (kept) localStorage.setItem(KEY, JSON.stringify(kept));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage full or blocked: the ticket stays in memory */
  }
  return kept;
}
