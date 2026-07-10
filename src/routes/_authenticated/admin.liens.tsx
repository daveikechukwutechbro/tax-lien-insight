import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/admin/liens")({
  component: () => (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">Liens</h2>
      <p className="mt-2 text-sm text-ink-muted">Lien CRUD arrives in the next admin wave. Liens are auto-created when you add a property to an auction via the Property + Auction admin pages.</p>
    </div>
  ),
});