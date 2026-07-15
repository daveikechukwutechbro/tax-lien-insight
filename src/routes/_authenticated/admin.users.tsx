import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { ShieldCheck, ShieldOff, BadgeCheck, BadgeX, Wallet, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdmin,
});

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function UsersAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  const { data: roles = [] } = useQuery({
    queryKey: ["admin", "user-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id, role")).data ?? [],
  });
  const rolesByUser = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of roles) m.set(r.user_id, [...(m.get(r.user_id) ?? []), r.role]);
    return m;
  }, [roles]);

  const filtered = profiles.filter((p) =>
    !q ? true : (p.full_name ?? "").toLowerCase().includes(q.toLowerCase()) || p.id.startsWith(q),
  );

  async function setRole(user_id: string, role: "admin" | "moderator", grant: boolean) {
    const { error } = await supabase.rpc("admin_set_role", { _user_id: user_id, _role: role, _grant: grant });
    if (error) return toast.error(error.message);
    toast.success(`${grant ? "Granted" : "Revoked"} ${role}`);
    qc.invalidateQueries({ queryKey: ["admin", "user-roles"] });
  }
  async function setVerified(user_id: string, verified: boolean) {
    const { error } = await supabase.rpc("admin_set_verified", { _user_id: user_id, _verified: verified });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "profiles"] });
  }
  async function adjustBalance(user_id: string) {
    const raw = window.prompt("Balance change (e.g. 500 or -200)");
    if (!raw) return;
    const delta = Number(raw);
    if (!Number.isFinite(delta)) return toast.error("Invalid amount");
    const reason = window.prompt("Reason for adjustment") ?? "manual";
    const { error } = await supabase.rpc("admin_adjust_balance", { _user_id: user_id, _delta: delta, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success("Balance updated");
    qc.invalidateQueries({ queryKey: ["admin", "profiles"] });
  }
  async function sendMsg(user_id: string) {
    const subject = window.prompt("Subject") ?? "";
    const body = window.prompt("Message body");
    if (!body) return;
    const { error } = await supabase.rpc("admin_send_message", { _user_id: user_id, _subject: subject, _body: body });
    if (error) return toast.error(error.message);
    toast.success("Message sent");
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-600 text-navy">Users</h2>
          <p className="mt-1 text-sm text-ink-muted">Manage roles, verification, balances, and messaging.</p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or id…" className="h-9 w-64 rounded-md border border-hairline bg-surface px-3 text-sm" />
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
            <tr><th className="px-4 py-2">User</th><th className="px-4 py-2">Roles</th><th className="px-4 py-2">Verified</th><th className="px-4 py-2">Balance</th><th className="px-4 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const rs = rolesByUser.get(p.id) ?? [];
              const isAdmin = rs.includes("admin");
              return (
                <tr key={p.id} className="border-b border-hairline/50 last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-500 text-navy">{p.full_name ?? "—"}</div>
                    <div className="text-xs text-ink-muted">{p.id.slice(0, 8)} · {p.phone ?? "no phone"}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">{rs.length ? rs.join(", ") : "user"}</td>
                  <td className="px-4 py-2">{p.verified ? <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-600 text-success">verified</span> : <span className="text-xs text-ink-muted">no</span>}</td>
                  <td className="px-4 py-2 font-600">{fmt(Number(p.account_balance))}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button title={isAdmin ? "Revoke admin" : "Grant admin"} onClick={() => setRole(p.id, "admin", !isAdmin)} className="rounded-md border border-hairline bg-surface p-1.5 hover:bg-surface-alt">
                        {isAdmin ? <ShieldOff className="size-4 text-destructive" /> : <ShieldCheck className="size-4 text-navy" />}
                      </button>
                      <button title={p.verified ? "Unverify" : "Verify"} onClick={() => setVerified(p.id, !p.verified)} className="rounded-md border border-hairline bg-surface p-1.5 hover:bg-surface-alt">
                        {p.verified ? <BadgeX className="size-4 text-destructive" /> : <BadgeCheck className="size-4 text-success" />}
                      </button>
                      <button title="Adjust balance" onClick={() => adjustBalance(p.id)} className="rounded-md border border-hairline bg-surface p-1.5 hover:bg-surface-alt"><Wallet className="size-4" /></button>
                      <button title="Send message" onClick={() => sendMsg(p.id)} className="rounded-md border border-hairline bg-surface p-1.5 hover:bg-surface-alt"><Send className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}