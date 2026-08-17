import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";
import { useSession } from "@/hooks/use-session";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/searches")({
  component: Searches,
});

function Searches() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["saved-searches", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_searches").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [county, setCounty] = useState("");
  const [type, setType] = useState("");
  const [notify, setNotify] = useState(true);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user!.id, name, notify,
      query: { q: q || undefined, county: county || undefined, type: type || undefined },
    });
    if (error) return toast.error(error.message);
    setName(""); setQ(""); setCounty(""); setType("");
    qc.invalidateQueries({ queryKey: ["saved-searches"] });
    toast.success("Search saved");
  }
  async function remove(id: string) {
    await supabase.from("saved_searches").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["saved-searches"] });
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy">Saved Searches</h1>
      <p className="mt-1 text-sm text-ink-muted">Save filter presets and get alerts when matching properties list.</p>
      <form onSubmit={save} className="mt-6 grid gap-3 rounded-xl border border-hairline bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input required placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} className="input" />
        <input placeholder="Keyword" value={q} onChange={(e)=>setQ(e.target.value)} className="input" />
        <input placeholder="County" value={county} onChange={(e)=>setCounty(e.target.value)} className="input" />
        <input placeholder="Property type" value={type} onChange={(e)=>setType(e.target.value)} className="input" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notify} onChange={(e)=>setNotify(e.target.checked)} /> Notify me</label>
        <div className="sm:col-span-2 lg:col-span-5"><button className="rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground">Save search</button></div>
      </form>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-hairline bg-surface p-8 text-center text-sm text-ink-muted">No saved searches yet.</p>}
        {rows.map((r) => {
          const query = (r.query ?? {}) as Record<string, string | undefined>;
          return (
            <div key={r.id} className="rounded-xl border border-hairline bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-600 text-navy">{r.name}</div>
                  <div className="mt-1 text-xs text-ink-muted">
                    {Object.entries(query).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join(" · ") || "No filters"}
                  </div>
                </div>
                <button onClick={()=>remove(r.id)} className="text-xs text-destructive hover:underline">Delete</button>
              </div>
              <Link to="/search" search={query as never} className="mt-3 inline-block text-xs font-600 text-navy underline">Run search →</Link>
            </div>
          );
        })}
      </div>
      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%}`}</style>
    </div>
  );
}
