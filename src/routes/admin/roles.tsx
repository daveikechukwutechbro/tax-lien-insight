import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Save, ShieldAlert } from "lucide-react";
import {
  getAdminRoles,
  saveAdminRolePermissions,
  type AdminPermission,
  type AdminRole,
} from "@/lib/backend";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/roles")({
  component: RolesPage,
});

function RolesPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: getAdminRoles,
  });
  const [roleId, setRoleId] = useState<string | null>(null);

  const roles = data?.roles ?? [];
  const selected = roles.find((r) => r.id === roleId) ?? roles[0];

  return (
    <div>
      <AdminPageHeader
        title="Roles & Permissions"
        description="Control what each staff role can do. Changes apply to every user with that role the next time they sign in."
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <nav className="flex flex-wrap gap-1 lg:flex-col">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoleId(r.id)}
              className={
                "rounded-md px-3 py-2 text-left text-sm transition-colors " +
                (selected?.id === r.id
                  ? "bg-navy font-600 text-primary-foreground"
                  : "text-ink hover:bg-surface-alt")
              }
            >
              <span className="block capitalize">{r.name.replaceAll("_", " ")}</span>
              <span className="block text-[11px] opacity-70">
                {r.permissions.length} permission{r.permissions.length === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </nav>

        {isLoading ? (
          <div className="rounded-xl border border-hairline bg-surface p-10 text-sm text-ink-muted">
            Loading roles…
          </div>
        ) : isError || !data ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-10 text-sm text-destructive">
            Couldn't load roles — {error instanceof Error ? error.message : "unexpected error"}.
            Your account needs the <strong>system.manage</strong> permission to view this page.
          </div>
        ) : selected ? (
          <RoleEditor key={selected.id} role={selected} permissions={data.permissions} />
        ) : (
          <div className="rounded-xl border border-hairline bg-surface p-10 text-sm text-ink-muted">
            No roles found.
          </div>
        )}
      </div>
    </div>
  );
}

function RoleEditor({ role, permissions }: { role: AdminRole; permissions: AdminPermission[] }) {
  const qc = useQueryClient();
  const [granted, setGranted] = useState<Set<string>>(() => new Set(role.permissions));
  const dirty =
    granted.size !== role.permissions.length || role.permissions.some((p) => !granted.has(p));

  const mutation = useMutation({
    mutationFn: () => saveAdminRolePermissions(role.id, Array.from(granted)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "roles"] });
      toast.success(`${role.name.replaceAll("_", " ")} permissions saved`);
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save"),
  });

  const toggle = (name: string, on: boolean) =>
    setGranted((prev) => {
      const next = new Set(prev);
      if (on) next.add(name);
      else next.delete(name);
      return next;
    });

  // Group permissions by their domain prefix ("auction.create" → "auction").
  const groups = new Map<string, AdminPermission[]>();
  for (const p of permissions) {
    const g = p.name.split(".")[0] ?? "other";
    const arr = groups.get(g) ?? [];
    arr.push(p);
    groups.set(g, arr);
  }
  const orderedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="rounded-xl border border-hairline bg-surface p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-600 text-navy capitalize">
            {role.name.replaceAll("_", " ")}
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">{role.description ?? "No description."}</p>
        </div>
        <div className="flex items-center gap-3">
          {dirty ? <span className="text-xs font-600 text-gold">Unsaved changes</span> : null}
          <Button type="submit" size="sm" disabled={mutation.isPending || !dirty}>
            <Save className="mr-1.5 size-3.5" />
            {mutation.isPending ? "Saving…" : "Save permissions"}
          </Button>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-lg border border-gold-soft bg-gold-soft/40 px-3 py-2 text-xs text-ink">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-navy" />
        <span>
          At least one role must keep <strong>system → manage</strong> or nobody can edit roles
          again. This editor blocks removing the last one.
        </span>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
        {orderedGroups.map(([group, perms]) => (
          <div key={group}>
            <div className="mb-2 border-b border-hairline pb-1.5 text-[11px] font-600 uppercase tracking-widest text-ink-muted">
              {group}
            </div>
            <div className="space-y-2">
              {perms.map((p) => {
                const on = granted.has(p.name);
                return (
                  <label key={p.id} className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => toggle(p.name, e.target.checked)}
                      className="mt-0.5 size-4 shrink-0 accent-navy"
                    />
                    <span>
                      <span className="block text-sm font-500 text-ink">
                        {p.name.split(".")[1] ?? p.name}
                      </span>
                      {p.description ? (
                        <span className="block text-xs leading-snug text-ink-muted">
                          {p.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </form>
  );
}
