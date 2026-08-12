import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Landmark, CreditCard, CircleDollarSign, Check, Info, ShieldCheck, Bell,
  Lock, ArrowRight, Wallet, Send, BadgeCheck, PiggyBank, Copy,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries/dashboard";
import {
  NETWORKS, NETWORK_DISPLAY, QUICK_AMOUNTS, USDC_ADDRESSES, type NetworkKey,
} from "@/lib/funding";

export const Route = createFileRoute("/_authenticated/dashboard/funds")({
  head: () => ({
    meta: [
      { title: "Add Funds — TaxLien Auctions" },
      { name: "description", content: "Securely fund your TaxLien investment account with USDC." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FundsPage,
});

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtUSDC = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  const [amount, setAmount] = useState("5000.00");
  const [network, setNetwork] = useState<NetworkKey>("base");
  const [busy, setBusy] = useState(false);
  const [deposit, setDeposit] = useState<{ address: string; id: string } | null>(null);

  const amt = Number(amount) || 0;
  const fee = NETWORKS.find((n) => n.key === network)!.fee;
  const receive = Math.max(amt - fee, 0);

  async function generate() {
    if (!(amt > 0)) return toast.error("Enter a valid amount");
    setBusy(true);
    const { data, error } = await supabase.from("fund_requests").insert({
      user_id: user!.id,
      kind: "deposit",
      amount: amt,
      method: `USDC — ${NETWORK_DISPLAY[network]}`,
      notes: `Network: ${NETWORK_DISPLAY[network]}; est. fee ${fee} USDC`,
    }).select("id").single();
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Could not create deposit");
    setDeposit({ address: USDC_ADDRESSES[network], id: data.id });
    toast.success("Deposit created — send USDC to the address below.");
    qc.invalidateQueries({ queryKey: ["fund-requests"] });
  }

  async function notifyMe(methodLabel: string) {
    const { error } = await supabase.from("messages").insert({
      user_id: user!.id,
      from_admin: false,
      subject: `Notify me: ${methodLabel}`,
      body: `Please notify me when ${methodLabel} funding becomes available.`,
    });
    if (error) return toast.error(error.message);
    toast.success(`We'll notify you when ${methodLabel} is available.`);
  }

  const [wAmount, setWAmount] = useState("");
  const [wRef, setWRef] = useState("");
  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    const w = Number(wAmount);
    if (!(w > 0)) return toast.error("Enter a valid amount");
    if (w > Number(profile?.account_balance ?? 0))
      return toast.error("Amount exceeds your balance");
    setBusy(true);
    const { error } = await supabase.from("fund_requests").insert({
      user_id: user!.id, kind: "withdrawal", amount: w,
      method: "USDC payout", reference: wRef || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal request submitted for review.");
    setWAmount(""); setWRef("");
    qc.invalidateQueries({ queryKey: ["fund-requests"] });
  }

  return (
    <div>
      {/* Hero */}
      <section className="rounded-xl border border-hairline bg-surface-alt p-6">
        <h1 className="font-display text-3xl font-600 text-navy">Add Funds</h1>
        <p className="mt-1 text-sm font-500 text-ink">Securely Fund Your Investment Account</p>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted">
          Add funds to your TaxLien account to participate in available tax lien investment
          opportunities. All deposits are securely tracked and credited to your account after
          successful confirmation.
        </p>
        <div className="mt-4 text-xs uppercase tracking-wider text-ink-muted">
          Available balance <span className="ml-2 font-display text-base normal-case tracking-normal text-navy">{fmt(Number(profile?.account_balance ?? 0))}</span>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {/* 1. method */}
          <h2 className="font-display text-lg font-600 text-navy">1. Choose Funding Method</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="relative rounded-xl border-2 border-success bg-success-soft/40 p-4">
              <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-success text-white"><Check className="size-3" /></span>
              <div className="grid size-10 place-items-center rounded-full bg-success/15 text-success"><CircleDollarSign className="size-5" /></div>
              <div className="mt-3 font-600 text-navy">USDC (USD Coin)</div>
              <span className="mt-1 inline-block rounded bg-success/15 px-2 py-0.5 text-xs font-500 text-success">Available</span>
              <p className="mt-2 text-xs text-ink-muted">Deposit using USDC, a widely used U.S. dollar-backed stablecoin.</p>
              <ul className="mt-3 space-y-1 text-xs text-ink">
                {["Fast settlement", "Transparent blockchain verification", "Available 24/7"].map((t) => (
                  <li key={t} className="flex gap-1.5"><Check className="mt-0.5 size-3 shrink-0 text-success" />{t}</li>
                ))}
              </ul>
            </div>
            <ComingSoon
              icon={<Landmark className="size-5" />}
              title="Bank Transfer (ACH / Wire)"
              body="We're currently completing our U.S. banking integration. Once available, you'll be able to fund your account directly through ACH and wire transfers."
              onNotify={() => notifyMe("Bank Transfer (ACH / Wire)")}
            />
            <ComingSoon
              icon={<CreditCard className="size-5" />}
              title="Debit & Credit Card"
              body="Card funding will be available after the completion of our payment processing integration."
              onNotify={() => notifyMe("Debit & Credit Card")}
            />
          </div>

          {/* 2. amount */}
          <h2 className="mt-8 font-display text-lg font-600 text-navy">2. Deposit Amount</h2>
          <p className="mt-1 text-sm text-ink-muted">Enter the amount you'd like to deposit.</p>
          <label className="mt-3 block text-xs uppercase tracking-wider text-ink-muted">Amount (USD Equivalent)</label>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3">
            <span className="font-display text-lg text-ink-muted">$</span>
            <input
              type="number" min="1" step="0.01" value={amount}
              onChange={(e) => { setAmount(e.target.value); setDeposit(null); }}
              className="h-12 w-full bg-transparent font-display text-xl font-600 text-navy outline-none"
            />
            <span className="text-xs font-500 text-ink-muted">USD</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((q) => {
              const active = amt === q;
              return (
                <button key={q} type="button" onClick={() => { setAmount(q.toFixed(2)); setDeposit(null); }}
                  className={`rounded-md border px-4 py-1.5 text-sm font-500 ${active ? "border-navy bg-navy text-primary-foreground" : "border-hairline bg-surface text-ink hover:border-navy"}`}>
                  ${q.toLocaleString()}
                </button>
              );
            })}
          </div>

          {/* 3. network */}
          <h2 className="mt-8 font-display text-lg font-600 text-navy">3. Select Network</h2>
          <p className="mt-1 text-sm text-ink-muted">Choose the supported blockchain network.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {NETWORKS.map((n) => {
              const active = n.key === network;
              return (
                <button key={n.key} type="button" onClick={() => { setNetwork(n.key); setDeposit(null); }}
                  className={`flex items-center gap-2 rounded-lg border-2 p-4 text-left ${active ? "border-navy bg-navy/5" : "border-hairline bg-surface hover:border-navy/40"}`}>
                  <span className="grid size-8 place-items-center rounded-full bg-navy/10 text-navy text-xs font-600">{n.label[0]}</span>
                  <span>
                    <span className="block font-600 text-navy">{n.label}</span>
                    {n.sub && <span className="block text-xs text-success">{n.sub}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2 rounded-lg bg-surface-alt p-3 text-xs text-ink-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-navy" />
            Only send USDC on the selected network. Sending other assets or using an unsupported
            network may result in loss of funds.
          </div>

          <button onClick={generate} disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-5 py-3.5 text-sm font-600 text-primary-foreground disabled:opacity-60">
            <Lock className="size-4" /> {busy ? "Generating…" : "Generate Deposit Address"} <ArrowRight className="ml-auto size-4" />
          </button>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
            <ShieldCheck className="size-3.5 text-success" /> Your security is our priority. All transactions are encrypted and securely processed.
          </p>

          {deposit && (
            <div className="mt-4 rounded-xl border border-hairline bg-surface p-5">
              <div className="text-xs uppercase tracking-wider text-ink-muted">Your USDC deposit address · {NETWORK_DISPLAY[network]}</div>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-surface-alt px-3 py-2 font-mono text-xs text-ink">{deposit.address}</code>
                <button onClick={() => { navigator.clipboard.writeText(deposit.address); toast.success("Address copied"); }}
                  className="flex items-center gap-1 rounded-md border border-hairline px-3 py-2 text-xs font-600 text-navy"><Copy className="size-3.5" />Copy</button>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                Reference <span className="font-mono">{deposit.id.slice(0, 8).toUpperCase()}</span> — send exactly {fmtUSDC(amt)} USDC.
                Your balance updates once the deposit is confirmed.
              </p>
            </div>
          )}

          {/* 4. next */}
          <h2 className="mt-8 font-display text-lg font-600 text-navy">4. What Happens Next?</h2>
          <div className="mt-3 grid gap-4 rounded-xl border border-hairline bg-surface p-5 sm:grid-cols-4">
            <Step icon={<Wallet className="size-5" />} n="1. Create Deposit" body="Generate a unique deposit address or payment request." />
            <Step icon={<Send className="size-5" />} n="2. Send USDC" body="Send USDC to the address provided on the selected network." />
            <Step icon={<BadgeCheck className="size-5" />} n="3. Confirmations" body="We'll wait for the required blockchain confirmations." />
            <Step icon={<PiggyBank className="size-5" />} n="4. Funds Added" body="Your account balance updates and your funds are ready to invest." />
          </div>

          <div className="mt-4 rounded-xl border border-success/30 bg-success-soft/40 p-4 text-xs text-ink">
            <div className="flex items-center gap-1.5 font-600 text-navy"><ShieldCheck className="size-4 text-success" />Why is USDC currently available?</div>
            <p className="mt-1 text-ink-muted">
              During our initial platform rollout, we're offering funding through USDC while completing
              integration with additional payment methods, including ACH, wire transfer, and debit/credit
              cards. Additional funding options will be introduced as they become available.
            </p>
          </div>
        </div>

        {/* right rail */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-hairline bg-surface p-4">
            <div className="text-sm font-600 text-navy">Deposit Summary</div>
            <Row label="You Send" value={`${fmtUSDC(amt)} USDC`} strong />
            <Row label="Network" value={NETWORK_DISPLAY[network]} strong />
            <Row label="Est. Network Fee" value={`~ ${fee} USDC`} strong />
            <div className="mt-3 text-xs uppercase tracking-wider text-ink-muted">You Will Receive</div>
            <div className="font-display text-lg font-600 text-success">{fmtUSDC(receive)} USDC</div>
          </div>
          <div className="rounded-xl border border-hairline bg-surface-alt p-4">
            <div className="flex items-center gap-1.5 text-sm font-600 text-navy"><Info className="size-4" />Why USDC?</div>
            <ul className="mt-2 space-y-1 text-xs text-ink">
              {["Fully reserved and regulated", "Widely accepted", "Fast settlement", "Stable value (1 USDC = 1 USD)"].map((t) => (
                <li key={t} className="flex gap-1.5"><Check className="mt-0.5 size-3 shrink-0 text-success" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-hairline bg-surface-alt p-4">
            <div className="flex items-center gap-1.5 text-sm font-600 text-navy"><ShieldCheck className="size-4" />Security</div>
            <p className="mt-2 text-xs text-ink-muted">Your deposits are:</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-ink-muted">
              <li>Recorded on the blockchain</li>
              <li>Monitored automatically</li>
              <li>Linked to your account</li>
              <li>Protected by encrypted infrastructure</li>
            </ul>
          </div>
        </aside>
      </div>

      <h2 className="mt-10 font-display text-xl font-600 text-navy">Withdraw Funds</h2>
      <form onSubmit={withdraw} className="mt-3 grid gap-3 rounded-xl border border-hairline bg-surface p-5 sm:grid-cols-3">
        <label className="text-sm">Amount (USD)
          <input required type="number" min="1" step="0.01" value={wAmount} onChange={(e)=>setWAmount(e.target.value)} className="input mt-1" />
        </label>
        <label className="text-sm sm:col-span-2">Payout USDC wallet address
          <input value={wRef} onChange={(e)=>setWRef(e.target.value)} className="input mt-1" placeholder="0x…" />
        </label>
        <div>
          <button disabled={busy} className="rounded-md border border-hairline bg-surface px-5 py-2 text-sm font-600 text-navy disabled:opacity-60">
            {busy ? "Submitting…" : "Request withdrawal"}
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

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="mt-3">
      <div className="text-xs uppercase tracking-wider text-ink-muted">{label}</div>
      <div className={`text-sm ${strong ? "font-600 text-navy" : "text-ink"}`}>{value}</div>
    </div>
  );
}

function Step({ icon, n, body }: { icon: React.ReactNode; n: string; body: string }) {
  return (
    <div>
      <div className="grid size-10 place-items-center rounded-full bg-navy/10 text-navy">{icon}</div>
      <div className="mt-2 text-sm font-600 text-navy">{n}</div>
      <p className="mt-1 text-xs text-ink-muted">{body}</p>
    </div>
  );
}

function ComingSoon({ icon, title, body, onNotify }: { icon: React.ReactNode; title: string; body: string; onNotify: () => void }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="grid size-10 place-items-center rounded-full bg-gold/20 text-navy">{icon}</div>
      <div className="mt-3 font-600 text-navy">{title}</div>
      <span className="mt-1 inline-block rounded bg-gold/25 px-2 py-0.5 text-xs font-500 text-navy">Coming Soon</span>
      <p className="mt-2 text-xs italic text-ink-muted">{body}</p>
      <button type="button" onClick={onNotify}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-hairline px-3 py-2 text-xs font-600 text-navy hover:border-navy">
        Notify Me <Bell className="size-3.5" />
      </button>
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