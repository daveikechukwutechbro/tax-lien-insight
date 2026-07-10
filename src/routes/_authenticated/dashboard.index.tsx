import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { Wallet, CreditCard, Trophy, Gavel, ArrowRight, CalendarDays } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { myBidsQuery, watchlistQuery, profileQuery } from "@/lib/queries/dashboard";
import { scheduledAuctionQuery } from "@/lib/queries/auctions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardOverview,
});

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function DashboardOverview() {
  const { user } = useSession();
  const { data: auction } = useSuspenseQuery(scheduledAuctionQuery);
  const { data: bids = [] } = useQuery(myBidsQuery(user?.id));
  const { data: watched = [] } = useQuery(watchlistQuery(user?.id));
  const { data: profile } = useQuery(profileQuery(user?.id));

  const wonBids = bids.filter((b) => b.status === "won");
  const activeBids = bids.filter((b) => b.status === "winning" || b.status === "outbid");
  const totalWon = wonBids.reduce((s, b) => s + b.lien.taxes_owed, 0);
  const totalBids = bids.reduce((s, b) => s + b.lien.taxes_owed, 0);

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-600 text-navy">My Dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">Here's what's happening with your tax lien investments.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Wallet className="size-5" />} label="Account Balance" value={fmt(Number(profile?.account_balance ?? 0))} accent="text-success" cta="Add Funds" href="/dashboard/funds" />
        <Stat icon={<CreditCard className="size-5" />} label="Total Paid" value={fmt(totalWon)} cta="View Payment History" href="/dashboard/payments" />
        <Stat icon={<Trophy className="size-5" />} label="Total Won" value={fmt(totalWon)} subvalue={`${wonBids.length} Properties`} accent="text-warning" cta="View Won Properties" href="/dashboard/won" />
        <Stat icon={<Gavel className="size-5" />} label="Total Bids" value={fmt(totalBids)} subvalue={`${bids.length} Bids`} cta="View My Bids" href="/dashboard/bids" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Upcoming Auctions" cta={{ label: "View All Auctions", href: "/" }}>
          {auction.nextStartsAt ? (
            <div>
              <div className="flex items-start gap-3">
                <div className="grid size-11 place-items-center rounded-lg bg-navy/5 text-navy">
                  <CalendarDays className="size-5" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-ink-muted">Next Auction</div>
                  <div className="font-display text-lg font-600 text-navy">
                    {new Date(auction.nextStartsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" })}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {new Date(auction.nextStartsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" })}
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-hairline pt-3 text-sm text-ink-muted">
                {auction.totalProperties} properties scheduled
              </div>
            </div>
          ) : <div className="text-sm text-ink-muted">No upcoming auctions.</div>}
        </Panel>

        <Panel title="My Recent Activity" cta={{ label: "View All Activity", href: "/dashboard/bids" }}>
          {bids.length === 0 ? (
            <div className="text-sm text-ink-muted">No activity yet. Start by watching a property.</div>
          ) : (
            <ul className="space-y-3">
              {bids.slice(0, 5).map((b) => (
                <li key={b.bid_id} className="flex justify-between border-b border-hairline pb-2 text-sm last:border-0">
                  <span>You placed a bid on <span className="font-600 text-navy">{b.lien.property.address}</span></span>
                  <span className="text-xs text-ink-muted">{new Date(b.placed_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel title="My Bids" cta={{ label: "View All Bids", href: "/dashboard/bids" }}>
          {activeBids.length === 0 ? <p className="text-sm text-ink-muted">You have no active bids.</p> : (
            <ul className="space-y-2 text-sm">
              {activeBids.slice(0, 5).map((b) => (
                <li key={b.bid_id} className="flex items-center justify-between border-b border-hairline pb-2 last:border-0">
                  <Link to="/properties/$id" params={{ id: b.lien.property.id }} className="font-500 text-navy hover:underline">{b.lien.property.address}</Link>
                  <span className={b.status === "winning" ? "rounded bg-success-soft px-2 py-0.5 text-xs text-success" : "rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive"}>{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Watched Properties" cta={{ label: "View All", href: "/dashboard/watched" }}>
          {watched.length === 0 ? <p className="text-sm text-ink-muted">You aren't watching any properties.</p> : (
            <ul className="space-y-2 text-sm">
              {watched.slice(0, 5).map((w) => (
                <li key={w.id}>
                  <Link to="/properties/$id" params={{ id: w.property_id }} className="text-navy hover:underline">{w.address}</Link>
                  <div className="text-xs text-ink-muted">{w.city}, {w.state}</div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, subvalue, accent, cta, href }: {
  icon: React.ReactNode; label: string; value: string; subvalue?: string;
  accent?: string; cta: string; href: string;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-muted">
        <span className="grid size-8 place-items-center rounded-lg bg-navy/5 text-navy">{icon}</span>
        {label}
      </div>
      <div className={`mt-3 font-display text-2xl font-600 ${accent ?? "text-navy"}`}>{value}</div>
      {subvalue && <div className="text-xs text-ink-muted">{subvalue}</div>}
      <Link to={href} className="mt-2 inline-flex items-center gap-1 text-xs font-500 text-navy hover:underline">
        {cta} <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}
function Panel({ title, cta, children }: { title: string; cta?: { label: string; href: string }; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-600 text-navy">{title}</h2>
        {cta && <Link to={cta.href} className="text-xs font-500 text-navy hover:underline">{cta.label} →</Link>}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}