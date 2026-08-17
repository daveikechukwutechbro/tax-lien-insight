import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";
import { useState } from "react";
import { toast } from "sonner";
import type { LienStatus } from "@/integrations/firebase/types";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/liens")({
  component: LiensAdmin,
});

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function LiensAdmin() {
  const qc = useQueryClient();
  const { data: props = [] } = useQuery({
    queryKey: ["admin", "properties-lite"],
    queryFn: async () =>
      (await supabase.from("properties").select("id, address, city, state, parcel_id").order("address")).data ?? [],
  });
  const { data: auctions = [] } = useQuery({
    queryKey: ["admin", "auctions-lite"],
    queryFn: async () =>
      (await supabase.from("auctions").select("id, title, status").order("starts_at", { ascending: false })).data ?? [],
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "liens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liens")
        .select("*, property:properties(address, city, state, parcel_id), auction:auctions(title, status)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    property_id: "", auction_id: "", tax_year: new Date().getFullYear() - 1,
    taxes_owed: "", min_bid: "", starting_rate: "18", bid_decrement: "0.25", redemption_period_months: "24",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("liens").insert({
      property_id: form.property_id, auction_id: form.auction_id,
      tax_year: Number(form.tax_year), taxes_owed: Number(form.taxes_owed),
      min_bid: Number(form.min_bid || form.taxes_owed),
      starting_rate: Number(form.starting_rate), bid_decrement: Number(form.bid_decrement),
      redemption_period_months: Number(form.redemption_period_months),
    });
    if (error) return toast.error(error.message);
    toast.success("Lien created");
    setForm({ ...form, property_id: "", auction_id: "", taxes_owed: "", min_bid: "" });
    qc.invalidateQueries({ queryKey: ["admin", "liens"] });
  }
  async function updateStatus(id: string, status: LienStatus) {
    const { error } = await supabase.from("liens").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "liens"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete this lien?")) return;
    const { error } = await supabase.from("liens").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "liens"] });
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-600 text-navy">Liens</h2>
      <p className="mt-1 text-sm text-ink-muted">Attach tax liens to properties and enroll them in an auction.</p>
      <form onSubmit={add} className="mt-4 grid gap-3 rounded-xl border border-hairline bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <select required value={form.property_id} onChange={(e) => set("property_id", e.target.value)} className="input">
          <option value="">— Property —</option>
          {props.map((p) => <option key={p.id} value={p.id}>{p.address}, {p.city} {p.state}</option>)}
        </select>
        <select required value={form.auction_id} onChange={(e) => set("auction_id", e.target.value)} className="input">
          <option value="">— Auction —</option>
          {auctions.map((a) => <option key={a.id} value={a.id}>{a.title} ({a.status})</option>)}
        </select>
        <input required type="number" placeholder="Tax year" value={form.tax_year} onChange={(e) => set("tax_year", Number(e.target.value))} className="input" />
        <input required type="number" step="0.01" placeholder="Taxes owed" value={form.taxes_owed} onChange={(e) => set("taxes_owed", e.target.value)} className="input" />
        <input type="number" step="0.01" placeholder="Min bid" value={form.min_bid} onChange={(e) => set("min_bid", e.target.value)} className="input" />
        <input type="number" step="0.01" placeholder="Starting rate %" value={form.starting_rate} onChange={(e) => set("starting_rate", e.target.value)} className="input" />
        <input type="number" step="0.01" placeholder="Bid decrement %" value={form.bid_decrement} onChange={(e) => set("bid_decrement", e.target.value)} className="input" />
        <input type="number" placeholder="Redemption months" value={form.redemption_period_months} onChange={(e) => set("redemption_period_months", e.target.value)} className="input" />
        <div className="sm:col-span-2 lg:col-span-4">
          <button className="rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground">Create lien</button>
        </div>
      </form>
      <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-2">Property</th><th className="px-4 py-2">Auction</th><th className="px-4 py-2">Year</th><th className="px-4 py-2">Owed</th><th className="px-4 py-2">Rate</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = r.property as { address?: string; city?: string; state?: string } | null;
              const a = r.auction as { title?: string } | null;
              return (
                <tr key={r.id} className="border-b border-hairline/50 last:border-0">
                  <td className="px-4 py-2 font-500 text-navy">{p?.address}<div className="text-xs text-ink-muted">{p?.city}, {p?.state}</div></td>
                  <td className="px-4 py-2 text-xs">{a?.title ?? "—"}</td>
                  <td className="px-4 py-2">{r.tax_year}</td>
                  <td className="px-4 py-2 font-600">{fmt(Number(r.taxes_owed))}</td>
                  <td className="px-4 py-2 text-xs">{r.current_rate ?? r.starting_rate}%</td>
                  <td className="px-4 py-2">
                    <select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value as LienStatus)} className="input h-8">
                      {["active","redeemed","canceled","expired"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right"><button onClick={() => remove(r.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="size-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%}`}</style>
    </div>
  );
}