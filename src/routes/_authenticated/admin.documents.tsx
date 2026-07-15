import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/documents")({
  component: DocumentsAdmin,
});

function DocumentsAdmin() {
  const qc = useQueryClient();
  const { data: props = [] } = useQuery({
    queryKey: ["admin", "properties-lite"],
    queryFn: async () => (await supabase.from("properties").select("id, address, city, state").order("address")).data ?? [],
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "documents"],
    queryFn: async () => (await supabase.from("documents").select("*, property:properties(address, city, state)").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  const [form, setForm] = useState({ property_id: "", name: "", kind: "report", url: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("documents").insert({ ...form });
    if (error) return toast.error(error.message);
    toast.success("Document added");
    setForm({ property_id: "", name: "", kind: "report", url: "" });
    qc.invalidateQueries({ queryKey: ["admin", "documents"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete document link?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "documents"] });
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">Documents</h2>
      <p className="mt-1 text-sm text-ink-muted">Link property reports, tax records, deeds, and inspection files.</p>
      <form onSubmit={add} className="mt-4 grid gap-3 rounded-xl border border-hairline bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <select required value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} className="input">
          <option value="">— Property —</option>
          {props.map((p) => <option key={p.id} value={p.id}>{p.address}, {p.city} {p.state}</option>)}
        </select>
        <input required placeholder="Document name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="input">
          {["report","tax_record","deed","inspection","photo","other"].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input required type="url" placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="input" />
        <div className="sm:col-span-2 lg:col-span-4"><button className="rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground">Add document</button></div>
      </form>
      <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface">
        {rows.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">No documents yet.</p> :
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Kind</th><th className="px-4 py-2">Property</th><th className="px-4 py-2">URL</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const p = d.property as { address?: string; city?: string; state?: string } | null;
              return (
                <tr key={d.id} className="border-b border-hairline/50 last:border-0">
                  <td className="px-4 py-2 font-500 text-navy">{d.name}</td>
                  <td className="px-4 py-2 text-xs">{d.kind}</td>
                  <td className="px-4 py-2 text-xs">{p ? `${p.address}, ${p.city} ${p.state}` : "—"}</td>
                  <td className="px-4 py-2 max-w-xs truncate text-xs"><a href={d.url} target="_blank" rel="noreferrer" className="text-navy underline">{d.url}</a></td>
                  <td className="px-4 py-2 text-right"><button onClick={() => remove(d.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="size-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>}
      </div>
      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%}`}</style>
    </div>
  );
}