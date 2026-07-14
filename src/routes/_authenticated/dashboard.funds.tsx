import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries/dashboard";

export const Route = createFileRoute("/_authenticated/dashboard/funds")({
  component: FundsPage,
});

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const METHODS = ["Bank Transfer (ACH)", "Wire Transfer", "Cashier's Check", "Zelle", "Other"];

function FundsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const { data: rows = [] } = useQuery({
    queryKey: ["fund-requests", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("fund_requests")
        .select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [kind, setKind] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(METHODS[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!(amt > 0)) return toast.error("Enter a valid amount");
    if (kind === "withdrawal" && amt > Number(profile?.account_balance ?? 0))
      return toast.error("Amount exceeds your balance");
    setBusy(true);
    const { error } = await supabase.from("fund_requests").insert({
      user_id: user!.id, kind, amount: amt, method, reference: reference || null, notes: notes || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Request submitted. An admin will review it shortly.");
    setAmount(""); setReference(""); setNotes("");
    qc.invalidateQueries({ queryKey: ["fund-requests"] });
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy">Account Funds</h1>
      <p className="mt-1 text-sm text-ink-muted">Deposits and withdrawals are processed manually by our team.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card label="Available Balance" value={fmt(Number(profile?.account_balance ?? 0))} />
        <Card label="Pending Deposits" value={fmt(rows.filter(r => r.kind==="deposit" && r.status==="pending").reduce((s,r)=>s+Number(r.amount),0))} />
        <Card label="Pending Withdrawals" value={fmt(rows.filter(r => r.kind==="withdrawal" && r.status==="pending").reduce((s,r)=>s+Number(r.amount),0))} />
      </div>

      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border border-hairline bg-surface p-5 sm:grid-cols-2">
        <label className="text-sm">Type
          <select value={kind} onChange={(e)=>setKind(e.target.value as "deposit"|"withdrawal")} className="input mt-1">
            <option value="deposit">Deposit funds</option>
            <option value="withdrawal">Withdraw funds</option>
          </select>
        </label>
        <label className="text-sm">Amount (USD)
          <input required type="number" min="1" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} className="input mt-1" />
        </label>
        <label className="text-sm">Method
          <select value={method} onChange={(e)=>setMethod(e.target.value)} className="input mt-1">
            {METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label className="text-sm">{kind==="deposit" ? "Transfer reference / confirmation #" : "Payout account (last 4)"}
          <input value={reference} onChange={(e)=>setReference(e.target.value)} className="input mt-1" placeholder="Optional" />
        </label>
        <label className="text-sm sm:col-span-2">Notes
          <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="input mt-1 h-20 py-2" placeholder="Any details for our team" />
        </label>
        <div className="sm:col-span-2">
          <button disabled={busy} className="rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground disabled:opacity-60">
            {busy ? "Submitting…" : `Submit ${kind} request`}
          </button>
        </div>
      </form>

      <h2 className="mt-8 font-display text-xl font-600 text-navy">Recent Requests</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-hairline bg-surface">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">No requests yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Method</th><th className="px-4 py-2">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-hairline/50 last:border-0">
                  <td className="px-4 py-2 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 capitalize">{r.kind}</td>
                  <td className="px-4 py-2 font-600">{fmt(Number(r.amount))}</td>
                  <td className="px-4 py-2 text-xs">{r.method}</td>
                  <td className="px-4 py-2"><StatusPill s={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%;display:block}`}</style>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="text-xs uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="mt-2 font-display text-2xl font-600 text-navy">{value}</div>
    </div>
  );
}
function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-blue-100 text-blue-800",
    completed: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
  };
  return <span className={`rounded px-2 py-0.5 text-xs font-500 ${map[s] ?? "bg-slate-100 text-slate-700"}`}>{s}</span>;
}