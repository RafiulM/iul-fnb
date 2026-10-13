import { useEffect, useState } from "react";

/**
 * Current time that re-renders every `intervalMs`. Server and browser renders
 * differ by a few ms, so put suppressHydrationWarning on elements whose text
 * is derived from it (clocks, "3 mnt lalu").
 */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
