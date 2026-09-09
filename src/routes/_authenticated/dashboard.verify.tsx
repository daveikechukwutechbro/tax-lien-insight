import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { getKycStatus, submitKyc, createDocument, updateProfile, type KycStatus } from "@/lib/backend";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Upload, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/verify")({
  component: Verify,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  verified: { label: "Approved", cls: "text-success" },
  submitted: { label: "Pending", cls: "text-gold" },
  rejected: { label: "Rejected", cls: "text-destructive" },
  not_started: { label: "Not started", cls: "text-ink-muted" },
};

function Verify() {
  const { user } = useSession();
  const { data: kyc, isLoading } = useQuery({
    queryKey: ["kyc-status"],
    enabled: !!user?.id,
    queryFn: getKycStatus,
  });

  const [form, setForm] = useState({
    legal_name: "", date_of_birth: "", address_line1: "", city: "", state: "", postal_code: "", tax_id_last4: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const status = kyc?.status ?? "not_started";
  const pending = status === "submitted";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (form.tax_id_last4.length !== 4) return toast.error("Enter the last 4 digits of your SSN/EIN");
    if (!file) return toast.error("Attach a government-issued ID (driver's license or passport)");
    setBusy(true);
    try {
      const b64 = await fileToBase64(file);
      const documentId = await createDocument({
        bodyBase64: b64,
        mimeType: file.type || "application/octet-stream",
        resourceType: "kyc_id",
        accessScope: "kyc_sensitive",
      });
      await submitKyc([{ documentType: "government_id", documentId }]);
      await updateProfile({
        fullName: form.legal_name,
        addressLine: form.address_line1,
        city: form.city,
        state: form.state,
        postalCode: form.postal_code,
      });
      toast.success("Verification submitted for review");
      setForm({ legal_name: "", date_of_birth: "", address_line1: "", city: "", state: "", postal_code: "", tax_id_last4: "" });
      setFile(null);
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

      {status === "verified" && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-success">
          <CheckCircle2 className="size-5" />
          <div>
            <div className="font-600">You're verified</div>
            <div className="text-xs opacity-80">You can now register and bid in any auction.</div>
          </div>
        </div>
      )}

      {status === "rejected" && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <XCircle className="size-5" />
          <div>
            <div className="font-600">Verification was rejected</div>
            <div className="text-xs opacity-80">
              {kyc?.rejection_reason || "Please resubmit with a clearer government-issued ID."} You can resubmit below.
            </div>
          </div>
        </div>
      )}

      {pending && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-hairline bg-surface p-4">
          <Clock className="size-5 text-gold" />
          <div>
            <div className="font-600 text-navy">Under review</div>
            <div className="text-xs text-ink-muted">
              {kyc?.submitted_at ? `Submitted ${new Date(kyc.submitted_at).toLocaleString()}. ` : ""}
              Most reviews complete within 1 business day.
            </div>
          </div>
        </div>
      )}

      {!pending && status !== "verified" && (
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
          <label className="text-sm">City
            <input required value={form.city} onChange={(e) => set("city", e.target.value)} className="input mt-1" />
          </label>
          <label className="text-sm">Postal code
            <input required value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} className="input mt-1" />
          </label>
          <label className="text-sm">State
            <input required maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} className="input mt-1 uppercase" />
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

      <div className="mt-6 rounded-xl border border-dashed border-hairline bg-surface p-4 text-sm text-ink-muted">
        <div className="font-600 text-navy">What do we require?</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>A government-issued photo ID (driver's license, state ID, or passport)</li>
          <li>Legal name, date of birth, and the last 4 digits of your SSN/EIN</li>
          <li>A U.S. mailing address</li>
          <li>Fully funded account to bid — certificates are issued to your verified profile</li>
        </ul>
      </div>

      {kyc && (
        <div className="mt-4 text-xs text-ink-muted">
          Current status: <StatusPill status={status} kyc={kyc} />
        </div>
      )}
      {isLoading && <p className="mt-4 text-xs text-ink-muted">Loading status…</p>}

      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%;display:block}`}</style>
    </div>
  );
}

function StatusPill({ status, kyc }: { status: string; kyc: KycStatus }) {
  const s = STATUS[status] ?? { label: status, cls: "text-ink-muted" };
  return (
    <span className={`inline-flex items-center gap-1 font-600 ${s.cls}`}>
      {s.label}
      <span className="font-normal text-ink-muted">
        {kyc?.reviewed_at ? ` · reviewed ${new Date(kyc.reviewed_at).toLocaleDateString()}` : ""}
      </span>
    </span>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}