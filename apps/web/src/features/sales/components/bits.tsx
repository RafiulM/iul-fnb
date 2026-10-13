import { useLayoutEffect, useState, type RefObject } from "react";
import { ArrowDown, ArrowUp, Equal, type LucideIcon } from "lucide-react";
import {
  percentChange,
  pointsChange,
  type Change,
} from "@/features/sales/aggregate";

/** Direction badge: colored icon + text (+ "naik"/"turun" for screen readers). */
export function DirBadge({ change }: { change: Change }) {
  const Icon =
    change.dir === "up" ? ArrowUp : change.dir === "down" ? ArrowDown : Equal;
  return (
    <span className="pj-dir" data-dir={change.tone}>
      <Icon aria-hidden="true" style={{ fontSize: 15 }} />
      {change.dir !== "flat" && (
        <span className="pj-sr">{change.dir === "up" ? "naik" : "turun"}</span>
      )}
      {change.text}
    </span>
  );
}

/** KPI delta in percent vs the comparison period. */
export function Delta({
  cur,
  prev,
  vs,
}: {
  cur: number;
  prev: number;
  vs: string;
}) {
  const c = percentChange(cur, prev);
  if (!c) return <span>Belum ada data pembanding</span>;
  return (
    <>
      <DirBadge change={c} />
      <span>{vs}</span>
    </>
  );
}

/** Share change in percentage points (inline in a sentence). */
export function Points({
  cur,
  prev,
  vs,
  neutral,
}: {
  cur: number;
  prev: number | null;
  vs: string;
  neutral?: boolean;
}) {
  const c = pointsChange(cur, prev, neutral);
  if (!c) return <>belum ada data pembanding</>;
  return (
    <>
      <DirBadge change={c} /> {vs}
    </>
  );
}

export function CardEmpty({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="l-staf-empty pj-card-empty">
      <Icon aria-hidden="true" style={{ fontSize: 28 }} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

/** Rounded-down clientWidth of an element, kept current by a ResizeObserver. */
export function useElementWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(Math.floor(el.clientWidth)));
    };
    // The observer also reports the initial size.
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    if (ro) ro.observe(el);
    else measure();
    addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
  return width;
}
