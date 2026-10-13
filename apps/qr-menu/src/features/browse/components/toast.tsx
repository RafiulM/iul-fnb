import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "../motion";

/**
 * The page's own toast (design: `.pl-toast` popover="manual", 2.4 s).
 * `const [toastEl, toast] = useToast()` — render toastEl inside the page.
 */
export function useToast() {
  const ref = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);

  const hide = useCallback(() => {
    try {
      if (ref.current?.matches(":popover-open")) ref.current.hidePopover();
    } catch {
      /* popover unsupported */
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!msg || !el) return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
      el.showPopover();
    } catch {
      /* popover unsupported */
    }
    motion(
      el,
      [
        { opacity: 0, transform: "translate(-50%, 12px)" },
        { opacity: 1, transform: "translate(-50%, 0)" },
      ],
      { duration: 200 },
    );
    const t = setTimeout(hide, 2400);
    return () => clearTimeout(t);
  }, [msg, hide]);

  useEffect(() => hide, [hide]);

  const toast = useCallback(
    (text: string) => setMsg((m) => ({ text, id: (m?.id ?? 0) + 1 })),
    [],
  );

  const toastEl = (
    <div ref={ref} className="pl-toast" popover="manual" role="status">
      {msg?.text}
    </div>
  );
  return [toastEl, toast] as const;
}
