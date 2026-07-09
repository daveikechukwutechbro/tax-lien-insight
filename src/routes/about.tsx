import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Chicago TaxLien Auctions" },
      { name: "description", content: "About Chicago TaxLien Auctions — a transparent multi-state marketplace for tax lien certificates." },
      { property: "og:title", content: "About Chicago TaxLien Auctions" },
      { property: "og:description", content: "A transparent multi-state marketplace for tax lien certificates." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: () => (
    <div className="container-tight py-20">
      <h1 className="font-display text-4xl font-600 text-navy">About Us</h1>
      <p className="mt-3 max-w-xl text-ink-muted">Chicago TaxLien Auctions connects individual investors with county tax collectors across the United States for transparent, rules-based lien sales.</p>
      <Link to="/" className="mt-6 inline-flex text-sm font-500 text-navy underline underline-offset-4">← Back home</Link>
    </div>
  ),
});