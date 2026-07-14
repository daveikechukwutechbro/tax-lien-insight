import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { profileQuery } from "@/lib/queries/dashboard";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: Profile,
});

function Profile() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) { setName(profile.full_name ?? ""); setPhone((profile as { phone?: string }).phone ?? ""); }
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function claimAdmin() {
    const { data, error } = await supabase.rpc("claim_first_admin");
    if (error) return toast.error(error.message);
    if (data) { toast.success("You are now an admin"); qc.invalidateQueries({ queryKey: ["is-admin"] }); }
    else toast.error("An admin already exists");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-600 text-navy">Profile Settings</h1>
      <p className="mt-1 text-sm text-ink-muted">Manage your personal information.</p>
      <form onSubmit={save} className="mt-6 grid gap-3 rounded-xl border border-hairline bg-surface p-5">
        <label className="text-sm">Full name
          <input value={name} onChange={(e)=>setName(e.target.value)} className="input mt-1" />
        </label>
        <label className="text-sm">Email
          <input value={user?.email ?? ""} disabled className="input mt-1 opacity-60" />
        </label>
        <label className="text-sm">Phone
          <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="input mt-1" />
        </label>
        <div className="text-xs text-ink-muted">
          Verification: {profile?.verified ? <span className="rounded bg-success-soft px-1.5 py-0.5 text-success">Verified</span> : "Unverified — contact support"}
        </div>
        <button disabled={busy} className="w-fit rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground disabled:opacity-60">Save changes</button>
      </form>
      <div className="mt-6 rounded-xl border border-dashed border-hairline bg-surface p-4">
        <div className="text-sm font-600 text-navy">Bootstrap admin</div>
        <p className="mt-1 text-xs text-ink-muted">If no admin exists yet, claim the first admin role for your account.</p>
        <button onClick={claimAdmin} className="mt-3 rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs font-600 text-navy hover:bg-surface-alt">Claim admin</button>
      </div>
      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%;display:block}`}</style>
    </div>
  );
}
