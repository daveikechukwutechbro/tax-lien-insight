import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Properties — Chicago TaxLien Auctions" },
      { name: "description", content: "Search tax lien properties by address, city, county, or parcel ID." },
      { property: "og:title", content: "Search Properties" },
      { property: "og:description", content: "Find liened properties across participating counties." },
      { property: "og:url", content: "/search" },
    ],
    links: [{ rel: "canonical", href: "/search" }],
  }),
  component: () => (
    <div className="container-tight py-20">
      <h1 className="font-display text-4xl font-600 text-navy">Search Properties</h1>
      <p className="mt-3 max-w-xl text-ink-muted">Full search UI, filters and map view arrive in Phase 2 with the property index.</p>
      <Link to="/" className="mt-6 inline-flex text-sm font-500 text-navy underline underline-offset-4">← Back home</Link>
    </div>
  ),
});