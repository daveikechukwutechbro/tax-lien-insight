import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/funds")({
  component: AdminFunds,
});
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function AdminFunds() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "fund-requests", filter],
    queryFn: async () => {
      let q = supabase.from("fund_requests").select("*, user:profiles(full_name)").order("created_at", { ascending: false }).limit(200);
      if (filter === "pending") q = q.eq("status", "pending");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  async function act(id: string, approve: boolean) {
    const notes = window.prompt(approve ? "Optional admin notes" : "Reason for rejection") ?? "";
    const { error } = await supabase.rpc("approve_fund_request", {
      _id: id, _approve: approve, _admin_notes: notes || undefined,
    });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved" : "Rejected");
    qc.invalidateQueries({ queryKey: ["admin", "fund-requests"] });
  }

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-600 text-navy">Fund Requests</h2>
          <p className="mt-1 text-sm text-ink-muted">Review and approve deposits & withdrawals.</p>
        </div>
        <select value={filter} onChange={(e)=>setFilter(e.target.value as "pending"|"all")} className="h-9 rounded-md border border-hairline bg-surface px-2 text-sm">
          <option value="pending">Pending only</option>
          <option value="all">All</option>
        </select>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        {rows.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">Nothing to review.</p> :
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">User</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Method</th><th className="px-4 py-2">Ref</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const u = r.user as { full_name?: string } | null;
                return (
                  <tr key={r.id} className="border-b border-hairline/50 last:border-0">
                    <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">{u?.full_name ?? r.user_id.slice(0,8)}</td>
                    <td className="px-4 py-2 capitalize">{r.kind}</td>
                    <td className="px-4 py-2 font-600">{fmt(Number(r.amount))}</td>
                    <td className="px-4 py-2 text-xs">{r.method}</td>
                    <td className="px-4 py-2 text-xs">{r.reference ?? "—"}</td>
                    <td className="px-4 py-2 capitalize">{r.status}</td>
                    <td className="px-4 py-2 text-right">
                      {r.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={()=>act(r.id, true)} className="rounded-md bg-navy px-3 py-1 text-xs font-600 text-primary-foreground">Approve</button>
                          <button onClick={()=>act(r.id, false)} className="rounded-md border border-hairline bg-surface px-3 py-1 text-xs font-600 text-destructive">Reject</button>
                        </div>
                      ) : <span className="text-xs text-ink-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}