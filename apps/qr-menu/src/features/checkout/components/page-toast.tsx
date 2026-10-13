import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "../motion";

function hide(el: HTMLElement | null) {
  try {
    if (el?.matches(":popover-open")) el.hidePopover();
  } catch {
    /* popover unsupported */
  }
}

/**
 * The page's own toast (`<div class="pl-toast" popover="manual">`):
 * `const [toastEl, toast] = usePageToast("pl-toast", 2400)`.
 */
export function usePageToast(className: string, ms = 2600) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const el = ref.current;
    return () => {
      clearTimeout(timer.current);
      hide(el);
    };
  }, []);

  const toast = useCallback(
    (msg: string) => {
      setMessage(msg);
      const el = ref.current;
      if (!el) return;
      try {
        hide(el);
        el.showPopover();
      } catch {
        /* popover unsupported: the live region still updates */
      }
      motion(
        el,
        [
          { opacity: 0, transform: "translate(-50%, 12px)" },
          { opacity: 1, transform: "translate(-50%, 0)" },
        ],
        { duration: 200 },
      );
      clearTimeout(timer.current);
      timer.current = setTimeout(() => hide(el), ms);
    },
    [ms],
  );

  const element = (
    <div ref={ref} className={className} popover="manual" role="status">
      {message}
    </div>
  );
  return [element, toast] as const;
}
