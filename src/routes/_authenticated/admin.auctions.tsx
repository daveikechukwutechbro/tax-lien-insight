import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";
import { useState } from "react";
import { toast } from "sonner";
import type { AuctionStatus } from "@/integrations/firebase/types";

type Status = AuctionStatus;

export const Route = createFileRoute("/_authenticated/admin/auctions")({
  component: AuctionsAdmin,
});

function AuctionsAdmin() {
  const qc = useQueryClient();
  const { data: counties = [] } = useQuery({
    queryKey: ["admin", "counties"],
    queryFn: async () => (await supabase.from("counties").select("*")).data ?? [],
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "auctions"],
    queryFn: async () => (await supabase.from("auctions").select("*, county:counties(name)").order("starts_at", { ascending: false })).data ?? [],
  });

  const [title, setTitle] = useState(""), [county, setCounty] = useState("");
  const [starts, setStarts] = useState(""), [ends, setEnds] = useState("");
  const [status, setStatus] = useState<Status>("scheduled");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("auctions").insert({
      title, county_id: county || null, starts_at: starts, ends_at: ends, status,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setStarts(""); setEnds("");
    qc.invalidateQueries({ queryKey: ["admin", "auctions"] });
    toast.success("Auction added");
  }
  async function updateStatus(id: string, next: Status) {
    const { error } = await supabase.from("auctions").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "auctions"] });
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">Auctions</h2>
      <form onSubmit={add} className="mt-4 grid gap-3 rounded-xl border border-hairline bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        <select value={county} onChange={(e) => setCounty(e.target.value)} className="input">
          <option value="">— County —</option>
          {counties.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
        </select>
        <input required type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} className="input" />
        <input required type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className="input" />
        <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="input">
          {["draft","scheduled","live","closed","canceled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="sm:col-span-2 lg:col-span-5">
          <button className="rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground">Create auction</button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-2">Title</th><th className="px-4 py-2">County</th><th className="px-4 py-2">Starts</th><th className="px-4 py-2">Status</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-hairline/50 last:border-0">
                <td className="px-4 py-2 font-500 text-navy">{r.title}</td>
                <td className="px-4 py-2">{(r.county as { name?: string })?.name ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{new Date(r.starts_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value as Status)} className="input h-8">
                    {["draft","scheduled","live","closed","canceled"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%}`}</style>
    </div>
  );
}