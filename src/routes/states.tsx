import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { statesListQuery } from "@/lib/queries/discovery";

export const Route = createFileRoute("/states")({
  head: () => ({
    meta: [
      { title: "Browse by State — Chicago TaxLien Auctions" },
      { name: "description", content: "Explore tax lien investment opportunities by state and county." },
      { property: "og:title", content: "Tax Lien Auctions by State" },
      { property: "og:description", content: "Counties and upcoming auctions across the US." },
    ],
    links: [{ rel: "canonical", href: "/states" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statesListQuery),
  component: StatesPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (<div className="container-tight py-20 text-center"><h1 className="font-display text-2xl text-navy">Couldn't load states</h1><p className="mt-2 text-sm text-ink-muted">{error.message}</p><button className="mt-4 rounded bg-navy px-4 py-2 text-sm text-white" onClick={() => { router.invalidate(); reset(); }}>Retry</button></div>);
  },
  notFoundComponent: () => <div className="container-tight py-20">Not found.</div>,
});

function StatesPage() {
  const { data } = useSuspenseQuery(statesListQuery);
  return (
    <div className="container-tight py-12">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-navy text-gold"><MapPin className="size-5" /></div>
        <div>
          <h1 className="font-display text-3xl font-600 text-navy sm:text-4xl">Browse by State</h1>
          <p className="text-sm text-ink-muted">Counties and upcoming sales, grouped by jurisdiction.</p>
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((s) => (
          <Link key={s.state} to="/states/$state" params={{ state: s.state }} className="rounded-xl border border-hairline bg-surface p-5 hover:border-navy">
            <div className="font-display text-xl font-600 text-navy">{s.state}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <Cell label="Counties" value={s.county_count} />
              <Cell label="Properties" value={s.property_count} />
              <Cell label="Upcoming" value={s.upcoming_auctions} />
            </div>
          </Link>
        ))}
        {data.length === 0 && <p className="text-ink-muted">No jurisdictions configured yet.</p>}
      </div>
    </div>
  );
}
function Cell({ label, value }: { label: string; value: number }) {
  return (<div><div className="text-xs uppercase tracking-wider text-ink-muted">{label}</div><div className="mt-0.5 font-600 text-ink">{value}</div></div>);
}