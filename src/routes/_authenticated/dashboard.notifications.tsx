import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  component: () => (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy capitalize">notifications</h1>
      <p className="mt-2 text-sm text-ink-muted">This section is coming soon. Backend is ready; UI ships in the next wave.</p>
      <div className="mt-6 rounded-xl border border-dashed border-hairline bg-surface p-10 text-center text-sm text-ink-muted">No data yet.</div>
    </div>
  ),
});
