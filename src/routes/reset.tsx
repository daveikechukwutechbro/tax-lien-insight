import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { KeyRound, CheckCircle2, MailCheck } from "lucide-react";
import { requestPasswordReset, resetPassword, AuthError } from "@/lib/backend-auth";

const resetSearch = z.object({
  token: z.string().optional().default(""),
});

export const Route = createFileRoute("/reset")({
  validateSearch: zodValidator(resetSearch),
  head: () => ({
    meta: [
      { title: "Reset your password — Auction Ledger" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const { token } = useSearch({ from: "/reset" });
  const hasToken = !!token;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [directResetToken, setDirectResetToken] = useState<string | null>(null);

  useEffect(() => {
    if (hasToken) {
      setDirectResetToken(null);
      setDone(false);
    }
  }, [token, hasToken]);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await requestPasswordReset(email);
      if (res.resetToken) {
        setDirectResetToken(res.resetToken);
        toast.success("A reset link was generated.");
        setSent(true);
      } else {
        toast.success("If that email exists, a reset link has been sent.");
        setSent(true);
      }
    } catch (err) {
      const e = err instanceof AuthError ? err : new Error(String(err));
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      toast.success("Password updated. Log in with your new password.");
    } catch (err) {
      const e = err instanceof AuthError ? err : new Error(String(err));
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-tight grid place-items-center py-16">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-8 shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-navy/5">
          {done ? <CheckCircle2 className="size-6 text-success" /> : hasToken ? <KeyRound className="size-6 text-navy" /> : <MailCheck className="size-6 text-navy" />}
        </div>

        {done ? (
          <>
            <h1 className="mt-4 text-center font-display text-xl font-600 text-navy">Password updated</h1>
            <p className="mt-2 text-center text-sm text-ink-muted">
              Your password has been changed. All other sessions were signed out.
            </p>
            <Link
              to="/auth"
              className="mt-6 block w-full rounded-md bg-navy px-4 py-2.5 text-center text-sm font-600 text-primary-foreground hover:bg-navy-deep"
            >
              Log in
            </Link>
          </>
        ) : hasToken ? (
          <>
            <h1 className="mt-4 text-center font-display text-xl font-600 text-navy">Set a new password</h1>
            <p className="mt-2 text-center text-sm text-ink-muted">Your reset link is valid for 60 minutes.</p>
            <form onSubmit={doReset} className="mt-6 space-y-3">
              <Field label="New password">
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm new password">
                <input
                  required
                  type="password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input"
                  autoComplete="new-password"
                />
              </Field>
              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full rounded-md bg-navy px-4 py-2.5 text-sm font-600 text-primary-foreground hover:bg-navy-deep disabled:opacity-60"
              >
                {busy ? "Saving…" : "Reset password"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-center font-display text-xl font-600 text-navy">Reset your password</h1>
            {sent ? (
              <>
                <p className="mt-2 text-center text-sm text-ink-muted">
                  Check your inbox for a reset link.
                </p>
                {directResetToken ? (
                  <Link
                    to="/reset"
                    search={{ token: directResetToken }}
                    className="mt-6 block w-full rounded-md bg-navy px-4 py-2.5 text-center text-sm font-600 text-primary-foreground hover:bg-navy-deep"
                  >
                    Continue reset → enter new password
                  </Link>
                ) : (
                  <p className="mt-6 text-center text-sm text-ink-muted">
                    Didn't get it? Check your spam folder or try again.
                  </p>
                )}
              </>
            ) : (
              <form onSubmit={requestReset} className="mt-6 space-y-3">
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
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 w-full rounded-md bg-navy px-4 py-2.5 text-sm font-600 text-primary-foreground hover:bg-navy-deep disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send reset link"}
                </button>
              </form>
            )}
          </>
        )}

        <Link to="/auth" className="mt-6 block text-center text-xs text-ink-muted underline underline-offset-4">
          ← Back to log in
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