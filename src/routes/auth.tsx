import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log In or Create Account — Chicago TaxLien Auctions" },
      { name: "description", content: "Log in or create a bidder account for Chicago TaxLien Auctions." },
      { name: "robots", content: "noindex" },
      { property: "og:url", content: "/auth" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: () => (
    <div className="container-tight grid place-items-center py-24">
      <div className="w-full max-w-md rounded-xl border border-hairline bg-surface p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-600 text-navy">Account access</h1>
        <p className="mt-2 text-sm text-ink-muted">Auth flows (email + password, KYC verification, and bidder onboarding) ship in Phase 2 once Lovable Cloud is enabled.</p>
        <Link to="/" className="mt-6 inline-flex text-sm font-500 text-navy underline underline-offset-4">← Back home</Link>
      </div>
    </div>
  ),
});