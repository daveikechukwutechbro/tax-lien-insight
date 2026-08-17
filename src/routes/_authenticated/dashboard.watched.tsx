import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { watchlistQuery } from "@/lib/queries/dashboard";
import { supabase } from "@/integrations/firebase/client";
import { Bookmark, CalendarDays, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/watched")({
  component: WatchedPage,
});

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function WatchedPage() {
  const { user } = useSession();
  const { data: watched = [], isLoading } = useQuery(watchlistQuery(user?.id));
  const qc = useQueryClient();

  async function remove(id: string) {
    const { error } = await supabase.from("watchlist").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["dashboard", "watchlist"] });
    toast.success("Removed from watchlist");
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy">Watched Properties</h1>
      <p className="mt-1 text-sm text-ink-muted">Properties you're watching and tracking for upcoming auctions.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MiniStat icon={<Bookmark className="text-navy" />} label="Total Watched" value={watched.length} sub="Properties" />
        <MiniStat icon={<CalendarDays className="text-success" />} label="Upcoming Auctions" value={watched.filter((w) => w.auction_starts_at && new Date(w.auction_starts_at) > new Date()).length} sub="Starting Soon" />
        <MiniStat icon={<CalendarDays className="text-warning" />} label="Not Yet Scheduled" value={watched.filter((w) => !w.auction_starts_at).length} sub="Coming Soon" />
      </div>

      <div className="mt-6 rounded-xl border border-hairline bg-surface">
        {isLoading ? <p className="p-8 text-center text-sm text-ink-muted">Loading…</p> :
         watched.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">Nothing on your watchlist yet.</p> :
         <ul className="divide-y divide-hairline">
           {watched.map((w) => (
             <li key={w.id} className="flex flex-wrap items-center gap-4 p-4">
               {w.image_url ? <img src={w.image_url} alt="" className="size-20 rounded-md object-cover" /> : <div className="size-20 rounded-md bg-surface-alt" />}
               <div className="min-w-0 flex-1">
                 <Link to="/properties/$id" params={{ id: w.property_id }} className="font-600 text-navy hover:underline">{w.address}</Link>
                 <div className="text-xs text-ink-muted">{w.city}, {w.state} {w.zip} · Parcel {w.parcel_id}</div>
               </div>
               <div className="text-sm">
                 <div className="text-xs text-ink-muted">Taxes Owed</div>
                 <div className="font-600 text-navy">{w.taxes_owed !== null ? fmt(w.taxes_owed) : "—"}</div>
               </div>
               <div className="text-sm">
                 <div className="text-xs text-ink-muted">Interest Rate</div>
                 <div className="font-600 text-navy">{w.current_rate !== null ? `${w.current_rate.toFixed(2)}%` : w.starting_rate !== null ? `${w.starting_rate.toFixed(2)}%` : "—"}</div>
               </div>
               <Link to="/properties/$id" params={{ id: w.property_id }} className="rounded-md border border-hairline px-3 py-1.5 text-sm hover:border-navy hover:text-navy">View Details</Link>
               <button onClick={() => remove(w.id)} aria-label="Remove" className="text-ink-muted hover:text-destructive"><Trash2 className="size-4" /></button>
             </li>
           ))}
         </ul>
        }
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-muted">
        <span className="grid size-8 place-items-center rounded-lg bg-surface-alt">{icon}</span> {label}
      </div>
      <div className="mt-2 font-display text-2xl font-600 text-navy">{value}</div>
      <div className="text-xs text-ink-muted">{sub}</div>
    </div>
  );
}