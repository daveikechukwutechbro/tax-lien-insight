import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Gavel } from "lucide-react";
import { auctionsListQuery } from "@/lib/queries/discovery";

export const Route = createFileRoute("/auctions")({
  head: () => ({
    meta: [
      { title: "Tax Lien Auctions Calendar — Chicago TaxLien Auctions" },
      { name: "description", content: "Browse every upcoming and live tax lien auction across participating US counties." },
      { property: "og:title", content: "Tax Lien Auctions Calendar" },
      { property: "og:description", content: "Live and upcoming sales, sorted by start date." },
      { property: "og:url", content: "/auctions" },
    ],
    links: [{ rel: "canonical", href: "/auctions" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(auctionsListQuery),
  component: AuctionsPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="container-tight py-20 text-center">
        <h1 className="font-display text-2xl text-navy">Couldn't load auctions</h1>
        <p className="mt-2 text-sm text-ink-muted">{error.message}</p>
        <button className="mt-4 rounded bg-navy px-4 py-2 text-sm text-white" onClick={() => { router.invalidate(); reset(); }}>Retry</button>
      </div>
    );
  },
  notFoundComponent: () => <div className="container-tight py-20">Not found.</div>,
});

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const fmt$ = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function AuctionsPage() {
  const { data } = useSuspenseQuery(auctionsListQuery);
  const grouped = { live: [] as typeof data, scheduled: [] as typeof data, closed: [] as typeof data };
  for (const a of data) grouped[a.status === "live" ? "live" : a.status === "closed" ? "closed" : "scheduled"].push(a);

  return (
    <div className="container-tight py-12">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-navy text-gold"><Gavel className="size-5" /></div>
        <div>
          <h1 className="font-display text-3xl font-600 text-navy sm:text-4xl">Auction Calendar</h1>
          <p className="text-sm text-ink-muted">All live, upcoming, and recently closed tax lien sales.</p>
        </div>
      </div>

      {(["live", "scheduled", "closed"] as const).map((k) =>
        grouped[k].length > 0 && (
          <section key={k} className="mt-10">
            <h2 className="font-display text-xl font-600 text-navy capitalize">{k === "scheduled" ? "Upcoming" : k}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {grouped[k].map((a) => (
                <Link key={a.id} to="/auctions/$id" params={{ id: a.id }} className="rounded-xl border border-hairline bg-surface p-5 hover:border-navy">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-lg font-600 text-navy">{a.title}</div>
                      <div className="text-sm text-ink-muted">{a.county.name}, {a.county.state}</div>
                    </div>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <Stat label="Starts" value={fmtDate(a.starts_at)} />
                    <Stat label="Liens" value={a.lien_count.toString()} />
                    <Stat label="Taxes owed" value={fmt$(a.total_taxes_owed)} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      )}

      {data.length === 0 && (
        <p className="mt-16 text-center text-ink-muted">No auctions on the calendar yet.</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="mt-0.5 font-600 text-ink">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls = status === "live" ? "bg-success-soft text-success" : status === "closed" ? "bg-ink-muted/10 text-ink-muted" : "bg-gold/20 text-navy";
  return <span className={`rounded px-2 py-0.5 text-xs font-500 capitalize ${cls}`}>{status}</span>;
}