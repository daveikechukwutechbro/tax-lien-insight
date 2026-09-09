import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { getNotifications } from "@/lib/backend";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  component: Notifications,
});

function Notifications() {
  const { user } = useSession();
  const { data: rows = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: getNotifications,
  });

  const unread = rows.filter((r) => !r.read_at).length;
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-600 text-navy">Notifications</h1>
          <p className="mt-1 text-sm text-ink-muted">{unread} unread</p>
        </div>
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
