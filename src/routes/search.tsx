import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";
import { useState } from "react";

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
  component: SearchPage,
});

const fmt = (n: number | null) => n === null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function SearchPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | "residential" | "land" | "commercial">("");
  const { data: counties = [] } = useQuery({
    queryKey: ["counties"],
    queryFn: async () => (await supabase.from("counties").select("*").order("name")).data ?? [],
  });
  const [county, setCounty] = useState("");

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["search", q, type, county],
    queryFn: async () => {
      let query = supabase.from("properties").select("id, address, city, state, zip, parcel_id, image_url, property_type, county:counties(name, state), liens(taxes_owed, current_rate, starting_rate)").limit(50);
      if (q) query = query.or(`address.ilike.%${q}%,city.ilike.%${q}%,parcel_id.ilike.%${q}%`);
      if (type) query = query.eq("property_type", type);
      if (county) query = query.eq("county_id", county);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="container-tight py-10">
      <h1 className="font-display text-4xl font-600 text-navy">Search Properties</h1>
      <p className="mt-2 text-ink-muted">Find tax lien properties across participating counties.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-hairline bg-surface p-4 text-sm">
          <div className="text-xs font-600 uppercase tracking-wider text-ink-muted">Filters</div>
          <label className="mt-3 block"><span className="text-xs text-ink-muted">Keyword</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Address, city, parcel…" className="mt-1 h-9 w-full rounded-md border border-hairline px-2" /></label>
          <label className="mt-3 block"><span className="text-xs text-ink-muted">County</span>
            <select value={county} onChange={(e) => setCounty(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-hairline px-2">
              <option value="">All counties</option>
              {counties.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
            </select></label>
          <label className="mt-3 block"><span className="text-xs text-ink-muted">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="mt-1 h-9 w-full rounded-md border border-hairline px-2">
              <option value="">All types</option><option value="residential">Residential</option><option value="land">Land</option><option value="commercial">Commercial</option>
            </select></label>
        </aside>

        <div>
          <div className="mb-3 text-sm text-ink-muted">{isLoading ? "Searching…" : `${results.length} results`}</div>
          <ul className="space-y-3">
            {results.map((r) => {
              const lien = (r.liens as { taxes_owed: number; current_rate: number | null; starting_rate: number }[])?.[0];
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-hairline bg-surface p-4">
                  {r.image_url ? <img src={r.image_url} alt="" className="size-24 rounded-md object-cover" /> : <div className="size-24 rounded-md bg-surface-alt" />}
                  <div className="min-w-0 flex-1">
                    <Link to="/properties/$id" params={{ id: r.id }} className="font-600 text-navy hover:underline">{r.address}</Link>
                    <div className="text-xs text-ink-muted">{r.city}, {r.state} {r.zip} · {(r.county as { name?: string })?.name} · Parcel {r.parcel_id}</div>
                    <div className="mt-1 text-xs uppercase tracking-wider text-ink-muted capitalize">{r.property_type}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-xs text-ink-muted">Taxes Owed</div>
                    <div className="font-600 text-navy">{fmt(lien ? Number(lien.taxes_owed) : null)}</div>
                  </div>
                  <div className="text-sm">
                    <div className="text-xs text-ink-muted">Rate</div>
                    <div className="font-600 text-navy">{lien ? `${Number(lien.current_rate ?? lien.starting_rate).toFixed(2)}%` : "—"}</div>
                  </div>
                  <Link to="/properties/$id" params={{ id: r.id }} className="rounded-md border border-hairline px-3 py-1.5 text-sm hover:border-navy hover:text-navy">View</Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}