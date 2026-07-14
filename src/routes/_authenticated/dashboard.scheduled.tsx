import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/scheduled")({
  component: Scheduled,
});

function Scheduled() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: auctions = [] } = useQuery({
    queryKey: ["upcoming-auctions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("auctions")
        .select("*, county:counties(name, state)")
        .in("status", ["scheduled", "live"])
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: regs = [] } = useQuery({
    queryKey: ["my-registrations", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("auction_registrations")
        .select("auction_id").eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const registered = new Set(regs.map(r => r.auction_id));

  async function toggle(auctionId: string) {
    if (registered.has(auctionId)) {
      const { error } = await supabase.from("auction_registrations").delete().eq("auction_id", auctionId).eq("user_id", user!.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("auction_registrations").insert({ auction_id: auctionId, user_id: user!.id });
      if (error) return toast.error(error.message);
      toast.success("Registered for auction");
    }
    qc.invalidateQueries({ queryKey: ["my-registrations"] });
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy">Scheduled Auctions</h1>
      <p className="mt-1 text-sm text-ink-muted">Register in advance to bid the moment they go live.</p>
      <div className="mt-6 grid gap-3">
        {auctions.length === 0 && <p className="rounded-xl border border-dashed border-hairline bg-surface p-8 text-center text-sm text-ink-muted">No upcoming auctions.</p>}
        {auctions.map((a) => {
          const county = a.county as { name?: string; state?: string } | null;
          return (
            <div key={a.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-hairline bg-surface p-4">
              <div className="min-w-0 flex-1">
                <Link to="/auctions/$id" params={{ id: a.id }} className="font-600 text-navy hover:underline">{a.title}</Link>
                <div className="text-xs text-ink-muted">{county?.name}, {county?.state} · {new Date(a.starts_at).toLocaleString()}</div>
              </div>
              <span className="rounded bg-navy/5 px-2 py-0.5 text-xs font-500 text-navy capitalize">{a.status}</span>
              <button onClick={()=>toggle(a.id)} className={`rounded-md px-3 py-1.5 text-xs font-600 ${registered.has(a.id) ? "border border-hairline bg-surface text-ink" : "bg-navy text-primary-foreground"}`}>
                {registered.has(a.id) ? "Unregister" : "Register"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
