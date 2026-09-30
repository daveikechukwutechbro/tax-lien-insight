import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { myBidsQuery, type DashboardBid } from "@/lib/queries/dashboard";
import { Gavel, ThumbsDown, Trophy, XCircle } from "lucide-react";
import { PageIntro, StatCard } from "@/components/dashboard/page-shell";

export const Route = createFileRoute("/_authenticated/dashboard/bids")({
  component: MyBidsPage,
});

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function MyBidsPage() {
  const { user } = useSession();
  const { data: bids = [], isLoading } = useQuery(myBidsQuery(user?.id));

  const active = bids.filter((b) => b.status === "winning");
  const outbid = bids.filter((b) => b.status === "outbid");
  const won = bids.filter((b) => b.status === "won");
  const lost = bids.filter((b) => b.status === "lost");

  return (
    <div>
      <PageIntro
        title="My Bids"
        subtitle="Track all the properties you've bid on. View your bid status, amounts, and auction details."
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Gavel className="size-4" />} label="Active Bids" value={active.length} sub={`Total Value: ${fmt(active.reduce((s, b) => s + b.lien.taxes_owed, 0))}`} />
        <StatCard icon={<ThumbsDown className="size-4" />} label="Outbid" value={outbid.length} sub={`Total Value: ${fmt(outbid.reduce((s, b) => s + b.lien.taxes_owed, 0))}`} accent="text-destructive" />
        <StatCard icon={<Trophy className="size-4" />} label="Won" value={won.length} sub={`Total Value: ${fmt(won.reduce((s, b) => s + b.lien.taxes_owed, 0))}`} accent="text-success" />
        <StatCard icon={<XCircle className="size-4" />} label="Lost" value={lost.length} sub={`Total Value: ${fmt(lost.reduce((s, b) => s + b.lien.taxes_owed, 0))}`} />
      </div>

      {isLoading ? (
        <p className="mt-6 rounded-xl border border-hairline bg-surface p-8 text-center text-sm text-ink-muted">
          Loading…
        </p>
      ) : bids.length === 0 ? (
        <p className="mt-6 rounded-xl border border-hairline bg-surface p-8 text-center text-sm text-ink-muted">
          You haven't placed any bids yet.
        </p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="mt-6 space-y-3 sm:hidden">
            {bids.map((b) => (
              <BidCard key={b.bid_id} bid={b} />
            ))}
          </div>
          {/* Desktop table */}
          <div className="mt-6 hidden sm:block">
            <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead className="border-b border-hairline bg-surface-alt text-left text-xs font-600 uppercase tracking-wider text-ink-muted">
                    <tr>
                      <th className="px-5 py-3">Property</th>
                      <th className="px-3 py-3">Auction</th>
                      <th className="px-3 py-3 text-right">My Rate</th>
                      <th className="px-3 py-3 text-right">Current Rate</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map((b) => (
                      <BidRow key={b.bid_id} bid={b} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type BidStatus = "winning" | "outbid" | "won" | "lost" | "invalid";
const STATUS_UI: Record<BidStatus, { bg: string; fg: string; label: string }> = {
  winning: { bg: "bg-success-soft", fg: "text-success", label: "Highest Bid" },
  outbid: { bg: "bg-destructive/10", fg: "text-destructive", label: "Outbid" },
  won: { bg: "bg-success-soft", fg: "text-success", label: "Won" },
  lost: { bg: "bg-muted", fg: "text-ink-muted", label: "Lost" },
  invalid: { bg: "bg-muted", fg: "text-ink-muted", label: "Invalid" },
};
const statusOf = (s: string) =>
  STATUS_UI[s as BidStatus] ?? { bg: "bg-muted", fg: "text-ink-muted", label: s };

function BidRow({ bid }: { bid: DashboardBid }) {
  const p = bid.lien.property;
  const status = statusOf(bid.status);
  return (
    <tr className="border-b border-hairline/60 last:border-0 hover:bg-surface-alt/60">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {p.image_url && <img src={p.image_url} alt="" className="size-10 rounded-md object-cover" />}
          <div>
            <div className="font-600 text-navy">{p.address}</div>
            <div className="text-xs text-ink-muted">{p.city}, {p.state} {p.zip}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-ink-muted">
        {bid.lien.auction && new Date(bid.lien.auction.starts_at ?? "").toLocaleDateString()}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{bid.interest_rate.toFixed(2)}%</td>
      <td className="px-3 py-3 text-right tabular-nums">
        {(bid.lien.current_rate ?? bid.lien.starting_rate).toFixed(2)}%
      </td>
      <td className="px-3 py-3">
        <span className={`inline-flex rounded-full ${status.bg} px-2.5 py-1 text-xs font-500 ${status.fg}`}>{status.label}</span>
      </td>
      <td className="px-3 py-3 text-right">
        <Link to="/properties/$id" params={{ id: p.id }} className="text-xs font-500 text-navy hover:underline">View</Link>
      </td>
    </tr>
  );
}

function BidCard({ bid }: { bid: DashboardBid }) {
  const p = bid.lien.property;
  const status = statusOf(bid.status);
  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="flex items-start gap-3">
        {p.image_url && (
          <img src={p.image_url} alt="" className="size-12 rounded-md object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-600 text-navy">{p.address}</div>
          <div className="text-xs text-ink-muted">
            {p.city}, {p.state} {p.zip}
          </div>
        </div>
        <span
          className={`inline-flex rounded-full ${status.bg} px-2 py-0.5 text-xs font-500 ${status.fg}`}
        >
          {status.label}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-xs text-ink-muted">Auction</div>
          <div className="font-500 text-navy">
            {bid.lien.auction
              ? new Date(bid.lien.auction.starts_at ?? "").toLocaleDateString()
              : "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-muted">My Rate</div>
          <div className="font-500 text-navy tabular-nums">
            {bid.interest_rate.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-ink-muted">Current Rate</div>
          <div className="font-500 text-navy tabular-nums">
            {(bid.lien.current_rate ?? bid.lien.starting_rate).toFixed(2)}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-muted">Taxes Owed</div>
          <div className="font-500 text-navy tabular-nums">{fmt(bid.lien.taxes_owed)}</div>
        </div>
      </div>
      <div className="mt-3">
        <Link
          to="/properties/$id"
          params={{ id: p.id }}
          className="text-xs font-500 text-navy underline underline-offset-4 hover:text-navy"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}