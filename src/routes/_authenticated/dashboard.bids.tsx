import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { myBidsQuery, type DashboardBid } from "@/lib/queries/dashboard";
import { Gavel, ThumbsDown, Trophy, XCircle } from "lucide-react";

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
      <h1 className="font-display text-3xl font-600 text-navy">My Bids</h1>
      <p className="mt-1 text-sm text-ink-muted">Track all the properties you've bid on. View your bid status, amounts, and auction details.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Gavel className="text-navy" />} label="Active Bids" value={active.length} total={fmt(active.reduce((s, b) => s + b.lien.taxes_owed, 0))} />
        <SummaryCard icon={<ThumbsDown className="text-destructive" />} label="Outbid" value={outbid.length} total={fmt(outbid.reduce((s, b) => s + b.lien.taxes_owed, 0))} />
        <SummaryCard icon={<Trophy className="text-success" />} label="Won" value={won.length} total={fmt(won.reduce((s, b) => s + b.lien.taxes_owed, 0))} />
        <SummaryCard icon={<XCircle className="text-ink-muted" />} label="Lost" value={lost.length} total={fmt(lost.reduce((s, b) => s + b.lien.taxes_owed, 0))} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
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
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-ink-muted">Loading…</td></tr>
            ) : bids.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-ink-muted">You haven't placed any bids yet.</td></tr>
            ) : bids.map((b) => <BidRow key={b.bid_id} bid={b} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BidRow({ bid }: { bid: DashboardBid }) {
  const p = bid.lien.property;
  const status = {
    winning: { bg: "bg-success-soft", fg: "text-success", label: "Highest Bid" },
    outbid: { bg: "bg-destructive/10", fg: "text-destructive", label: "Outbid" },
    won: { bg: "bg-success-soft", fg: "text-success", label: "Won" },
    lost: { bg: "bg-muted", fg: "text-ink-muted", label: "Lost" },
    invalid: { bg: "bg-muted", fg: "text-ink-muted", label: "Invalid" },
  }[bid.status];
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
        {bid.lien.auction && new Date(bid.lien.auction.starts_at).toLocaleDateString()}
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

function SummaryCard({ icon, label, value, total }: { icon: React.ReactNode; label: string; value: number; total: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-muted">
        <span className="grid size-8 place-items-center rounded-lg bg-surface-alt">{icon}</span>
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-600 text-navy">{value}</div>
      <div className="text-xs text-ink-muted">Total Amount: {total}</div>
    </div>
  );
}