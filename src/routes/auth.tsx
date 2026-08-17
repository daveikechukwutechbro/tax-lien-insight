import { createFileRoute, Link, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/firebase/client";
import { lovable } from "@/integrations/lovable";
import { enableDemoMode, disableDemoMode, isDemoMode } from "@/integrations/firebase/mock";
import { isFirebaseConfigured as firebaseConfigured } from "@/integrations/firebase";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";

const authSearch = z.object({
  mode: z.enum(["login", "signup"]).optional().default("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(authSearch),
  head: () => ({
    meta: [
      { title: "Log In or Create Account — Chicago TaxLien Auctions" },
      { name: "description", content: "Log in or create a bidder account for Chicago TaxLien Auctions." },
      { name: "robots", content: "noindex" },
      { property: "og:url", content: "/auth" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = useSearch({ from: "/auth" });
  const router = useRouter();
  const { user, loading } = useSession();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/dashboard", replace: true });
  }, [user, loading, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Real Firebase auth is used whenever configured; otherwise the forms
      // fall back to the in-memory demo account for local browsing.
      disableDemoMode();
      const result = isSignup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      const { error } = result as { error: unknown };
      if (error) throw error;
      toast.success(isSignup ? "Account created — you're signed in." : "Welcome back.");
      router.navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function signInAsDemo() {
    setBusy(true);
    try {
      enableDemoMode();
      const { error } = await supabase.auth.signInWithPassword({
        email: "demo@taxlieninsight.com",
        password: "demo",
      });
      if (error) throw error;
      toast.success("Signed in to demo account.");
      router.navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    try {
      if (firebaseConfigured()) {
        // Real Firebase OAuth popup.
        disableDemoMode();
        const res = await (supabase.auth as unknown as {
          signInWithGoogle: () => Promise<{ error: unknown }>;
        }).signInWithGoogle();
        if (res.error) throw res.error;
        toast.success("Signed in with Google.");
      } else {
        // Not configured — fall back to the demo account.
        enableDemoMode();
        toast.success("Signed in to demo account (Google not configured).");
      }
      router.navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // If the popup/flow failed for any reason, allow demo browsing.
      if (!isDemoMode()) enableDemoMode();
      toast.success("Signed in to demo account (Google unavailable).");
      router.navigate({ to: "/dashboard", replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-tight grid place-items-center py-16">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-8 shadow-sm">
        <h1 className="font-display text-2xl font-600 text-navy">
          {isSignup ? "Create your bidder account" : "Log in to bid"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isSignup
            ? "Register once to bid across all participating counties."
            : "Access your watchlist, bids, and account."}
        </p>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-hairline bg-surface px-4 py-2.5 text-sm font-500 text-ink transition-colors hover:border-navy hover:text-navy disabled:opacity-60"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-ink-muted">
          <span className="h-px flex-1 bg-hairline" /> or <span className="h-px flex-1 bg-hairline" />
        </div>

        <button
          type="button"
          onClick={signInAsDemo}
          disabled={busy}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-navy/5 px-4 py-2.5 text-sm font-600 text-navy transition-colors hover:bg-navy/10 disabled:opacity-60"
        >
          Continue as Demo Account
        </button>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          {isSignup && (
            <Field label="Full name">
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                autoComplete="name"
              />
            </Field>
          )}
          <Field label="Email">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-md bg-navy px-4 py-2.5 text-sm font-600 text-primary-foreground hover:bg-navy-deep disabled:opacity-60"
          >
            {busy ? "Please wait..." : isSignup ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-muted">
          {isSignup ? "Already registered?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignup((s) => !s)}
            className="font-500 text-navy underline underline-offset-4"
          >
            {isSignup ? "Log in" : "Create an account"}
          </button>
        </p>
        <Link
          to="/"
          className="mt-6 block text-center text-xs text-ink-muted underline underline-offset-4"
        >
          ← Back to auctions
        </Link>
      </div>

      <style>{`
        .input {
          width: 100%;
          height: 40px;
          border-radius: 6px;
          border: 1px solid var(--hairline);
          background: var(--surface);
          padding: 0 12px;
          font-size: 14px;
          color: var(--ink);
        }
        .input:focus {
          outline: none;
          border-color: var(--navy);
          box-shadow: 0 0 0 3px oklch(0.22 0.08 262 / 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-500 uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.5 2 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.2 5.6c4.2-3.9 6.6-9.6 6.6-16.3z"/>
      <path fill="#FBBC05" d="M10.4 28.6c-.6-1.8-.9-3.7-.9-5.6s.3-3.8.9-5.6L2.5 11.2C.9 14.7 0 18.7 0 23s.9 8.3 2.5 11.8l7.9-6.2z"/>
      <path fill="#34A853" d="M24 46c6.1 0 11.3-2 15-5.5l-7.2-5.6c-2 1.4-4.6 2.2-7.8 2.2-6.3 0-11.6-4.2-13.6-9.9l-7.9 6.2C6.4 40.6 14.6 46 24 46z"/>
    </svg>
  );
}