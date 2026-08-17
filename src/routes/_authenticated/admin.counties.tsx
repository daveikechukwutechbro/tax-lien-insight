import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/counties")({
  component: CountiesAdmin,
});

function CountiesAdmin() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "counties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("counties").select("*").order("state").order("name");
      if (error) throw error;
      return data;
    },
  });
  const [name, setName] = useState("");
  const [state, setState] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("counties").insert({ name, state: state.toUpperCase() });
    if (error) return toast.error(error.message);
    setName(""); setState("");
    qc.invalidateQueries({ queryKey: ["admin", "counties"] });
    toast.success("County added");
  }
  async function remove(id: string) {
    if (!confirm("Delete this county?")) return;
    const { error } = await supabase.from("counties").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "counties"] });
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">Counties</h2>
      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-hairline bg-surface p-4">
        <label className="flex flex-col text-xs"><span className="mb-1 text-ink-muted">County name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-md border border-hairline px-2 text-sm" /></label>
        <label className="flex flex-col text-xs"><span className="mb-1 text-ink-muted">State (2)</span>
          <input required maxLength={2} value={state} onChange={(e) => setState(e.target.value)} className="h-9 w-24 rounded-md border border-hairline px-2 text-sm uppercase" /></label>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-navy px-4 text-sm font-600 text-primary-foreground"><Plus className="size-4" /> Add</button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">State</th><th className="px-4 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-hairline/50 last:border-0">
                <td className="px-4 py-2 font-500 text-navy">{r.name}</td>
                <td className="px-4 py-2">{r.state}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => remove(r.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="size-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}