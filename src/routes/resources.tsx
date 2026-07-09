import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Chicago TaxLien Auctions" },
      { name: "description", content: "Investor guides, state interest rate schedules, and glossary for tax lien investing." },
      { property: "og:title", content: "Tax Lien Resources" },
      { property: "og:description", content: "Guides and reference material for tax lien investors." },
      { property: "og:url", content: "/resources" },
    ],
    links: [{ rel: "canonical", href: "/resources" }],
  }),
  component: () => (
    <div className="container-tight py-20">
      <h1 className="font-display text-4xl font-600 text-navy">Resources</h1>
      <p className="mt-3 max-w-xl text-ink-muted">Investor guides, state-by-state interest rate schedules, and glossary will publish here.</p>
      <Link to="/" className="mt-6 inline-flex text-sm font-500 text-navy underline underline-offset-4">← Back home</Link>
    </div>
  ),
});