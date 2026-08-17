import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditAdmin,
});

function AuditAdmin() {
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: async () => (await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  return (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">Audit Log</h2>
      <p className="mt-1 text-sm text-ink-muted">Every privileged action is recorded here.</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface">
        {rows.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No entries.</p> :
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Actor</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Target</th><th className="px-4 py-2">Meta</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-hairline/50 last:border-0 align-top">
                <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-xs">{r.actor_user_id?.slice(0,8) ?? "system"}</td>
                <td className="px-4 py-2 font-500 text-navy">{r.action}</td>
                <td className="px-4 py-2 text-xs">{r.target_table ?? "—"} {r.target_id ? `· ${r.target_id.slice(0,8)}` : ""}</td>
                <td className="px-4 py-2 text-xs"><pre className="whitespace-pre-wrap break-all text-[11px] text-ink-muted">{r.meta ? JSON.stringify(r.meta) : ""}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
    </div>
  );
}