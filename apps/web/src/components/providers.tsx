import { MotionConfig } from "motion/react";
import { ToastProvider } from "@/components/fnb/dialog";
import { PrintProvider } from "@/components/fnb/receipt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <PrintProvider>{children}</PrintProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
