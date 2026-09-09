import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { profileQuery } from "@/lib/queries/dashboard";
import { updateProfile } from "@/lib/backend";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, ShieldCheck, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: Profile,
});

async function fileToAvatar(file: File): Promise<string> {
  const raw = await file.arrayBuffer();
  const maxBytes = 400 * 1024;
  if (raw.byteLength > 2 * 1024 * 1024) throw new Error("Image must be under 2 MB");
  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  if (raw.byteLength <= maxBytes) {
    const b64 = btoa(String.fromCharCode(...new Uint8Array(raw)));
    return `data:${mime};base64,${b64}`;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Could not read image"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    const size = 256;
    const scale = Math.min(size / img.width, size / img.height, 1);
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL(mime, 0.85);
    if (dataUrl.length > maxBytes * 1.4) return fileToAvatar(new File([file], file.name, { type: mime }));
    return dataUrl;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Profile() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user?.id));

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("US");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAddressLine(profile.address_line ?? "");
      setCity(profile.city ?? "");
      setState(profile.state ?? "");
      setPostalCode(profile.postal_code ?? "");
      setCountry(profile.country ?? "US");
      setAvatar(profile.avatar ?? null);
    }
  }, [profile]);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToAvatar(file);
      const updated = await updateProfile({ avatarData: dataUrl });
      setAvatar(updated.avatar);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function removePhoto() {
    setBusy(true);
    try {
      const updated = await updateProfile({ avatarData: "" });
      setAvatar(updated.avatar);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Photo removed");
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await updateProfile({
        fullName: name,
        phone,
        addressLine,
        city,
        state: state.toUpperCase(),
        postalCode,
        country,
      });
      if (updated && updated.fullName) setName(updated.fullName);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const initials =
    name.trim()
      ? name.trim().split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
      : (user?.email ?? "?").slice(0, 2).toUpperCase();

  const kycStatus = profile?.kyc_status ?? "not_started";

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-600 text-navy">Profile Settings</h1>
      <p className="mt-1 text-sm text-ink-muted">Manage your personal information, photo, and address.</p>

      <div className="mt-6 rounded-xl border border-hairline bg-surface p-5">
        <div className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt="Profile" className="size-20 rounded-full object-cover" />
          ) : (
            <span className="grid size-20 place-items-center rounded-full bg-navy text-lg font-600 text-gold">
              {initials}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => document.getElementById("avatar-input")?.click()}
              className="inline-flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-600 text-primary-foreground disabled:opacity-60"
            >
              <Camera className="size-4" /> {avatar ? "Change photo" : "Upload photo"}
            </button>
            {avatar && (
              <button
                type="button"
                disabled={busy}
                onClick={removePhoto}
                className="rounded-md border border-hairline bg-surface px-4 py-2 text-sm font-600 text-ink hover:text-destructive disabled:opacity-60"
              >
                Remove
              </button>
            )}
            <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-muted">JPEG or PNG up to 2 MB. Photo is stored on your account.</p>
      </div>

      <form onSubmit={save} className="mt-4 grid gap-3 rounded-xl border border-hairline bg-surface p-5 sm:grid-cols-2">
        <label className="text-sm">Full name
          <input value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" />
        </label>
        <label className="text-sm">Email
          <input value={user?.email ?? ""} disabled className="input mt-1 opacity-60" />
        </label>
        <label className="text-sm">Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input mt-1" />
        </label>
        <label className="text-sm">Country
          <input value={country} onChange={(e) => setCountry(e.target.value)} className="input mt-1" />
        </label>
        <label className="text-sm sm:col-span-2">Street address
          <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} className="input mt-1" />
        </label>
        <label className="text-sm">City
          <input value={city} onChange={(e) => setCity(e.target.value)} className="input mt-1" />
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="flex items-center gap-2">State
            <input maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} className="input mt-1 uppercase" />
          </span>
        </label>
        <label className="text-sm">Postal code
          <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="input mt-1" />
        </label>
        <div className="flex items-end justify-between gap-3 sm:col-span-2">
          <div className="flex items-center gap-2 rounded-lg bg-surface-alt px-3 py-2">
            {kycStatus === "verified" ? (
              <>
                <BadgeCheck className="size-4 text-success" />
                <span className="text-xs font-600 text-success">Identity verified</span>
              </>
            ) : (
              <>
                <ShieldCheck className="size-4 text-gold" />
                <span className="text-xs text-ink">
                  Identity: <span className="capitalize">{kycStatus.replace("_", " ")}</span>
                </span>
                <Link to="/dashboard/verify" className="text-xs font-600 text-navy underline">Verify now</Link>
              </>
            )}
          </div>
          <button disabled={busy} className="rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground disabled:opacity-60">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <style>{`.input{height:36px;border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:0 10px;font-size:14px;width:100%;display:block}`}</style>
    </div>
  );
}