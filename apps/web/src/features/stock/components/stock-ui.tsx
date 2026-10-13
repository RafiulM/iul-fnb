import { Fragment, type ReactNode } from "react";
import { STOCK_BADGE, stockStatus } from "@starter/shared/fnb/domain";
import type { IngredientDto, StockStatus } from "@starter/shared/fnb/types";
import { pct, scaleMax } from "../ledger";

export function StatusChip({
  status,
  label,
}: {
  status: StockStatus;
  label?: string;
}) {
  return (
    <span className="l-staf-chip" data-tone={STOCK_BADGE[status].tone}>
      {label ?? STOCK_BADGE[status].label}
    </span>
  );
}

/** Level bar; the thin mark is the minimum. */
export function StockBar({ ing }: { ing: IngredientDto }) {
  const max = scaleMax(ing);
  return (
    <span
      className="sk-bar"
      data-tone={STOCK_BADGE[stockStatus(ing)].tone}
      aria-hidden="true"
    >
      <i style={{ width: `${pct(ing.stockQty, max)}%` }} />
      <b style={{ left: `${pct(ing.minStock, max)}%` }} />
    </span>
  );
}

/** "a, b & c" with React nodes. */
export function JoinList({ items }: { items: ReactNode[] }) {
  return (
    <>
      {items.map((node, i) => (
        <Fragment key={i}>
          {i > 0 ? (i === items.length - 1 ? " & " : ", ") : null}
          {node}
        </Fragment>
      ))}
    </>
  );
}
