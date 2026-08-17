import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";

export const Route = createFileRoute("/_authenticated/admin/bids")({
  component: BidsAdmin,
});

function BidsAdmin() {
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "bids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bids")
        .select("id, placed_at, interest_rate, status, user:profiles(full_name), lien:liens(id, property:properties(address, city, state), auction:auctions(title))")
        .order("placed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">Bids</h2>
      <p className="mt-1 text-sm text-ink-muted">All bids placed across every auction.</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface">
        {rows.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No bids yet.</p> :
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Bidder</th><th className="px-4 py-2">Property</th><th className="px-4 py-2">Auction</th><th className="px-4 py-2">Rate</th><th className="px-4 py-2">Status</th></tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const u = b.user as { full_name?: string } | null;
              const lien = b.lien as { property?: { address?: string; city?: string; state?: string } | null; auction?: { title?: string } | null } | null;
              const p = lien?.property; const a = lien?.auction;
              return (
                <tr key={b.id} className="border-b border-hairline/50 last:border-0">
                  <td className="px-4 py-2 text-xs">{new Date(b.placed_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{u?.full_name ?? "—"}</td>
                  <td className="px-4 py-2">{p ? `${p.address}, ${p.city} ${p.state}` : "—"}</td>
                  <td className="px-4 py-2 text-xs">{a?.title ?? "—"}</td>
                  <td className="px-4 py-2 font-600">{Number(b.interest_rate)}%</td>
                  <td className="px-4 py-2 text-xs capitalize">{b.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>}
      </div>
    </div>
  );
}