import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auctions")({
  head: () => ({
    meta: [
      { title: "Auctions — Chicago TaxLien Auctions" },
      { name: "description", content: "Browse upcoming and live tax lien auctions across participating US counties." },
      { property: "og:title", content: "Tax Lien Auctions" },
      { property: "og:description", content: "Upcoming and live tax lien auctions." },
      { property: "og:url", content: "/auctions" },
    ],
    links: [{ rel: "canonical", href: "/auctions" }],
  }),
  component: () => <StubPage title="Auctions" description="A full auction calendar with live and upcoming sales lands here in Phase 2." />,
});

function StubPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="container-tight py-20">
      <h1 className="font-display text-4xl font-600 text-navy">{title}</h1>
      <p className="mt-3 max-w-xl text-ink-muted">{description}</p>
      <Link to="/" className="mt-6 inline-flex text-sm font-500 text-navy underline underline-offset-4">← Back home</Link>
    </div>
  );
}