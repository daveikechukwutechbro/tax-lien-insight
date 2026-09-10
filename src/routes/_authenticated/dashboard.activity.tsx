import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { activityQuery } from "@/lib/queries/dashboard";
import { ActivityRow } from "@/components/dashboard/activity-feed";

export const Route = createFileRoute("/_authenticated/dashboard/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const { user } = useSession();
  const { data: items = [] } = useQuery(activityQuery(user?.id));

  return (
    <div>
      <div>
        <h1 className="font-display text-3xl font-600 text-navy">My Activity</h1>
        <p className="mt-1 text-sm text-ink-muted">Everything you've done — bids, watches, deposits, and more.</p>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            No activity yet. Watch a property on the auction calendar or place your first bid.
          </p>
        ) : (
          <ul className="divide-y divide-hairline px-5 py-4">
            {items.map((a) => (
              <ActivityRow key={a.id} item={a} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}