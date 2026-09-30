import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { watchlistQuery } from "@/lib/queries/dashboard";
import { removeWatchlistItem } from "@/lib/backend";
import { Bookmark, CalendarDays, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageIntro, StatCard } from "@/components/dashboard/page-shell";

export const Route = createFileRoute("/_authenticated/dashboard/watched")({
  validateSearch: (s: Record<string, unknown>): { filter?: string } => ({
    filter: typeof s.filter === "string" ? s.filter : undefined,
  }),
  component: WatchedPage,
});

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const WATCH_FILTERS = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming Auctions" },
  { value: "unscheduled", label: "Not Yet Scheduled" },
] as const;

function WatchedPage() {
  const { user } = useSession();
  const { filter } = Route.useSearch();
  const { data: watched = [], isLoading } = useQuery(watchlistQuery(user?.id));
  const qc = useQueryClient();

  const upcoming = watched.filter((w) => w.auction_starts_at && new Date(w.auction_starts_at) > new Date());
  const unscheduled = watched.filter((w) => !w.auction_starts_at);

  const visible = filter === "upcoming" ? upcoming : filter === "unscheduled" ? unscheduled : watched;
  const filterLabel = WATCH_FILTERS.find((f) => f.value === filter)?.label;

  async function remove(id: string) {
    try {
      await removeWatchlistItem(id);
      qc.invalidateQueries({ queryKey: ["dashboard", "watchlist"] });
      toast.success("Removed from watchlist");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove");
    }
  }

  return (
    <div>
      <PageIntro
        title="Watched Properties"
        subtitle="Properties you're watching and tracking for upcoming auctions."
      />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={<Bookmark className="size-4" />} label="Total Watched" value={watched.length} sub="Properties" to="/dashboard/watched" search={{ filter: "all" }} cta="View" />
        <StatCard icon={<CalendarDays className="size-4" />} label="Upcoming Auctions" value={upcoming.length} sub="Starting Soon" accent="text-success" to="/dashboard/watched" search={{ filter: "upcoming" }} cta="View" />
        <StatCard icon={<CalendarDays className="size-4" />} label="Not Yet Scheduled" value={unscheduled.length} sub="Coming Soon" accent="text-warning" to="/dashboard/watched" search={{ filter: "unscheduled" }} cta="View" />
      </div>

      {watched.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {WATCH_FILTERS.map((f) => (
            <Link
              key={f.value}
              to="/dashboard/watched"
              search={{ filter: f.value }}
              className={
                filter === f.value || (!filter && f.value === "all")
                  ? "rounded-full bg-navy px-3 py-1.5 text-xs font-600 text-primary-foreground"
                  : "rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-500 text-ink transition-colors hover:border-navy/40 hover:text-navy"
              }
            >
              {f.label}
            </Link>
          ))}
          <span className="text-xs text-ink-muted">
            {filter && filter !== "all" ? `${visible.length} ${filterLabel?.toLowerCase()}` : `${visible.length} total`}
          </span>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-hairline bg-surface">
        {isLoading ? <p className="p-8 text-center text-sm text-ink-muted">Loading…</p> :
         watched.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">Nothing on your watchlist yet.</p> :
         visible.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No {filterLabel?.toLowerCase()} yet.</p> :
         <ul className="divide-y divide-hairline">
           {visible.map((w) => (
             <li key={w.id} className="flex flex-wrap items-center gap-4 p-4">
               {w.image_url ? <img src={w.image_url} alt="" className="size-20 rounded-md object-cover" /> : <div className="size-20 rounded-md bg-surface-alt" />}
               <div className="min-w-0 flex-1">
                 <Link to="/properties/$id" params={{ id: w.property_id ?? "" }} className="font-600 text-navy hover:underline">{w.address}</Link>
                 <div className="text-xs text-ink-muted">{w.city}, {w.state} {w.zip} · Parcel {w.parcel_id}</div>
               </div>
               <div className="text-sm">
                 <div className="text-xs text-ink-muted">Taxes Owed</div>
                 <div className="font-600 text-navy">{w.taxes_owed != null ? fmt(w.taxes_owed) : "—"}</div>
               </div>
               <div className="text-sm">
                 <div className="text-xs text-ink-muted">Interest Rate</div>
                 <div className="font-600 text-navy">{w.current_rate != null ? `${w.current_rate.toFixed(2)}%` : w.starting_rate != null ? `${w.starting_rate.toFixed(2)}%` : "—"}</div>
               </div>
               <Link to="/properties/$id" params={{ id: w.property_id ?? "" }} className="rounded-md border border-hairline px-3 py-1.5 text-sm hover:border-navy hover:text-navy">View Details</Link>
               <button onClick={() => remove(w.id)} aria-label="Remove" className="text-ink-muted hover:text-destructive"><Trash2 className="size-4" /></button>
             </li>
           ))}
         </ul>
        }
      </div>
    </div>
  );
}