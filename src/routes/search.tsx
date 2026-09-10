import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { getCounties, getProperties, type RawProperty } from "@/lib/backend";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Properties — Auction Ledger" },
      { name: "description", content: "Search tax lien properties by address, city, county, or parcel ID." },
      { property: "og:title", content: "Search Properties" },
      { property: "og:description", content: "Find liened properties across participating counties." },
      { property: "og:url", content: "/search" },
    ],
    links: [{ rel: "canonical", href: "/search" }],
  }),
  component: SearchPage,
});

const fmt = (n: number | null | undefined) => n == null ? "—" : (n / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const statusLabel = (s: string | null | undefined) => (s ?? "unknown").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
const auctionDate = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

type Grouped = { key: string; countyName: string; stateCode: string; items: RawProperty[] };

function groupByCounty(rows: RawProperty[]): Grouped[] {
  const map = new Map<string, Grouped>();
  for (const r of rows) {
    const countyName = r.countyName ?? "Unassigned";
    const key = `${r.countyState ?? "—"}|${countyName}`;
    const g = map.get(key) ?? { key, countyName, stateCode: r.countyState ?? "", items: [] };
    g.items.push(r);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function SearchPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | "residential" | "land" | "commercial">("");
  const [county, setCounty] = useState("");

  const { data: counties = [] } = useQuery({
    queryKey: ["counties"],
    queryFn: getCounties,
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search", q, type, county],
    queryFn: () => getProperties({ search: q || undefined, type: type || undefined, jurisdictionId: county || undefined, pageSize: 100 }),
  });

  const groups = groupByCounty(results);

  return (
    <div className="container-tight py-10">
      <h1 className="font-display text-4xl font-600 text-navy">Search Properties</h1>
      <p className="mt-2 text-ink-muted">Find tax lien properties across participating counties, organized by their auction county.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-hairline bg-surface p-4 text-sm">
          <div className="text-xs font-600 uppercase tracking-wider text-ink-muted">Filters</div>
          <label className="mt-3 block"><span className="text-xs text-ink-muted">Keyword</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Address, city, parcel…" className="mt-1 h-9 w-full rounded-md border border-hairline px-2" /></label>
          <label className="mt-3 block"><span className="text-xs text-ink-muted">County</span>
            <select value={county} onChange={(e) => setCounty(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-hairline px-2">
              <option value="">All counties</option>
              {counties.map((c) => <option key={c.id} value={c.id}>{c.name}{c.stateCode ? `, ${c.stateCode}` : ""}</option>)}
            </select></label>
          <label className="mt-3 block"><span className="text-xs text-ink-muted">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="mt-1 h-9 w-full rounded-md border border-hairline px-2">
              <option value="">All types</option><option value="residential">Residential</option><option value="land">Land</option><option value="commercial">Commercial</option>
            </select></label>
        </aside>

        <div>
          <div className="mb-3 text-sm text-ink-muted">
            {isLoading ? "Searching…" : `${results.length} results across ${groups.length} count${groups.length === 1 ? "y" : "ies"}`}
          </div>

          {groups.map((g) => (
            <section key={g.key} className="mb-8">
              <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-hairline pb-2">
                <h2 className="flex items-center gap-2 font-display text-lg font-600 text-navy">
                  <MapPin className="size-4 text-gold" />
                  {g.countyName}
                </h2>
                {g.stateCode && (
                  <Link to="/states/$state" params={{ state: g.stateCode.toLowerCase() }} className="rounded-md bg-surface-alt px-2 py-0.5 text-xs font-500 text-navy hover:bg-navy hover:text-gold">
                    {g.stateCode.toUpperCase()} · {g.items.length} propert{g.items.length === 1 ? "y" : "ies"}
                  </Link>
                )}
                <Link to="/auctions" className="ml-auto text-sm font-500 text-navy underline-offset-2 hover:underline">View county auctions →</Link>
              </div>

              <ul className="grid gap-3 md:grid-cols-2">
                {g.items.map((r) => {
                  const liened = Boolean(r.auctionId && r.lotId);
                  return (
                    <li key={r.id} className="flex flex-col rounded-xl border border-hairline bg-surface p-4">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                            <Link to="/properties/$id" params={{ id: r.id }} search={{ lot: r.lotId ?? undefined, auction: r.auctionId ?? undefined }} className="font-display text-base font-600 text-navy hover:underline">{r.address}</Link>
                            <div className="text-xs text-ink-muted capitalize">{r.parcelId ? `Parcel ${r.parcelId}` : ""}{r.propertyType ? ` · ${r.propertyType}` : ""}</div>
                          </div>
                          <div className="mt-0.5 text-sm text-ink">{r.city ?? ""}{r.state ? `, ${r.state}` : ""}{r.postalCode ? ` ${r.postalCode}` : ""}</div>
                          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 border-t border-hairline pt-3">
                            <div>
                              <div className="text-xs uppercase tracking-wider text-ink-muted">Taxes Owed</div>
                              <div className="mt-0.5 font-600 tabular-nums text-navy">{fmt(r.taxesOwed)}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-wider text-ink-muted">Interest Rate</div>
                              <div className="mt-0.5 font-600 tabular-nums text-navy">{r.currentRate != null ? `${r.currentRate.toFixed(2)}%` : r.startingRate != null ? `${r.startingRate.toFixed(2)}%` : "—"}</div>
                            </div>
                            {liened && (
                              <div>
                                <div className="text-xs uppercase tracking-wider text-ink-muted">Auction</div>
                                <Link to="/auctions/$id" params={{ id: r.auctionId! }} className="mt-0.5 block font-500 tabular-nums text-navy hover:underline">
                                  {statusLabel(r.auctionStatus)}{r.auctionStartsAt ? ` · ${auctionDate(r.auctionStartsAt)}` : ""}
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3">
                        <Link to="/properties/$id" params={{ id: r.id }} search={{ lot: r.lotId ?? undefined, auction: r.auctionId ?? undefined }} className="rounded-md border border-hairline px-3 py-1.5 text-sm hover:border-navy hover:text-navy">View Property</Link>
                        {liened && (
                          <Link to="/auctions/$id" params={{ id: r.auctionId! }} className="rounded-md border border-hairline px-3 py-1.5 text-sm hover:border-navy hover:text-navy">
                            {statusLabel(r.lotStatus)} lot
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {!isLoading && results.length === 0 && (
            <div className="rounded-xl border border-hairline bg-surface p-10 text-center text-sm text-ink-muted">
              No properties matched your search. Try broadening your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}