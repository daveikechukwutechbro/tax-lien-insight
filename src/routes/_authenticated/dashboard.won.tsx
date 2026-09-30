import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CreditCard, Download, TrendingUp, Trophy } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { myBidsQuery, profileQuery } from "@/lib/queries/dashboard";
import { printLienCertificate } from "@/lib/lien-certificate";
import { PageIntro, StatCard } from "@/components/dashboard/page-shell";

export const Route = createFileRoute("/_authenticated/dashboard/won")({
  component: WonPage,
});
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function WonPage() {
  const { user } = useSession();
  const { data: bids = [] } = useQuery(myBidsQuery(user?.id));
  const { data: profile } = useQuery(profileQuery(user?.id));
  const won = bids.filter((b) => b.status === "won");
  const total = won.reduce((s, b) => s + b.lien.taxes_owed, 0);
  const avgRate = won.length ? won.reduce((s, b) => s + b.interest_rate, 0) / won.length : 0;

  const issueCertificate = (b: (typeof won)[number]) =>
    printLienCertificate({
      bid: b,
      holderName: profile?.full_name ?? user?.email?.split("@")[0] ?? "Auction Ledger",
      holderEmail: user?.email ?? "",
    });

  return (
    <div>
      <PageIntro
        title="Won Properties"
        subtitle="Properties you've successfully won at auction."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Trophy className="size-4" />} label="Total Won Properties" value={won.length} sub={`Total Value: ${fmt(total)}`} accent="text-success" />
        <StatCard icon={<CreditCard className="size-4" />} label="Total Amount Paid" value={fmt(total)} cta="View Payments" href="/dashboard/payments" />
        <StatCard icon={<TrendingUp className="size-4" />} label="Average Interest Rate" value={`${avgRate.toFixed(2)}%`} sub="Weighted Average" accent="text-success" />
        <StatCard icon={<BadgeCheck className="size-4" />} label="Total Redeemed" value="0" sub="Total Value: $0" />
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
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-500 text-success">Active</span>
                  <button
                    type="button"
                    onClick={() => issueCertificate(b)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 py-1 text-xs font-500 text-navy transition-colors hover:bg-surface-alt"
                  >
                    <Download className="size-3.5" strokeWidth={1.75} />
                    Certificate
                  </button>
                </div>
              </li>
            ))}
          </ul>
        }
      </div>
    </div>
  );
}