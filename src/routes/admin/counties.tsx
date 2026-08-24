import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/counties")({
  component: CountiesAdmin,
});

function CountiesAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [state, setState] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "counties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counties")
        .select("*")
        .order("state")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("counties").insert({ name, state: state.toUpperCase() });
    if (error) return toast.error(error.message);
    setName("");
    setState("");
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
      <form
        onSubmit={add}
        className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-hairline bg-surface p-4"
      >
        <label className="flex flex-col text-xs text-ink-muted">
          State
          <input
            className="mt-1 w-32 rounded-md border border-hairline bg-background px-3 py-1.5 text-sm"
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-xs text-ink-muted">
          County / County-Equivalent
          <input
            className="ml-2 w-40 rounded-md border border-hairline bg-background px-3 py-1.5 text-sm"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-navy px-4 py-1.5 text-sm font-500 text-white hover:bg-navy/90"
        >
          Add
        </button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-xl border border-hairline bg-surface">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">No counties configured.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">State</th>
                <th className="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c: { id: string; name: string; state: string }) => (
                <tr key={c.id} className="border-b border-hairline/50 last:border-0">
                  <td className="px-4 py-2 font-500 text-navy">{c.name}</td>
                  <td className="px-4 py-2">{c.state}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => remove(c.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="size-4" />
                    </button>
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
