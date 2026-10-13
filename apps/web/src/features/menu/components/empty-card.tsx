import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** The prototype's emptyHTML(): a full-width empty state inside a grid. */
export function EmptyCard({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="l-staf-card mm-empty-card">
      <div className="l-staf-empty">
        <Icon aria-hidden="true" style={{ fontSize: 28 }} />
        <strong>{title}</strong>
        <span>{text}</span>
        {action ? <div className="mm-empty-act">{action}</div> : null}
      </div>
    </div>
  );
}
