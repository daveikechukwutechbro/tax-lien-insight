import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";
import { useSession } from "@/hooks/use-session";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/verify")({
  component: Verify,
});

function Verify() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["kyc", user?.id],
    enabled: !!user?.id,
    queryFn: async () =>
      (await supabase.from("kyc_submissions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("profiles").select("verified").eq("id", user!.id).maybeSingle()).data,
  });

  const [form, setForm] = useState({
    legal_name: "", date_of_birth: "", address_line1: "", address_line2: "",
    city: "", state: "", postal_code: "", country: "US", tax_id_last4: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const pending = submissions.find((s) => s.status === "pending");
  const isVerified = !!profile?.verified;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (form.tax_id_last4.length !== 4) return toast.error("Enter the last 4 digits of your SSN/EIN");
    setBusy(true);
    try {
      let id_document_path: string | null = null;
      if (file) {
        const path = `kyc/${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage.from("documents").upload(path, file, { upsert: false });
        if (up.error) throw up.error;
        if (!up.data) throw new Error("Upload failed");
        id_document_path = up.data.path;
      }
      const { error } = await supabase.from("kyc_submissions").insert({
        user_id: user.id, ...form, id_document_path,
      });
      if (error) throw error;
      toast.success("Verification submitted for review");
      setForm({ legal_name: "", date_of_birth: "", address_line1: "", address_line2: "", city: "", state: "", postal_code: "", country: "US", tax_id_last4: "" });
      setFile(null);
      qc.invalidateQueries({ queryKey: ["kyc"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-navy">
        <ShieldCheck className="size-6" />
        <h1 className="font-display text-3xl font-600">Identity Verification (KYC)</h1>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Verification is required before you can place bids. Your information is encrypted and reviewed by our compliance team.
      </p>

      {isVerified && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-success">
          <CheckCircle2 className="size-5" />
          <div>
            <div className="font-600">You're verified</div>
            <div className="text-xs opacity-80">You can now register and bid in any auction.</div>
          </div>
        </div>
      )}

      {!isVerified && pending && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-hairline bg-surface p-4">
          <Clock className="size-5 text-gold" />
          <div>
            <div className="font-600 text-navy">Under review</div>
            <div className="text-xs text-ink-muted">Submitted {new Date(pending.created_at).toLocaleString()}. Most reviews complete within 1 business day.</div>
          </div>
        </div>
      )}

      {!isVerified && !pending && (
        <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border border-hairline bg-surface p-5 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">Legal name
            <input required value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} className="input mt-1" />
          </label>
          <label className="text-sm">Date of birth
            <input required type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} className="input mt-1" />
          </label>
          <label className="text-sm">SSN/EIN last 4
            <input required maxLength={4} pattern="\d{4}" value={form.tax_id_last4} onChange={(e) => set("tax_id_last4", e.target.value.replace(/\D/g, ""))} className="input mt-1" />
          </label>
          <label className="text-sm sm:col-span-2">Street address
            <input required value={form.address_line1} onChange={(e) => set("address_line1", e.target.value)} className="input mt-1" />
          </label>
          <label className="text-sm sm:col-span-2">Apt / suite (optional)
            <input value={form.address_line2} onChange={(e) => set("address_line2", e.target.value)} className="input mt-1" />
          </label>
          <label className="text-sm">City
            <input required value={form.city} onChange={(e) => set("city", e.target.value)} className="input mt-1" />
          </label>
          <label className="text-sm">State
            <input required maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} className="input mt-1 uppercase" />
          </label>
          <label className="text-sm">Postal code
            <input required value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} className="input mt-1" />
          </label>
          <label className="text-sm">Country
            <input required value={form.country} onChange={(e) => set("country", e.target.value)} className="input mt-1" />
          </label>
          <label className="text-sm sm:col-span-2">Government-issued ID (driver's license, passport)
            <div className="mt-1 flex items-center gap-3 rounded-md border border-dashed border-hairline bg-surface-alt p-3">
              <Upload className="size-4 text-ink-muted" />
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
              {file && <span className="text-xs text-ink-muted">{file.name}</span>}
            </div>
          </label>
          <div className="sm:col-span-2">
            <button disabled={busy} className="rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground disabled:opacity-60">
              {busy ? "Submitting…" : "Submit for verification"}
            </button>
          </div>
        </form>
      )}

      {submissions.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-600 text-navy">Submission history</h2>
          {isLoading ? (
            <p className="mt-3 rounded-xl border border-hairline bg-surface p-8 text-center text-sm text-ink-muted">
              Loading…
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="mt-3 space-y-3 sm:hidden">
                {submissions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-hairline bg-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-600 text-navy">{s.legal_name}</div>
                        <div className="text-xs text-ink-muted">
                          {new Date(s.created_at).toLocaleString()}
                        </div>
                      </div>
                      <SubmissionStatus status={s.status} />
                    </div>
                    <div className="mt-2 text-xs text-ink-muted">
                      {s.admin_notes ?? "—"}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="mt-3 hidden sm:block">
                <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((s) => (
                          <tr
                            key={s.id}
                            className="border-b border-hairline/50 last:border-0"
                          >
                            <td className="px-4 py-2 text-xs">
                              {new Date(s.created_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-2">{s.legal_name}</td>
                            <td className="px-4 py-2">
                              <SubmissionStatus status={s.status} />
                            </td>
                            <td className="px-4 py-2 text-xs text-ink-muted">
                              {s.admin_notes ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%;display:block}`}</style>
    </div>
  );
}

function SubmissionStatus({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <CheckCircle2 className="size-3.5" /> Approved
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 text-gold">
        <Clock className="size-3.5" /> Pending
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <XCircle className="size-3.5" /> Rejected
      </span>
    );
  return <span className="capitalize text-ink-muted">{status}</span>;
}