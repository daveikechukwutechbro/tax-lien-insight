import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import {
  getAdminProperties,
  getCounties,
  createAdminProperty,
  updateAdminProperty,
  deleteAdminProperty,
  type RawProperty,
  type PropertyInput,
} from "@/lib/backend";
import { invalidatePublicData } from "@/lib/queries/invalidate";
import { fileToDataUrl } from "@/lib/image-upload";

export const Route = createFileRoute("/admin/properties")({
  component: PropertiesAdmin,
});

type FormState = {
  jurisdictionId: string;
  parcelId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: "residential" | "land" | "commercial";
  assessed_value: string;
  description: string;
  imageData: string | null;
  editingId: string | null;
};

const empty: FormState = {
  jurisdictionId: "",
  parcelId: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  property_type: "residential",
  assessed_value: "",
  description: "",
  imageData: null,
  editingId: null,
};

function imgSrc(p: RawProperty): string | null {
  return p.imageUrl ?? null;
}

function PropertiesAdmin() {
  const qc = useQueryClient();
  const { data: counties = [] } = useQuery({
    queryKey: ["admin", "counties"],
    queryFn: getCounties,
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "properties"],
    queryFn: getAdminProperties,
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: PropertyInput = {
      jurisdictionId: form.jurisdictionId || undefined,
      parcelId: form.parcelId || undefined,
      address: form.address,
      city: form.city || undefined,
      state: form.state || undefined,
      postalCode: form.zip || undefined,
      propertyType: form.property_type,
      assessedValue: form.assessed_value ? Number(form.assessed_value) : undefined,
      legalDescription: form.description || undefined,
      imageData: form.imageData,
    };
    try {
      if (form.editingId) {
        await updateAdminProperty(form.editingId, payload);
        toast.success("Property updated");
      } else {
        await createAdminProperty(payload);
        toast.success("Property added");
      }
      setForm(empty);
      setShowForm(false);
      await qc.invalidateQueries({ queryKey: ["admin", "properties"] });
      invalidatePublicData(qc);
    } catch (err) {
      toast.error((err as Error).message ?? "Could not save property");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this property? Any liens attached to it will fail to delete — remove them first.")) return;
    try {
      await deleteAdminProperty(id);
      toast.success("Property deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "properties"] });
      invalidatePublicData(qc);
    } catch (err) {
      toast.error((err as Error).message ?? "Could not delete property");
    }
  }

  function startEdit(p: RawProperty) {
    setForm({
      jurisdictionId: p.jurisdictionId ?? "",
      parcelId: p.parcelId ?? "",
      address: p.address,
      city: p.city ?? "",
      state: p.state ?? "",
      zip: p.postalCode ?? "",
      property_type: ((p.propertyType === "land" || p.propertyType === "commercial")
        ? p.propertyType
        : "residential") as FormState["property_type"],
      assessed_value: p.assessedValue != null ? String(p.assessedValue) : "",
      description: "",
      imageData: imgSrc(p),
      editingId: p.id,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      set("imageData", dataUrl);
    } catch (err) {
      toast.error((err as Error).message ?? "Could not read image");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-600 text-navy">Properties</h2>
        <button
          onClick={() => {
            setShowForm((s) => !s);
            if (showForm) setForm(empty);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-600 text-primary-foreground"
        >
          <Plus className="size-4" /> {showForm ? "Cancel" : "New Property"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="mt-4 grid gap-3 rounded-xl border border-hairline bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <F label="County">
            <select
              required
              value={form.jurisdictionId}
              onChange={(e) => set("jurisdictionId", e.target.value)}
              className="input"
            >
              <option value="">Select…</option>
              {counties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.stateCode ?? ""}
                </option>
              ))}
            </select>
          </F>
          <F label="Parcel ID">
            <input
              required
              value={form.parcelId}
              onChange={(e) => set("parcelId", e.target.value)}
              className="input"
            />
          </F>
          <F label="Type">
            <select
              value={form.property_type}
              onChange={(e) => set("property_type", e.target.value as FormState["property_type"])}
              className="input"
            >
              <option value="residential">Residential</option>
              <option value="land">Land</option>
              <option value="commercial">Commercial</option>
            </select>
          </F>
          <F label="Address">
            <input
              required
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="input"
            />
          </F>
          <F label="City">
            <input
              required
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className="input"
            />
          </F>
          <F label="State">
            <input
              required
              maxLength={2}
              value={form.state}
              onChange={(e) => set("state", e.target.value.toUpperCase())}
              className="input"
            />
          </F>
          <F label="Zip">
            <input
              required
              value={form.zip}
              onChange={(e) => set("zip", e.target.value)}
              className="input"
            />
          </F>
          <F label="Assessed value ($)">
            <input
              type="number"
              min="0"
              value={form.assessed_value}
              onChange={(e) => set("assessed_value", e.target.value)}
              className="input"
            />
          </F>
          <F label="Photo (PNG/JPG)">
            <div className="flex items-center gap-2">
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-hairline bg-surface-alt px-3 py-1.5 text-xs font-500 text-navy hover:bg-surface-alt/70">
                Upload
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onImageFile} />
              </label>
              {form.imageData && (
                <>
                  <img
                    src={form.imageData}
                    alt=""
                    className="size-9 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => set("imageData", "")
                    }
                    className="p-1 text-ink-muted hover:text-destructive"
                    aria-label="Remove photo"
                  >
                    <X className="size-4" />
                  </button>
                </>
              )}
            </div>
          </F>
          <F label="Description" wide>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="input min-h-[70px]"
            />
          </F>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground"
            >
              {form.editingId ? "Save changes" : "Save property"}
            </button>
            {form.editingId && (
              <button
                type="button"
                onClick={() => {
                  setForm(empty);
                  setShowForm(false);
                }}
                className="ml-3 rounded-md border border-hairline px-5 py-2 text-sm font-500 text-ink"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-2">Property</th>
              <th className="px-4 py-2">County</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Parcel</th>
              <th className="px-4 py-2">Lien</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-hairline/50 last:border-0">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    {imgSrc(p) ? (
                      <img src={imgSrc(p)!} alt="" className="size-10 rounded-md object-cover" />
                    ) : (
                      <div className="size-10 rounded-md bg-surface-alt" />
                    )}
                    <div className="min-w-0">
                      <div className="font-500 text-navy">{p.address}</div>
                      <div className="text-xs text-ink-muted">
                        {p.city}, {p.state} {p.postalCode}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2">{p.countyName ?? "—"}</td>
                <td className="px-4 py-2 capitalize">{p.propertyType ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{p.parcelId ?? "—"}</td>
                <td className="px-4 py-2">
                  {p.lotStatus ? (
                    <span className="rounded bg-navy/5 px-2 py-0.5 text-xs capitalize text-navy">
                      {p.lotStatus}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">none</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => startEdit(p)}
                    className="mr-3 text-navy hover:underline"
                    aria-label="Edit property"
                  >
                    <Pencil className="inline size-4" />
                  </button>
                  <Link
                    to="/properties/$id"
                    params={{ id: p.id }}
                    className="mr-3 text-ink-muted hover:text-navy"
                    aria-label="View on site"
                  >
                    View
                  </Link>
                  <button onClick={() => remove(p.id)} className="text-destructive" aria-label="Delete property">
                    <Trash2 className="inline size-4" />
                  </button>
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

function F({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="mb-1 block text-xs font-500 uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}