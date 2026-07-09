import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/properties/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Property ${params.id} — Chicago TaxLien Auctions` },
      { name: "description", content: `Tax lien details for property ${params.id}: parcel data, lien amount, interest rate, auction status, and bidding.` },
      { property: "og:title", content: `Property ${params.id}` },
      { property: "og:description", content: "Tax lien certificate details, parcel data, and bidding." },
      { property: "og:url", content: `/properties/${params.id}` },
    ],
    links: [{ rel: "canonical", href: `/properties/${params.id}` }],
  }),
  component: PropertyDetail,
});

function PropertyDetail() {
  const { id } = Route.useParams();
  return (
    <div className="container-tight py-16">
      <div className="text-xs font-500 uppercase tracking-wider text-ink-muted">Property</div>
      <h1 className="mt-1 font-display text-3xl font-600 text-navy">Parcel {id}</h1>
      <p className="mt-3 max-w-xl text-ink-muted">
        Full property detail — assessed value, lien history, tax rolls, documents, bidding
        panel, and auction timeline — arrives in Phase 2 with the database and bidding engine.
      </p>
      <Link to="/" className="mt-6 inline-flex text-sm font-500 text-navy underline underline-offset-4">← Back to auctions</Link>
    </div>
  );
}