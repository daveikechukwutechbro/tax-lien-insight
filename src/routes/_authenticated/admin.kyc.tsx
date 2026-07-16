import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/kyc")({
  component: KycAdmin,
});

function KycAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "kyc", filter],
    queryFn: async () => {
      let q = supabase.from("kyc_submissions").select("*, profile:profiles(full_name)").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      return (await q).data ?? [];
    },
  });

  async function review(id: string, approve: boolean) {
    const notes = approve ? undefined : (prompt("Reason for rejection (optional)") ?? undefined);
    const { error } = await supabase.rpc("review_kyc", { _id: id, _approve: approve, _notes: notes });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved" : "Rejected");
    qc.invalidateQueries({ queryKey: ["admin", "kyc"] });
  }

  async function viewDoc(path: string | null) {
    if (!path) return toast.error("No document uploaded");
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">KYC Submissions</h2>
      <div className="mt-3 flex gap-2 text-sm">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-md border px-3 py-1 capitalize ${filter === f ? "border-navy bg-navy text-primary-foreground" : "border-hairline bg-surface text-ink"}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-hairline bg-surface">
        {rows.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No submissions.</p> : (
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="px-4 py-2">Submitted</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">DOB</th><th className="px-4 py-2">Address</th><th className="px-4 py-2">SSN</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-hairline/50 align-top last:border-0">
                  <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 font-500 text-navy">{r.legal_name}<div className="text-xs text-ink-muted">{(r.profile as { full_name?: string } | null)?.full_name ?? ""}</div></td>
                  <td className="px-4 py-2 text-xs">{r.date_of_birth}</td>
                  <td className="px-4 py-2 text-xs">{r.address_line1}{r.address_line2 ? `, ${r.address_line2}` : ""}<div>{r.city}, {r.state} {r.postal_code}</div></td>
                  <td className="px-4 py-2 text-xs font-mono">•••-••-{r.tax_id_last4}</td>
                  <td className="px-4 py-2 capitalize">{r.status}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {r.id_document_path && <button onClick={() => viewDoc(r.id_document_path)} className="rounded-md border border-hairline px-2 py-1 text-xs">View ID</button>}
                      {r.status === "pending" && <>
                        <button onClick={() => review(r.id, true)} className="rounded-md bg-success px-2 py-1 text-xs font-600 text-white">Approve</button>
                        <button onClick={() => review(r.id, false)} className="rounded-md bg-destructive px-2 py-1 text-xs font-600 text-white">Reject</button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}