import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Film } from "lucide-react";
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
import { fileToDataUrl, videoToDataUrl } from "@/lib/image-upload";

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
  legalDescription: string;
  images: string[];
  videoData: string | null;
  year_built: string;
  living_area_sqft: string;
  lot_size_acres: string;
  bedrooms: string;
  bathrooms: string;
  use_type: string;
  owner_name: string;
  owner_mailing_address: string;
  taxes_owed: string;
  interest_rate: string;
  tax_year: string;
  redemption_months: string;
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
  legalDescription: "",
  images: [],
  videoData: null,
  year_built: "",
  living_area_sqft: "",
  lot_size_acres: "",
  bedrooms: "",
  bathrooms: "",
  use_type: "",
  owner_name: "",
  owner_mailing_address: "",
  taxes_owed: "",
  interest_rate: "",
  tax_year: "",
  redemption_months: "",
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

  const num = (s: string) => (s === "" ? undefined : Number(s));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const images = form.images;
    const payload: PropertyInput = {
      jurisdictionId: form.jurisdictionId || undefined,
      parcelId: form.parcelId || undefined,
      address: form.address,
      city: form.city || undefined,
      state: form.state || undefined,
      postalCode: form.zip || undefined,
      propertyType: form.property_type,
      assessedValue: num(form.assessed_value),
      legalDescription: form.legalDescription || undefined,
      imageData: images[0] ?? null,
      gallery: images.length > 1 ? images.slice(1) : null,
      videoUrl: form.videoData ?? null,
      yearBuilt: num(form.year_built),
      livingAreaSqft: num(form.living_area_sqft),
      lotSizeAcres: num(form.lot_size_acres),
      bedrooms: num(form.bedrooms),
      bathrooms: num(form.bathrooms),
      useType: form.use_type || null,
      ownerName: form.owner_name || null,
      ownerMailingAddress: form.owner_mailing_address || null,
      taxesOwed: num(form.taxes_owed),
      interestRate: num(form.interest_rate),
      taxYear: num(form.tax_year),
      redemptionPeriodMonths: num(form.redemption_months),
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
    const images = [p.imageUrl, ...(p.gallery ?? [])].filter(Boolean) as string[];
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
      legalDescription: p.legalDescription ?? "",
      images,
      videoData: p.videoUrl ?? null,
      year_built: p.yearBuilt != null ? String(p.yearBuilt) : "",
      living_area_sqft: p.livingAreaSqft != null ? String(p.livingAreaSqft) : "",
      lot_size_acres: p.lotSizeAcres != null ? String(p.lotSizeAcres) : "",
      bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
      bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
      use_type: p.useType ?? "",
      owner_name: p.ownerName ?? "",
      owner_mailing_address: p.ownerMailingAddress ?? "",
      taxes_owed: p.propertyTaxesOwed != null ? String(p.propertyTaxesOwed) : "",
      interest_rate: p.propertyInterestRate != null ? String(p.propertyInterestRate) : "",
      tax_year: p.propertyTaxYear != null ? String(p.propertyTaxYear) : "",
      redemption_months: p.propertyRedemptionMonths != null ? String(p.propertyRedemptionMonths) : "",
      editingId: p.id,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onImagesFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    try {
      const next = [...form.images];
      for (const file of files) {
        if (next.length >= 10) {
          toast.error("Up to 10 photos per property");
          break;
        }
        const dataUrl = await fileToDataUrl(file);
        next.push(dataUrl);
      }
      set("images", next);
    } catch (err) {
      toast.error((err as Error).message ?? "Could not read image");
    } finally {
      e.target.value = "";
    }
  }

  async function onVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await videoToDataUrl(file);
      set("videoData", dataUrl);
    } catch (err) {
      toast.error((err as Error).message ?? "Could not read video");
    } finally {
      e.target.value = "";
    }
  }

  function removeImage(idx: number) {
    set("images", form.images.filter((_, i) => i !== idx));
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
          <F label="Taxes owed ($)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.taxes_owed}
              onChange={(e) => set("taxes_owed", e.target.value)}
              className="input"
            />
          </F>
          <F label="Interest rate (%)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.interest_rate}
              onChange={(e) => set("interest_rate", e.target.value)}
              className="input"
            />
          </F>
          <F label="Tax year">
            <input
              type="number"
              min="1990"
              max="2100"
              value={form.tax_year}
              onChange={(e) => set("tax_year", e.target.value)}
              className="input"
            />
          </F>
          <F label="Redemption (months)">
            <input
              type="number"
              min="1"
              value={form.redemption_months}
              onChange={(e) => set("redemption_months", e.target.value)}
              className="input"
            />
          </F>
          <F label="Year built">
            <input
              type="number"
              min="1700"
              max="2100"
              value={form.year_built}
              onChange={(e) => set("year_built", e.target.value)}
              className="input"
            />
          </F>
          <F label="Living area (sq ft)">
            <input
              type="number"
              min="0"
              value={form.living_area_sqft}
              onChange={(e) => set("living_area_sqft", e.target.value)}
              className="input"
            />
          </F>
          <F label="Lot size (acres)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.lot_size_acres}
              onChange={(e) => set("lot_size_acres", e.target.value)}
              className="input"
            />
          </F>
          <F label="Bedrooms">
            <input
              type="number"
              min="0"
              value={form.bedrooms}
              onChange={(e) => set("bedrooms", e.target.value)}
              className="input"
            />
          </F>
          <F label="Bathrooms">
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.bathrooms}
              onChange={(e) => set("bathrooms", e.target.value)}
              className="input"
            />
          </F>
          <F label="Use type">
            <input
              value={form.use_type}
              placeholder="e.g. Single family, Multi-family…"
              onChange={(e) => set("use_type", e.target.value)}
              className="input"
            />
          </F>
          <F label="Assessed value ($)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.assessed_value}
              onChange={(e) => set("assessed_value", e.target.value)}
              className="input"
            />
          </F>
          <F label="Owner of record">
            <input
              value={form.owner_name}
              onChange={(e) => set("owner_name", e.target.value)}
              className="input"
            />
          </F>
          <F label="Owner mailing address">
            <input
              value={form.owner_mailing_address}
              onChange={(e) => set("owner_mailing_address", e.target.value)}
              className="input"
            />
          </F>
          <F label="Photos (select several)">
            <div className="flex items-start gap-2">
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-hairline bg-surface-alt px-3 py-1.5 text-xs font-500 text-navy hover:bg-surface-alt/70">
                Upload
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onImagesFiles}
                />
              </label>
              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.images.map((src, i) => (
                    <div key={`${src.slice(0, 32)}-${i}`} className="relative">
                      <img src={src} alt="" className="size-10 rounded-md object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-primary-foreground"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </F>
          <F label="Video (MP4/WebM/MOV, optional)">
            <div className="flex items-center gap-2">
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-hairline bg-surface-alt px-3 py-1.5 text-xs font-500 text-navy hover:bg-surface-alt/70">
                <Film className="size-3.5" />
                {form.videoData ? "Replace" : "Upload"}
                <input type="file" accept="video/*" className="hidden" onChange={onVideoFile} />
              </label>
              {form.videoData ? (
                <button
                  type="button"
                  onClick={() => set("videoData", null)}
                  className="p-1 text-ink-muted hover:text-destructive"
                  aria-label="Remove video"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </F>
          <F label="Description" wide>
            <textarea
              value={form.legalDescription}
              onChange={(e) => set("legalDescription", e.target.value)}
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