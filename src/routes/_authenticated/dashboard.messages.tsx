import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/dashboard/messages")({
  component: () => (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy capitalize">messages</h1>
      <p className="mt-2 text-sm text-ink-muted">This section is coming soon. The database and API are ready — the UI ships in the next wave.</p>
      <div className="mt-6 rounded-xl border border-dashed border-hairline bg-surface p-10 text-center text-sm text-ink-muted">
        No data to display yet.
      </div>
    </div>
  ),
});
