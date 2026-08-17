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
        {bids.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">No history yet.</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 sm:hidden">
              {bids.map((b) => (
                <div key={b.bid_id} className="border-b border-hairline/60 p-4 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to="/properties/$id"
                        params={{ id: b.lien.property.id }}
                        className="font-500 text-navy hover:underline"
                      >
                        {b.lien.property.address}
                      </Link>
                      <div className="text-xs text-ink-muted">
                        {b.lien.property.city}, {b.lien.property.state}
                      </div>
                    </div>
                    <span className="text-right text-xs text-ink-muted">
                      {new Date(b.placed_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-ink-muted">Rate</span>
                      <span className="font-600 text-navy"> {b.interest_rate.toFixed(2)}%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-ink-muted">Taxes</span>
                      <span className="font-600 text-navy"> {fmt(b.lien.taxes_owed)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-ink-muted">Status</span>
                      <span className="font-600 capitalize text-navy">{b.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead className="border-b border-hairline bg-surface-alt text-left text-xs font-600 uppercase tracking-wider text-ink-muted">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Property</th>
                    <th className="px-4 py-2">Rate</th>
                    <th className="px-4 py-2">Taxes Owed</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((b) => (
                    <tr key={b.bid_id} className="border-b border-hairline/50 last:border-0">
                      <td className="px-4 py-2 text-xs">{new Date(b.placed_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2"><Link to="/properties/$id" params={{ id: b.lien.property.id }} className="font-500 text-navy hover:underline">{b.lien.property.address}</Link></td>
                      <td className="px-4 py-2 font-600">{b.interest_rate.toFixed(2)}%</td>
                      <td className="px-4 py-2">{fmt(b.lien.taxes_owed)}</td>
                      <td className="px-4 py-2 capitalize">{b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
