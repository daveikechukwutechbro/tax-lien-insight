import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RotateCcw, Search } from "lucide-react";
import {
  getAdminJurisdictions,
  createAdminJurisdiction,
  updateAdminJurisdiction,
  deactivateAdminJurisdiction,
  type AdminJurisdiction,
} from "@/lib/backend";
import { JURISDICTION_TYPES } from "@/lib/constants";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/counties")({
  component: CountiesAdmin,
});

  const typeOptions = JURISDICTION_TYPES;

function CountiesAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "jurisdictions"],
    queryFn: getAdminJurisdictions,
  });
  const rows = data?.jurisdictions ?? [];
  const states = data?.states ?? [];

  const [name, setName] = useState("");
  const [stateId, setStateId] = useState("");
  const [type, setType] = useState("county");
  const [officialCode, setOfficialCode] = useState("");
  const [editing, setEditing] = useState<AdminJurisdiction | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [query, setQuery] = useState("");

  const filtered = query
    ? rows.filter(
        (r: AdminJurisdiction) =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          (r.state_name ?? "").toLowerCase().includes(query.toLowerCase()) ||
          (r.official_code ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : rows;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin", "jurisdictions"] });
    qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter a jurisdiction name");
    try {
      await createAdminJurisdiction({ name: name.trim(), jurisdictionType: type, stateId: stateId || undefined, officialCode: officialCode.trim() || undefined });
      setName(""); setStateId(""); setOfficialCode("");
      invalidate();
      toast.success("Jurisdiction added");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add jurisdiction");
    }
  }

  async function toggleActive(j: AdminJurisdiction) {
    const next = j.status === "active" ? "inactive" : "active";
    try {
      if (next === "inactive") {
        if (!confirm(`Deactivate "${j.name}"? Listings under it will be hidden from the public site.`)) return;
      }
      await updateAdminJurisdiction(j.id, { status: next });
      invalidate();
      toast.success(next === "active" ? "Jurisdiction activated" : "Jurisdiction deactivated");
    } catch (err: any) {
      toast.error(err.message ?? "Update failed");
    }
  }

  async function remove(j: AdminJurisdiction) {
    if (!confirm(`Delete "${j.name}"? This sets it to inactive (soft delete).`)) return;
    try {
      await deactivateAdminJurisdiction(j.id);
      invalidate();
      toast.success("Jurisdiction deactivated");
    } catch (err: any) {
      toast.error(err.message ?? "Delete failed");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await updateAdminJurisdiction(editing.id, { name: editName.trim() || undefined, officialCode: editCode.trim() || undefined });
      setEditing(null);
      invalidate();
      toast.success("Jurisdiction updated");
    } catch (err: any) {
      toast.error(err.message ?? "Update failed");
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Counties & Jurisdictions"
        description="Manage the counties, parishes and municipalities behind your auctions and listings."
        actions={
          <div className="hidden sm:block">
            <form onSubmit={add} className="flex flex-wrap items-center gap-2">
              <input
                className="h-9 w-36 rounded-md border border-hairline bg-background px-3 text-sm"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <select
                className="h-9 rounded-md border border-hairline bg-background px-2 text-sm"
                value={stateId}
                onChange={(e) => setStateId(e.target.value)}
              >
                <option value="">State…</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-hairline bg-background px-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className="h-9 w-28 rounded-md border border-hairline bg-background px-3 text-sm"
                placeholder="Code"
                value={officialCode}
                onChange={(e) => setOfficialCode(e.target.value)}
              />
              <Button type="submit" size="sm">
                <Plus className="size-4" /> Add
              </Button>
            </form>
          </div>
        }
      />

      {/* Mobile create form */}
      <form onSubmit={add} className="mt-4 space-y-2 rounded-xl border border-hairline bg-surface p-4 sm:hidden">
        <input
          className="h-9 w-full rounded-md border border-hairline bg-background px-3 text-sm"
          placeholder="County name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="h-9 w-full rounded-md border border-hairline bg-background px-2 text-sm"
          value={stateId}
          onChange={(e) => setStateId(e.target.value)}
        >
          <option value="">State…</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 w-full rounded-md border border-hairline bg-background px-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Button type="submit" className="w-full" size="sm">
          <Plus className="size-4" /> Add jurisdiction
        </Button>
      </form>

      <div className="mt-5 flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2">
        <Search className="size-4 text-ink-muted" />
        <input
          className="w-full bg-transparent text-sm outline-none"
          placeholder={`Search ${rows.length} jurisdictions…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-hairline bg-surface">
        {isLoading ? (
          <div className="px-5 py-14 text-center text-sm text-ink-muted">Loading jurisdictions…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">State</th>
                <th className="hidden px-5 py-3 md:table-cell">Code</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.map((j) => (
                <tr key={j.id} className={j.status !== "active" ? "opacity-60" : ""}>
                  <td className="max-w-[220px] px-5 py-3">
                    <div className="truncate font-500 text-navy">{j.name}</div>
                  </td>
                  <td className="px-5 py-3 capitalize text-ink-muted">{j.jurisdiction_type.replaceAll("_", " ")}</td>
                  <td className="px-5 py-3 text-ink-muted">{j.state_name ?? "—"}</td>
                  <td className="hidden px-5 py-3 text-ink-muted md:table-cell">{j.official_code ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditing(j); setEditName(j.name); setEditCode(j.official_code ?? ""); }}
                        className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-surface-alt hover:text-navy"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(j)}
                        className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-surface-alt hover:text-navy"
                        title={j.status === "active" ? "Deactivate" : "Activate"}
                      >
                        <RotateCcw className="size-4" />
                      </button>
                      <button
                        onClick={() => remove(j)}
                        className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-red-50 hover:text-red-600"
                        title="Deactivate (soft delete)"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-muted">
                    No jurisdictions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-sm rounded-xl border border-hairline bg-surface p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-600 text-navy">Edit jurisdiction</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-xs text-ink-muted">
                Name
                <input
                  className="mt-1 h-9 w-full rounded-md border border-hairline bg-background px-3 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </label>
              <label className="block text-xs text-ink-muted">
                Official code
                <input
                  className="mt-1 h-9 w-full rounded-md border border-hairline bg-background px-3 text-sm"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}