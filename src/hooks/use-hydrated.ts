import { useEffect, useState } from "react";

/** Returns true after the first client mount. Use to skip SSR-mismatch prone UI. */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}