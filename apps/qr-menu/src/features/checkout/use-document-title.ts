import { useEffect } from "react";

/** Set document.title while the page is mounted (the prototype's prevTitle dance). */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
