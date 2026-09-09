import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { getUpcomingAuctions, registerForAuction } from "@/lib/backend";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/scheduled")({
  component: Scheduled,
});

function Scheduled() {
  const { user } = useSession();
  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ["upcoming-auctions"],
    enabled: !!user?.id,
    queryFn: getUpcomingAuctions,
  });
  const [registered, setRegistered] = useState<Set<string>>(new Set());

  async function reg(auctionId: string) {
    try {
      await registerForAuction(auctionId);
      setRegistered((s) => new Set(s).add(auctionId));
      toast.success("Registered for auction");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
    }
  }

  const sorted = useMemo(
    () => [...auctions].sort((a, b) => new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime()),
    [auctions],
  );

  return (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy">Scheduled Auctions</h1>
      <p className="mt-1 text-sm text-ink-muted">Register in advance to bid the moment they go live.</p>
      <div className="mt-6 grid gap-3">
        {isLoading ? (
          <p className="rounded-xl border border-hairline bg-surface p-8 text-center text-sm text-ink-muted">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="rounded-xl border border-dashed border-hairline bg-surface p-8 text-center text-sm text-ink-muted">No upcoming auctions.</p>
        ) : (
          sorted.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-hairline bg-surface p-4">
              <div className="min-w-0 flex-1">
                <Link to="/auctions/$id" params={{ id: a.id }} className="font-600 text-navy hover:underline">{a.title}</Link>
                <div className="text-xs text-ink-muted">
                  {a.state ? `${a.state} · ` : ""}{a.starts_at ? new Date(a.starts_at).toLocaleString() : "Schedule pending"}
                </div>
              </div>
              <span className="rounded bg-navy/5 px-2 py-0.5 text-xs font-500 capitalize text-navy">{a.status.replace("_", " ")}</span>
              <button
                onClick={() => reg(a.id)}
                disabled={registered.has(a.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-600 ${registered.has(a.id) ? "border border-hairline bg-surface text-ink" : "bg-navy text-primary-foreground"}`}
              >
                {registered.has(a.id) ? "Registered" : "Register"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}