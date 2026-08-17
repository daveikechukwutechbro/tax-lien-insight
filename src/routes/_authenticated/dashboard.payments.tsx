import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/dashboard/payments")({
  component: Payments,
});
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function Payments() {
  const { user } = useSession();
  const { data: rows = [] } = useQuery({
    queryKey: ["payments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("fund_requests")
        .select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy">Payments & Invoices</h1>
      <p className="mt-1 text-sm text-ink-muted">All money movement on your account.</p>
      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-hairline bg-surface p-8 text-center text-sm text-ink-muted">
          No transactions yet.
        </p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="mt-6 space-y-3 sm:hidden">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-hairline bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-600 text-navy">
                      #{r.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {new Date(r.created_at).toLocaleDateString()} · {r.method}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-600 text-navy">{fmt(Number(r.amount))}</div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-500 capitalize ${
                        r.status === "completed"
                          ? "bg-success-soft text-success"
                          : r.status === "failed"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-gold/20 text-navy"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 capitalize text-xs text-ink-muted">
                  {r.kind}
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="mt-6 hidden sm:block">
            <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-hairline bg-surface-alt text-left text-xs font-600 uppercase tracking-wider text-ink-muted">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Reference</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Method</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-hairline/50 last:border-0">
                        <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2 font-mono text-xs">{r.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-2 capitalize">{r.kind}</td>
                        <td className="px-4 py-2 text-xs">{r.method}</td>
                        <td className="px-4 py-2 font-600">{fmt(Number(r.amount))}</td>
                        <td className="px-4 py-2 capitalize">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
