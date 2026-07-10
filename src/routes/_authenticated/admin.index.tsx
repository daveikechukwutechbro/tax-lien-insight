import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { data: counts } = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: async () => {
      const [c, p, a, l, b, u] = await Promise.all([
        supabase.from("counties").select("*", { count: "exact", head: true }),
        supabase.from("properties").select("*", { count: "exact", head: true }),
        supabase.from("auctions").select("*", { count: "exact", head: true }),
        supabase.from("liens").select("*", { count: "exact", head: true }),
        supabase.from("bids").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);
      return {
        counties: c.count ?? 0, properties: p.count ?? 0, auctions: a.count ?? 0,
        liens: l.count ?? 0, bids: b.count ?? 0, users: u.count ?? 0,
      };
    },
  });

  const stats: [string, number, string][] = [
    ["Counties", counts?.counties ?? 0, "/admin/counties"],
    ["Properties", counts?.properties ?? 0, "/admin/properties"],
    ["Auctions", counts?.auctions ?? 0, "/admin/auctions"],
    ["Liens", counts?.liens ?? 0, "/admin/liens"],
    ["Total Bids", counts?.bids ?? 0, "/admin"],
    ["Registered Users", counts?.users ?? 0, "/admin"],
  ];

  return (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">Overview</h2>
      <p className="mt-1 text-sm text-ink-muted">System snapshot and quick links.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(([label, val, href]) => (
          <Link key={label} to={href} className="rounded-xl border border-hairline bg-surface p-5 hover:border-navy">
            <div className="text-xs uppercase tracking-wider text-ink-muted">{label}</div>
            <div className="mt-2 font-display text-3xl font-600 text-navy">{val}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}