import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { myBidsQuery } from "@/lib/queries/dashboard";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/dashboard/history")({
  component: History,
});
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function History() {
  const { user } = useSession();
  const { data: bids = [] } = useQuery(myBidsQuery(user?.id));
  return (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy">Purchase History</h1>
      <p className="mt-1 text-sm text-ink-muted">Complete record of every bid you've placed.</p>
      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        {bids.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No history yet.</p> :
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Property</th><th className="px-4 py-2">Rate</th><th className="px-4 py-2">Taxes Owed</th><th className="px-4 py-2">Status</th></tr>
            </thead>
            <tbody>
              {bids.map((b) => (
                <tr key={b.bid_id} className="border-b border-hairline/50 last:border-0">
                  <td className="px-4 py-2 text-xs">{new Date(b.placed_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2"><Link to="/properties/$id" params={{id:b.lien.property.id}} className="font-500 text-navy hover:underline">{b.lien.property.address}</Link></td>
                  <td className="px-4 py-2 font-600">{b.interest_rate.toFixed(2)}%</td>
                  <td className="px-4 py-2">{fmt(b.lien.taxes_owed)}</td>
                  <td className="px-4 py-2 capitalize">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}
