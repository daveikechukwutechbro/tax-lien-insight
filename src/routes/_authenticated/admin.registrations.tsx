import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/registrations")({
  component: RegistrationsAdmin,
});

function RegistrationsAdmin() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auction_registrations")
        .select("id, created_at, user_id, auction:auctions(title, starts_at, status), user:profiles(full_name, verified)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function remove(id: string) {
    if (!confirm("Remove this registration?")) return;
    const { error } = await supabase.rpc("admin_delete_registration", { _id: id });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "registrations"] });
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">Auction Registrations</h2>
      <p className="mt-1 text-sm text-ink-muted">Users enrolled to bid in upcoming auctions.</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface">
        {rows.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No registrations yet.</p> :
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-2">Registered</th><th className="px-4 py-2">User</th><th className="px-4 py-2">Auction</th><th className="px-4 py-2">Starts</th><th className="px-4 py-2 text-right"></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const u = r.user as { full_name?: string; verified?: boolean } | null;
              const a = r.auction as { title?: string; starts_at?: string; status?: string } | null;
              return (
                <tr key={r.id} className="border-b border-hairline/50 last:border-0">
                  <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{u?.full_name ?? r.user_id.slice(0,8)} {u?.verified && <span className="ml-1 rounded bg-success-soft px-1.5 text-[10px] font-600 text-success">verified</span>}</td>
                  <td className="px-4 py-2">{a?.title ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{a?.starts_at ? new Date(a.starts_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-2 text-right"><button onClick={() => remove(r.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="size-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>}
      </div>
    </div>
  );
}