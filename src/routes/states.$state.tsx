import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { stateDetailQuery } from "@/lib/queries/discovery";

export const Route = createFileRoute("/states/$state")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.state} Tax Lien Counties — Chicago TaxLien Auctions` },
      { name: "description", content: `Counties and tax lien auctions in ${params.state}.` },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(stateDetailQuery(params.state)),
  component: StateDetailPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (<div className="container-tight py-20 text-center"><h1 className="font-display text-2xl text-navy">Couldn't load state</h1><p className="mt-2 text-sm text-ink-muted">{error.message}</p><button className="mt-4 rounded bg-navy px-4 py-2 text-sm text-white" onClick={() => { router.invalidate(); reset(); }}>Retry</button></div>);
  },
  notFoundComponent: () => <div className="container-tight py-20">State not found.</div>,
});

function StateDetailPage() {
  const { state } = Route.useParams();
  const { data } = useSuspenseQuery(stateDetailQuery(state));
  return (
    <div className="container-tight py-12">
      <Link to="/states" className="text-sm text-ink-muted hover:text-navy">← All states</Link>
      <h1 className="mt-4 font-display text-3xl font-600 text-navy sm:text-4xl">{state}</h1>
      <p className="text-sm text-ink-muted">{data.counties.length} participating counties</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {data.counties.map((c) => (
          <div key={c.id} className="rounded-xl border border-hairline bg-surface p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-lg font-600 text-navy">{c.name} County</div>
                <div className="text-xs text-ink-muted">{c.property_count} properties</div>
              </div>
              {c.next_auction ? (
                <Link to="/auctions/$id" params={{ id: c.next_auction.id }} className="rounded bg-gold px-3 py-1 text-xs font-600 text-navy hover:bg-gold-soft">View auction</Link>
              ) : (
                <span className="rounded bg-ink-muted/10 px-2 py-0.5 text-xs text-ink-muted">No upcoming</span>
              )}
            </div>
            {c.next_auction && (
              <div className="mt-3 text-xs text-ink-muted">Next auction: {new Date(c.next_auction.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}