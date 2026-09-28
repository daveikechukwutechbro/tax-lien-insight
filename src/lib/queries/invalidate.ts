import type { QueryClient } from "@tanstack/react-query";

const LOCAL_CACHE_KEY = "al-data-cache-v1";

// After successful admin writes (properties / auctions / liens) the public
// pages must reflect the change immediately. This drops every react-query entry
// the public site reads AND the localStorage mirror that seeds first paint.
export function invalidatePublicData(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ["auctions"] });
  void qc.invalidateQueries({ queryKey: ["properties"] });
  void qc.invalidateQueries({ queryKey: ["states"] });
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(LOCAL_CACHE_KEY);
    } catch {
      // private mode / quota — the react-query invalidation still covers it
    }
  }
}