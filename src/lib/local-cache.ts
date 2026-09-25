// Tiny browser-side cache for slow public endpoints. The Worker + hosted DB
// round-trip can take 1-2s, so repeat visitors get real content immediately
// from localStorage while fresh data quietly refreshes in the background.
const STORE_KEY = "al-data-cache-v1";
const DEFAULT_TTL_MS = 5 * 60_000;

type Entry<T> = { t: number; v: T };

function readStore(): Record<string, Entry<unknown>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Entry<unknown>>) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, Entry<unknown>>): void {
  try {
    const slim = Object.fromEntries(
      Object.entries(store).filter(([_, e]) => Date.now() - e.t < 24 * 60 * 60_000),
    );
    window.localStorage.setItem(STORE_KEY, JSON.stringify(slim));
  } catch {
    // private mode / quota — ignore
  }
}

/** Read a cached value if present and fresh-ish. */
export function readLocal<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | undefined {
  const hit = readStore()[key] as Entry<T> | undefined;
  if (!hit) return undefined;
  if (Date.now() - hit.t > ttlMs) return undefined;
  return hit.v;
}

/** Store a value so next navigation/visit renders instantly. */
export function writeLocal<T>(key: string, value: T): void {
  const store = readStore();
  store[key] = { t: Date.now(), v: value };
  writeStore(store);
}

/** queryOptions helper: seed from cache, then overwrite cache on success. */
export function localCacheOptions<T extends Record<string, unknown>>(
  key: string,
  base: { queryFn: () => Promise<T>; staleTime?: number },
) {
  return {
    ...base,
    placeholderData: (): T | undefined => readLocal<T>(key),
    queryFn: async (): Promise<T> => {
      const data = await base.queryFn();
      writeLocal(key, data);
      return data;
    },
  };
}