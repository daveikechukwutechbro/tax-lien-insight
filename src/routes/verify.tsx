import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { MailCheck, CheckCircle2, XCircle, Clock, RotateCcw } from "lucide-react";
import { verifyEmail, resendVerification, AuthError, onAuthChange } from "@/lib/backend-auth";

const verifySearch = z.object({
  token: z.string().optional().default(""),
  email: z.string().optional().default(""),
});

export const Route = createFileRoute("/verify")({
  validateSearch: zodValidator(verifySearch),
  head: () => ({
    meta: [
      { title: "Verify your email — Chicago TaxLien Auctions" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPage,
});

type Status = "idle" | "checking" | "verified" | "error";

function VerifyPage() {
  const { token, email } = useSearch({ from: "/verify" });
  const hasToken = !!token;
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendEmail, setResendEmail] = useState(email);
  const [newToken, setNewToken] = useState<string | null>(null);

  const finalToken = useMemo(() => token.trim(), [token]);

  useEffect(() => {
    if (!hasToken) {
      // No token in the URL: this is the "check your email" landing page.
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("checking");
    verifyEmail(finalToken)
      .then(() => {
        // Notify the session hook so next /me reflects email_verified=true.
        onAuthChange();
        if (!cancelled) {
          setStatus("verified");
          toast.success("Your email has been verified. You can now log in.");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const e = err instanceof AuthError ? err : new Error(String(err));
        setErrorMsg(e.message);
        setStatus("error");
        setShowResendForm(true);
      });
    return () => {
      cancelled = true;
    };
  }, [finalToken, hasToken]);

  async function sendAgain(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await resendVerification(resendEmail);
      if (res.emailVerified) {
        toast.success("This email is already verified. You can log in now.");
        return;
      }
      if (res.verificationToken) {
        setNewToken(res.verificationToken);
        setStatus("idle");
        toast.success("New verification link generated.");
      } else {
        toast.success("A new verification link has been emailed to you.");
      }
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
          {status === "verified" ? (
            <CheckCircle2 className="size-6 text-success" />
          ) : status === "error" ? (
            <XCircle className="size-6 text-destructive" />
          ) : status === "checking" ? (
            <Clock className="size-6 text-gold" />
          ) : (
            <MailCheck className="size-6 text-navy" />
          )}
        </div>

        <h1 className="mt-4 text-center font-display text-xl font-600 text-navy">
          {status === "verified" ? "Email verified" : status === "error" ? "Verification failed" : "Verify your email"}
        </h1>

        {status === "checking" && (
          <p className="mt-2 text-center text-sm text-ink-muted">Confirming your verification link…</p>
        )}

        {status === "verified" && (
          <>
            <p className="mt-2 text-center text-sm text-ink-muted">
              Your email is confirmed. Head back to the login page to start bidding.
            </p>
            <Link
              to="/auth"
              className="mt-6 block w-full rounded-md bg-navy px-4 py-2.5 text-center text-sm font-600 text-primary-foreground hover:bg-navy-deep"
            >
              Log in
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <p className="mt-2 text-center text-sm text-ink-muted">{errorMsg}</p>
            <p className="mt-2 text-center text-sm text-ink-muted">
              The link may be expired or already used. Generate a new one below.
            </p>
            {newToken ? (
              <Link
                to="/verify"
                search={{ token: newToken, email: resendEmail }}
                className="mt-6 block w-full rounded-md bg-navy px-4 py-2.5 text-center text-sm font-600 text-primary-foreground hover:bg-navy-deep"
              >
                Verify now
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowResendForm(true)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-hairline bg-surface px-4 py-2.5 text-sm font-600 text-navy transition-colors hover:border-navy"
              >
                <RotateCcw className="size-4" /> Resend verification link
              </button>
            )}
          </>
        )}

        {isIdleOrChecking() && (
          <>
            <p className="mt-2 text-center text-sm text-ink-muted">
              We sent a verification link to <span className="font-600 text-navy">{email || resendEmail || "your email"}</span>.
              Click the link to activate your account.
            </p>
            <button
              type="button"
              onClick={() => setShowResendForm(true)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-hairline bg-surface px-4 py-2.5 text-sm font-600 text-navy transition-colors hover:border-navy"
            >
              <RotateCcw className="size-4" /> Didn't get it? Resend
            </button>
          </>
        )}

        {showResendForm && (
          <form onSubmit={sendAgain} className="mt-5 space-y-3 rounded-lg border border-hairline bg-surface-alt p-4">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-500 uppercase tracking-wider text-ink-muted">Email</span>
              <input
                required
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-navy px-4 py-2 text-sm font-600 text-primary-foreground hover:bg-navy-deep disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send new link"}
            </button>
          </form>
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

  function isIdleOrChecking() {
    return status === "idle" || status === "checking";
  }
}