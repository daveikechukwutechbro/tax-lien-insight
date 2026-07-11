import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { useEffect, useState } from "react";
import { auctionDetailQuery } from "@/lib/queries/discovery";

export const Route = createFileRoute("/auctions/$id")({
  head: ({ loaderData }) => {
    const d = loaderData as { title: string; liens: unknown[]; county: { name: string; state: string } } | undefined;
    return {
      meta: [
        { title: d ? `${d.title} — Chicago TaxLien Auctions` : "Auction" },
        { name: "description", content: d ? `${d.liens.length} liens in ${d.county.name}, ${d.county.state}.` : "Auction details" },
      ],
    };
  },
  loader: ({ context, params }) => context.queryClient.ensureQueryData(auctionDetailQuery(params.id)),
  component: AuctionDetailPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="container-tight py-20 text-center">
        <h1 className="font-display text-2xl text-navy">Couldn't load auction</h1>
        <p className="mt-2 text-sm text-ink-muted">{error.message}</p>
        <button className="mt-4 rounded bg-navy px-4 py-2 text-sm text-white" onClick={() => { router.invalidate(); reset(); }}>Retry</button>
      </div>
    );
  },
  notFoundComponent: () => <div className="container-tight py-20">Auction not found.</div>,
});

const fmt$ = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function AuctionDetailPage() {
  const { id } = Route.useParams();
  const { data: a } = useSuspenseQuery(auctionDetailQuery(id));
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const starts = new Date(a.starts_at).getTime();
  const ends = new Date(a.ends_at).getTime();
  const isLive = now >= starts && now < ends;
  const target = isLive ? ends : starts;
  const remaining = Math.max(0, target - now);

  return (
    <div className="container-tight py-12">
      <Link to="/auctions" className="text-sm text-ink-muted hover:text-navy">← All auctions</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="font-display text-3xl font-600 text-navy sm:text-4xl">{a.title}</h1>
          <p className="mt-1 text-ink-muted">{a.county.name}, {a.county.state}</p>

          <div className="mt-6">
            <h2 className="font-display text-xl font-600 text-navy">Properties in this auction ({a.liens.length})</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-hairline bg-surface">
              {a.liens.length === 0 ? (
                <p className="p-8 text-center text-sm text-ink-muted">No liens listed yet.</p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {a.liens.map((l) => (
                    <li key={l.id} className="flex items-center gap-4 p-4">
                      {l.property.image_url && <img src={l.property.image_url} alt="" className="size-16 rounded-md object-cover" />}
                      <div className="min-w-0 flex-1">
                        <Link to="/properties/$id" params={{ id: l.property.id }} className="font-600 text-navy hover:underline">{l.property.address}</Link>
                        <div className="text-xs text-ink-muted">{l.property.city}, {l.property.state} {l.property.zip} · Parcel {l.property.parcel_id}</div>
                      </div>
                      <div className="text-sm text-right"><div className="text-xs text-ink-muted">Taxes</div><div className="font-600">{fmt$(l.taxes_owed)}</div></div>
                      <div className="text-sm text-right"><div className="text-xs text-ink-muted">Rate</div><div className="font-600">{(l.current_rate ?? l.starting_rate).toFixed(2)}%</div></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-hairline bg-surface p-5">
            <div className="text-xs uppercase tracking-wider text-ink-muted">{isLive ? "Ends in" : "Starts in"}</div>
            <div className="mt-2 font-display text-3xl font-600 text-navy">
              {hydrated ? formatCountdown(remaining) : "—"}
            </div>
            <div className="mt-2 text-xs text-ink-muted">
              {new Date(a.starts_at).toLocaleString()} → {new Date(a.ends_at).toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-hairline bg-surface p-5">
            <div className="text-xs uppercase tracking-wider text-ink-muted">Status</div>
            <div className="mt-1 font-600 capitalize text-navy">{a.status}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatCountdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}