import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { myBidsQuery } from "@/lib/queries/dashboard";
import { Gavel, TrendingUp, XCircle } from "lucide-react";
import { PageIntro, StatCard } from "@/components/dashboard/page-shell";

export const Route = createFileRoute("/_authenticated/dashboard/lost")({
  component: LostPage,
});
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function LostPage() {
  const { user } = useSession();
  const { data: bids = [] } = useQuery(myBidsQuery(user?.id));
  const lost = bids.filter((b) => b.status === "lost" || b.status === "outbid");
  const total = lost.reduce((s, b) => s + b.lien.taxes_owed, 0);

  return (
    <div>
      <PageIntro
        title="Lost Properties"
        subtitle="Properties you bid on but did not win."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard icon={<XCircle className="size-4" />} label="Total Lost Properties" value={lost.length} sub={`Total Value: ${fmt(total)}`} accent="text-destructive" />
        <StatCard icon={<Gavel className="size-4" />} label="Total Amount Bid" value={fmt(total)} sub={`Across ${lost.length} Properties`} />
        <StatCard icon={<TrendingUp className="size-4" />} label="Highest Bid Lost" value={lost.length ? fmt(Math.max(...lost.map((l) => l.lien.taxes_owed))) : "—"} sub="Across all bids" accent="text-warning" />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        {lost.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">You haven't lost any bids yet.</p> :
          <ul className="divide-y divide-hairline">
            {lost.map((b) => (
              <li key={b.bid_id} className="flex items-center gap-4 p-4">
                {b.lien.property.image_url && <img src={b.lien.property.image_url} alt="" className="size-16 rounded-md object-cover" />}
                <div className="min-w-0 flex-1">
                  <Link to="/properties/$id" params={{ id: b.lien.property.id }} className="font-600 text-navy hover:underline">{b.lien.property.address}</Link>
                  <div className="text-xs text-ink-muted">{b.lien.property.city}, {b.lien.property.state}</div>
                </div>
                <div className="text-sm"><div className="text-xs text-ink-muted">Your Bid</div><div className="font-600">{b.interest_rate.toFixed(2)}%</div></div>
                <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-500 text-destructive">Lost</span>
              </li>
            ))}
          </ul>
        }
      </div>
    </div>
  );
}