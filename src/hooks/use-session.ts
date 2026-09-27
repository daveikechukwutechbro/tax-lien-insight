import { useEffect, useState, useCallback, useRef } from "react";
import type { Session, User } from "@/integrations/firebase/types";
import {
  getMe,
  onAuthChange,
  readCachedUser,
  cachedUserAgeMs,
  USER_CACHE_KEY,
  type BackendUser,
} from "@/lib/backend-auth";

// Fresh-cache fast path: for this long after a successful /me, the header
// renders the signed-in user with ZERO network calls.
const FRESH_MS = 5 * 60_000;

function toUser(u: BackendUser): User {
  return {
    id: u.id,
    aud: "authenticated",
    role: u.roles.includes("admin") || u.roles.includes("super_admin") ? "admin" : "authenticated",
    email: u.email,
    email_confirmed_at: u.emailVerifiedAt,
    phone: null,
    confirmed_at: u.emailVerifiedAt,
    last_sign_in_at: u.lastLoginAt,
    app_metadata: {},
    user_metadata: { full_name: u.fullName ?? undefined },
    identities: [],
    created_at: u.createdAt,
    updated_at: u.createdAt,
    is_anonymous: false,
  };
}

export function useSession() {
  const hasCached = typeof window !== "undefined" && !!readCachedUser();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(hasCached ? toUser(readCachedUser()!) : null);
  const [loading, setLoading] = useState(!hasCached);
  const optimisticRef = useRef<User | null>(user);

  const applyUser = useCallback((u: User | null) => {
    optimisticRef.current = u;
    setUser(u);
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      if (!force) {
        const age = cachedUserAgeMs();
        if (age != null && age < FRESH_MS) {
          const cached = readCachedUser();
          if (cached) {
            optimisticRef.current = toUser(cached);
            setUser(toUser(cached));
            setLoading(false);
            return;
          }
        }
      }
      try {
        const me = await getMe();
        if (me) {
          const u = toUser(me);
          applyUser(u);
          setSession({
            access_token: "",
            refresh_token: "",
            token_type: "bearer",
            expires_in: 0,
            expires_at: 0,
            user: { ...u },
          } as Session);
        } else {
          // Real 401/403 from the backend: session genuinely signed out.
          applyUser(null);
          setSession(null);
        }
      } catch {
        // Transient failure (timeout / Worker blip): never downgrade a signed
        // in user to the login buttons because the network hiccuped.
        if (!optimisticRef.current) applyUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    },
    [applyUser],
  );

  useEffect(() => {
    let mounted = true;
    let active = true;
    refresh();
    const unsub = onAuthChange(() => {
      if (active) refresh(true);
    });
    const onStorage = (e: StorageEvent) => {
      if (mounted && e.key === USER_CACHE_KEY) refresh(true);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      active = false;
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return { session, user, loading };
}