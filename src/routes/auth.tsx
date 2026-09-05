import { createFileRoute, Link, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { register, login, AuthError } from "@/lib/backend-auth";

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
      if (isSignup) {
        const res = await register({ email, password, fullName: fullName || undefined });
        if (res.verificationToken) {
          // No email provider configured, so the token came back directly.
          router.navigate({ to: "/verify", search: { token: res.verificationToken, email } });
          return;
        }
        toast.success("Account created. Check your email to verify your address.");
        router.navigate({ to: "/verify", search: { email } });
        return;
      }
      await login({ email, password });
      toast.success("Welcome back.");
      router.navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const e = err instanceof AuthError ? err : err instanceof Error ? err : new Error(String(err));
      if (e instanceof AuthError && e.code === "ACCOUNT_LOCKED") {
        toast.error("Please verify your email before logging in.");
        router.navigate({ to: "/verify", search: { email } });
        return;
      }
      toast.error(e.message);
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

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          {isSignup && (
            <Field label="Full name">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                autoComplete="name"
                placeholder="Jane Auctioneer"
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
              placeholder="you@example.com"
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

        {!isSignup && (
          <p className="mt-3 text-center text-sm">
            <Link to="/reset" className="font-500 text-navy underline underline-offset-4">
              Forgot your password?
            </Link>
          </p>
        )}

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