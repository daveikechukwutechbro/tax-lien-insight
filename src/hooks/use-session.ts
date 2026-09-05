import { useEffect, useState, useCallback } from "react";
import type { Session, User } from "@/integrations/firebase/types";
import { getMe, onAuthChange, type BackendUser } from "@/lib/backend-auth";

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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      if (!me) {
        setSession(null);
        setUser(null);
        return;
      }
      const u = toUser(me);
      setUser(u);
      setSession({
        access_token: "",
        refresh_token: "",
        token_type: "bearer",
        expires_in: 0,
        expires_at: 0,
        user: { ...u },
      } as Session);
    } catch {
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    refresh();
    const unsub = onAuthChange(() => {
      if (mounted) refresh();
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [refresh]);

  return { session, user, loading };
}