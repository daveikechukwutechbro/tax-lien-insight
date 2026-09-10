import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/backend";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import { timeAgo } from "@/components/dashboard/activity-feed";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  component: Notifications,
});

function Notifications() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: rows = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: getNotifications,
    refetchInterval: 15_000,
  });

  const unread = rows.filter((r) => !r.read_at).length;

  async function markAllRead() {
    if (!user || busy) return;
    setBusy(true);
    try {
      await markAllNotificationsRead();
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error((err as Error).message ?? "Could not update notifications");
    } finally {
      setBusy(false);
    }
  }

  async function markRead(id: string) {
    await markNotificationRead(id).catch(() => {});
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-600 text-navy">Notifications</h1>
          <p className="mt-1 text-sm text-ink-muted">{unread} unread</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs font-500 text-navy hover:bg-surface-alt disabled:opacity-60">
            <CheckCheck className="size-3.5" /> Mark all as read
          </button>
        )}
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        {rows.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No notifications yet. Watching a property, placing a bid, or funding your account creates one.</p> :
          <ul className="divide-y divide-hairline">
            {rows.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 p-4 ${n.read_at ? "" : "bg-navy/[0.02]"}`}>
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-gold"}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-600 text-navy">{n.title}</div>
                  {n.body && <p className="mt-0.5 text-sm text-ink">{n.body}</p>}
                  <div className="mt-1 flex items-center gap-3 text-xs text-ink-muted">
                    <span>{new Date(n.created_at).toLocaleString()} ({timeAgo(n.created_at)})</span>
                    {!n.read_at && (
                      <button onClick={() => markRead(n.id)} className="text-navy underline hover:text-navy/70">Mark read</button>
                    )}
                  </div>
                </div>
                {n.link && (
                  <a href={n.link} className="shrink-0 rounded-md border border-hairline px-2.5 py-1 text-xs font-500 text-navy hover:bg-surface-alt">View</a>
                )}
              </li>
            ))}
          </ul>
        }
      </div>
    </div>
  );
}