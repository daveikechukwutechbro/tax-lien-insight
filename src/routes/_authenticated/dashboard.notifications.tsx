import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  component: Notifications,
});

function Notifications() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications")
        .select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function markAll() {
    const ids = rows.filter(r => !r.read_at).map(r => r.id);
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  async function markOne(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  const unread = rows.filter(r => !r.read_at).length;
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-600 text-navy">Notifications</h1>
          <p className="mt-1 text-sm text-ink-muted">{unread} unread</p>
        </div>
        {unread > 0 && <button onClick={markAll} className="rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs font-600 text-navy hover:bg-surface-alt">Mark all read</button>}
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        {rows.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No notifications yet.</p> :
          <ul className="divide-y divide-hairline">
            {rows.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 p-4 ${n.read_at ? "" : "bg-navy/[0.02]"}`}>
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-gold"}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-600 text-navy">{n.title}</div>
                  <p className="mt-0.5 text-sm text-ink">{n.body}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-ink-muted">
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                    {n.link && <Link to={n.link} className="text-navy underline">View</Link>}
                    {!n.read_at && <button onClick={() => markOne(n.id)} className="text-navy underline">Mark read</button>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        }
      </div>
    </div>
  );
}
