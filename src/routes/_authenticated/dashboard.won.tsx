import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { myBidsQuery } from "@/lib/queries/dashboard";

export const Route = createFileRoute("/_authenticated/dashboard/won")({
  component: WonPage,
});
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function WonPage() {
  const { user } = useSession();
  const { data: bids = [] } = useQuery(myBidsQuery(user?.id));
  const won = bids.filter((b) => b.status === "won");
  const total = won.reduce((s, b) => s + b.lien.taxes_owed, 0);
  const avgRate = won.length ? won.reduce((s, b) => s + b.interest_rate, 0) / won.length : 0;

  return (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy">Won Properties</h1>
      <p className="mt-1 text-sm text-ink-muted">Properties you've successfully won at auction.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Total Won Properties" value={won.length} sub={`Total Value: ${fmt(total)}`} />
        <Card label="Total Amount Paid" value={fmt(total)} sub="View Payments" />
        <Card label="Average Interest Rate" value={`${avgRate.toFixed(2)}%`} sub="Weighted Average" />
        <Card label="Total Redeemed" value="0" sub="Total Value: $0" />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        {won.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">You haven't won any properties yet.</p> :
          <ul className="divide-y divide-hairline">
            {won.map((b) => (
              <li key={b.bid_id} className="flex items-center gap-4 p-4">
                {b.lien.property.image_url && <img src={b.lien.property.image_url} alt="" className="size-16 rounded-md object-cover" />}
                <div className="min-w-0 flex-1">
                  <Link to="/properties/$id" params={{ id: b.lien.property.id }} className="font-600 text-navy hover:underline">{b.lien.property.address}</Link>
                  <div className="text-xs text-ink-muted">{b.lien.property.city}, {b.lien.property.state}</div>
                </div>
                <div className="text-sm"><div className="text-xs text-ink-muted">Winning Bid</div><div className="font-600">{fmt(b.lien.taxes_owed)}</div></div>
                <div className="text-sm"><div className="text-xs text-ink-muted">Interest Rate</div><div className="font-600">{b.interest_rate.toFixed(2)}%</div></div>
                <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-500 text-success">Active</span>
              </li>
            ))}
          </ul>
        }
      </div>
    </div>
  );
}
function Card({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="text-xs uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="mt-2 font-display text-2xl font-600 text-navy">{value}</div>
      <div className="text-xs text-ink-muted">{sub}</div>
    </div>
  );
}