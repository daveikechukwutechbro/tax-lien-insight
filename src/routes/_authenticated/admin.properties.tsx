import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/properties")({
  component: PropertiesAdmin,
});

type FormState = {
  county_id: string; parcel_id: string; address: string; city: string; state: string; zip: string;
  property_type: "residential" | "land" | "commercial"; description: string; image_url: string;
  year_built: string; living_area_sqft: string; lot_size_acres: string; bedrooms: string; bathrooms: string;
  use_type: string; assessed_value: string; owner_name: string; owner_mailing_address: string;
};
const empty: FormState = {
  county_id: "", parcel_id: "", address: "", city: "", state: "", zip: "",
  property_type: "residential", description: "", image_url: "",
  year_built: "", living_area_sqft: "", lot_size_acres: "", bedrooms: "", bathrooms: "",
  use_type: "", assessed_value: "", owner_name: "", owner_mailing_address: "",
};

function PropertiesAdmin() {
  const qc = useQueryClient();
  const { data: counties = [] } = useQuery({
    queryKey: ["admin", "counties"],
    queryFn: async () => (await supabase.from("counties").select("*").order("name")).data ?? [],
  });
  const { data: props = [] } = useQuery({
    queryKey: ["admin", "properties"],
    queryFn: async () => (await supabase.from("properties").select("id, parcel_id, address, city, state, property_type, county:counties(name)").order("created_at", { ascending: false })).data ?? [],
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      year_built: form.year_built ? Number(form.year_built) : null,
      living_area_sqft: form.living_area_sqft ? Number(form.living_area_sqft) : null,
      lot_size_acres: form.lot_size_acres ? Number(form.lot_size_acres) : null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      assessed_value: form.assessed_value ? Number(form.assessed_value) : null,
      description: form.description || null,
      image_url: form.image_url || null,
      use_type: form.use_type || null,
      owner_name: form.owner_name || null,
      owner_mailing_address: form.owner_mailing_address || null,
    };
    const { error } = await supabase.from("properties").insert(payload);
    if (error) return toast.error(error.message);
    setForm(empty); setShowForm(false);
    qc.invalidateQueries({ queryKey: ["admin", "properties"] });
    toast.success("Property added");
  }

  async function remove(id: string) {
    if (!confirm("Delete property and all associated liens/bids?")) return;
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "properties"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-600 text-navy">Properties</h2>
        <button onClick={() => setShowForm((s) => !s)} className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-600 text-primary-foreground">
          <Plus className="size-4" /> {showForm ? "Cancel" : "New Property"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-hairline bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
          <F label="County"><select required value={form.county_id} onChange={(e) => set("county_id", e.target.value)} className="input">
            <option value="">Select…</option>
            {counties.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
          </select></F>
          <F label="Parcel ID"><input required value={form.parcel_id} onChange={(e) => set("parcel_id", e.target.value)} className="input" /></F>
          <F label="Type"><select value={form.property_type} onChange={(e) => set("property_type", e.target.value as FormState["property_type"])} className="input">
            <option value="residential">Residential</option><option value="land">Land</option><option value="commercial">Commercial</option>
          </select></F>
          <F label="Address"><input required value={form.address} onChange={(e) => set("address", e.target.value)} className="input" /></F>
          <F label="City"><input required value={form.city} onChange={(e) => set("city", e.target.value)} className="input" /></F>
          <F label="State"><input required maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} className="input" /></F>
          <F label="Zip"><input required value={form.zip} onChange={(e) => set("zip", e.target.value)} className="input" /></F>
          <F label="Year built"><input type="number" value={form.year_built} onChange={(e) => set("year_built", e.target.value)} className="input" /></F>
          <F label="Sq Ft"><input type="number" value={form.living_area_sqft} onChange={(e) => set("living_area_sqft", e.target.value)} className="input" /></F>
          <F label="Lot (acres)"><input type="number" step="0.01" value={form.lot_size_acres} onChange={(e) => set("lot_size_acres", e.target.value)} className="input" /></F>
          <F label="Bedrooms"><input type="number" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} className="input" /></F>
          <F label="Bathrooms"><input type="number" step="0.5" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} className="input" /></F>
          <F label="Use type"><input value={form.use_type} onChange={(e) => set("use_type", e.target.value)} className="input" /></F>
          <F label="Assessed value"><input type="number" value={form.assessed_value} onChange={(e) => set("assessed_value", e.target.value)} className="input" /></F>
          <F label="Image URL"><input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} className="input" /></F>
          <F label="Owner name"><input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} className="input" /></F>
          <F label="Owner address"><input value={form.owner_mailing_address} onChange={(e) => set("owner_mailing_address", e.target.value)} className="input" /></F>
          <F label="Description" wide><textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="input min-h-[70px]" /></F>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className="rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground">Save property</button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-hairline bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-2">Address</th><th className="px-4 py-2">County</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Parcel</th><th className="px-4 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {props.map((p) => (
              <tr key={p.id} className="border-b border-hairline/50 last:border-0">
                <td className="px-4 py-2 font-500 text-navy">{p.address}</td>
                <td className="px-4 py-2">{(p.county as { name?: string })?.name}</td>
                <td className="px-4 py-2 capitalize">{p.property_type}</td>
                <td className="px-4 py-2 font-mono text-xs">{p.parcel_id}</td>
                <td className="px-4 py-2 text-right">
                  <Link to="/properties/$id" params={{ id: p.id }} className="mr-2 text-navy hover:underline"><Pencil className="inline size-4" /></Link>
                  <button onClick={() => remove(p.id)} className="text-destructive"><Trash2 className="inline size-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%}.input:focus{outline:none;border-color:var(--navy)}`}</style>
    </div>
  );
}
function F({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="mb-1 block text-xs font-500 uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}