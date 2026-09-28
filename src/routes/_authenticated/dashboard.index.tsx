import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, CreditCard, Trophy, Gavel, ArrowRight, CalendarDays, Lock, Receipt, Award, BadgeCheck } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { myBidsQuery, watchlistQuery, profileQuery, dashboardSummaryQuery, activityQuery } from "@/lib/queries/dashboard";
import { scheduledAuctionQuery } from "@/lib/queries/auctions";
import { ActivityRow } from "@/components/dashboard/activity-feed";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  pendingMs: 0,
  pendingComponent: () => <PageSkeleton rows={3} />,
  component: DashboardOverview,
});

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function DashboardOverview() {
  const { user } = useSession();
  const { data: auction } = useQuery(scheduledAuctionQuery);
  const { data: bids = [] } = useQuery(myBidsQuery(user?.id));
  const { data: watched = [] } = useQuery(watchlistQuery(user?.id));
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: summary } = useQuery(dashboardSummaryQuery(user?.id));
  const { data: activity = [] } = useQuery(activityQuery(user?.id));

  const activeBids = bids.filter((b) => b.status === "winning" || b.status === "outbid");
  const sf = (v: number | undefined) => fmt(v ?? 0);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-600 text-navy lg:text-4xl">My Dashboard</h1>
          <p className="mt-1 text-[15px] text-ink-muted">Here's what's happening with your tax lien investments.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <BalanceCard
          icon={<Wallet className="size-5" />}
          tone="bg-success/15 text-success"
          label="Available USDC"
          value={sf(summary?.funds.available)}
          subvalue={!summary ? "loading…" : undefined}
          accent="text-success"
          cta="Add Funds"
          href="/dashboard/funds"
        />
        <BalanceCard
          icon={<Lock className="size-5" />}
          tone="bg-navy/10 text-navy"
          label="Funds on Hold"
          value={sf(summary?.funds.held)}
          subvalue={!summary ? "loading…" : undefined}
          cta="View Holds"
          href="/dashboard/funds"
        />
        <BalanceCard
          icon={<Receipt className="size-5" />}
          tone="bg-warning/20 text-warning"
          label="Pending Payments"
          value={sf(summary?.payments.pending)}
          subvalue={!summary ? "loading…" : undefined}
          accent="text-warning"
          cta="View Invoices"
          href="/dashboard/payments"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MiniStat icon={<Gavel className="size-4" />} label="Total Bids" value={summary ? String(summary.bids.count) : "…"} subvalue={summary ? `${summary.bids.winning} winning · ${summary.bids.outbid} outbid` : "loading…"} cta="View Bids" href="/dashboard/bids" />
        <MiniStat icon={<CreditCard className="size-4" />} label="Total Paid" value={sf(summary?.payments.paid)} cta="History" href="/dashboard/payments" />
        <MiniStat icon={<Trophy className="size-4" />} label="Certificates Won" value={summary ? String(summary.awards.count) : "…"} accent="text-warning" value2={summary ? fmt(summary.awards.principalValue) : undefined} cta="Won Properties" href="/dashboard/won" />
        <MiniStat icon={<Award className="size-4" />} label="Awaiting Redemption" value={summary ? String(summary.redemptions.active) : "…"} subvalue={summary ? `${summary.redemptions.completed} completed` : undefined} cta="Redemptions" href="/dashboard/history" />
        <MiniStat icon={<BadgeCheck className="size-4" />} label="Redeemed" value={summary ? String(summary.redemptions.completed) : "…"} subvalue={summary ? `Interest ${fmt(summary.redemptions.realizedInterest)}` : undefined} cta="History" href="/dashboard/history" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel title="Upcoming Auctions" cta={{ label: "View All Auctions", href: "/" }}>
          {auction && auction.nextStartsAt ? (
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

        <Panel title="My Recent Activity" cta={{ label: "View All Activity", href: "/dashboard/activity" }}>
          {activity.length === 0 ? (
            <div className="text-sm text-ink-muted">No activity yet. Start by watching a property.</div>
          ) : (
            <ul className="space-y-3">
              {activity.slice(0, 5).map((a) => (
                <ActivityRow key={a.id} item={a} />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel title="My Bids" cta={{ label: "View All Bids", href: "/dashboard/bids" }}>
          {activeBids.length === 0 ? <p className="text-sm text-ink-muted">You have no active bids.</p> : (
            <ul className="space-y-2 text-sm">
              {activeBids.slice(0, 5).map((b) => (
                <li key={b.bid_id} className="flex items-center justify-between gap-3 border-b border-hairline pb-2 last:border-0">
                  <Link to="/properties/$id" params={{ id: b.lien.property.id }} className="min-w-0 truncate font-500 text-navy hover:underline">{b.lien.property.address}</Link>
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
                  <Link to="/properties/$id" params={{ id: w.property_id ?? "" }} className="text-navy hover:underline">{w.address}</Link>
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

function BalanceCard({ icon, tone, label, value, value2, subvalue, accent, cta, href }: {
  icon: React.ReactNode; tone: string; label: string; value: string; value2?: string;
  subvalue?: string; accent?: string; cta: string; href: string;
}) {
  return (
    <Link
      to={href}
      className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-hairline bg-surface p-4 shadow-[0_1px_2px_rgb(2_6_23/0.05)] transition-colors hover:border-navy/30 active:bg-surface-alt"
    >
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", tone)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-500 uppercase tracking-wider text-ink-muted">{label}</span>
        <span className={cn("block truncate font-display text-xl font-600 tabular-nums sm:text-2xl", accent ?? "text-navy")}>{value}</span>
        {value2 && <span className="block text-sm font-600 text-navy tabular-nums">{value2}</span>}
        {subvalue && <span className="block truncate text-xs text-ink-muted">{subvalue}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-600 text-navy">
        {cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function MiniStat({ icon, label, value, value2, subvalue, accent, cta, href }: {
  icon: React.ReactNode; label: string; value: string; value2?: string; subvalue?: string;
  accent?: string; cta: string; href: string;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-3.5">
      <div className="flex items-center justify-between gap-1 text-[11px] font-500 uppercase tracking-wider text-ink-muted">
        <span className="truncate">{label}</span>
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-navy/5 text-navy">{icon}</span>
      </div>
      <div className={cn("mt-1.5 font-display text-lg font-600 tabular-nums", accent ?? "text-navy")}>{value}</div>
      {value2 && <div className="text-xs font-600 text-navy tabular-nums">{value2}</div>}
      {subvalue && <div className="text-xs text-ink-muted">{subvalue}</div>}
      {cta && href && (
        <Link to={href} className="mt-1.5 inline-flex items-center gap-1 text-xs font-500 text-navy hover:underline">
          {cta} <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  );
}
function Panel({ title, cta, children }: { title: string; cta?: { label: string; href: string }; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-600 text-navy">{title}</h2>
        {cta && <Link to={cta.href} className="text-xs font-500 text-navy hover:underline">{cta.label} →</Link>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}