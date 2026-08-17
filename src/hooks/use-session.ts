import { useEffect, useState } from "react";
import type { Session, User } from "@/integrations/firebase/types";
import { supabase } from "@/integrations/firebase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Increment to force re-subscription when demo mode changes
  const [demoVersion, setDemoVersion] = useState(0);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [demoVersion]);

  // Listen for demo mode changes to increment demoVersion
  useEffect(() => {
    const onStorage = () => setDemoVersion((v) => v + 1);
    const onDemoChange = () => setDemoVersion((v) => v + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("taxlien-demo-change", onDemoChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("taxlien-demo-change", onDemoChange);
    };
  }, []);

  return { session, user, loading };
}