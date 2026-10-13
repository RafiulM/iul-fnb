import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Native <dialog> wrapper using the staf kit (.l-staf-dialog, data-size,
// data-kind="drawer" | "sheet"), like the DesainPakeAI pages that call
// showModal()/close(). The browser provides the backdrop, focus trap, Escape
// and focus return. Mark the field to start on with `data-autofocus` (React's
// autoFocus fires before the dialog opens, so it has no effect here); use
// .l-staf-dialog-head / -body / -foot inside.
export function Dialog({
  open,
  onClose,
  size,
  kind,
  labelledBy,
  className = "",
  closeOnBackdrop = true,
  children,
  ...rest
}: {
  open: boolean;
  onClose: () => void;
  size?: "sm" | "lg";
  kind?: "drawer" | "sheet";
  labelledBy?: string;
  className?: string;
  closeOnBackdrop?: boolean;
  children: ReactNode;
} & Omit<React.DialogHTMLAttributes<HTMLDialogElement>, "open" | "onClose">) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      el.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`l-staf-dialog ${className}`.trim()}
      data-size={size}
      data-kind={kind}
      aria-labelledby={labelledBy}
      // Escape: keep React state in charge of closing.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the dialog box itself (not its content) is the backdrop.
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
      {...rest}
    >
      {open ? children : null}
    </dialog>
  );
}

/* ---------- Toast (.l-staf-toast, popover="manual") ---------- */

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [message, setMessage] = useState("");
  const toast = useCallback((msg: string) => {
    setMessage(msg);
    const el = ref.current;
    if (!el) return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
      el.showPopover();
    } catch {
      /* popover unsupported: message still updates the live region */
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        el.hidePopover();
      } catch {
        /* already hidden */
      }
    }, 2600);
  }, []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div ref={ref} className="l-staf-toast" popover="manual" role="status">
        {message}
      </div>
    </ToastContext.Provider>
  );
}

/** `const toast = useToast(); toast("Pesanan disimpan")` */
export function useToast() {
  return useContext(ToastContext);
}
