import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, Mail, Search, Send, Users, Loader2 } from "lucide-react";
import {
  getAdminUsers,
  getAdminBroadcasts,
  createAdminBroadcast,
  type AdminUser,
} from "@/lib/backend";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/broadcasts")({
  component: BroadcastsAdmin,
});

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function BroadcastsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "broadcasts"],
    queryFn: getAdminBroadcasts,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: getAdminUsers,
  });

  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(true);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState<"all" | "selected">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const emailConfigured = data?.emailConfigured ?? false;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (users as AdminUser[]).filter((u) => u.status !== "deleted");
    if (!q) return list;
    return list.filter((u) => u.email.toLowerCase().includes(q));
  }, [users, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const u of filtered) next.add(u.id);
      return next;
    });
  }

  function clearSelected() {
    setSelected(new Set());
  }

  const targetLabel =
    audience === "all"
      ? `all active users`
      : `${selected.size} selected user${selected.size === 1 ? "" : "s"}`;

  async function send() {
    if (!title.trim()) return toast.error("Add a title");
    if (!inApp && !email) return toast.error("Choose at least one channel");
    if (audience === "selected" && selected.size === 0)
      return toast.error("Select at least one user");
    if (
      email &&
      !emailConfigured &&
      !confirm(
        "No email provider is configured yet — emails will be queued and not delivered until one is set up. Send anyway?",
      )
    )
      return;
    if (!confirm(`Send this announcement to ${targetLabel}?`)) return;

    setSending(true);
    try {
      const res = await createAdminBroadcast({
        title: title.trim(),
        body: body.trim() || undefined,
        subject: email ? subject.trim() || title.trim() : undefined,
        link: link.trim() || undefined,
        sendInApp: inApp,
        sendEmail: email,
        audience,
        userIds: audience === "selected" ? Array.from(selected) : undefined,
      });
      toast.success(
        `Sent to ${res.recipientCount} recipient${res.recipientCount === 1 ? "" : "s"}` +
          (inApp ? ` · ${res.inAppCount} in-app` : "") +
          (email ? ` · ${res.emailSentCount} email${res.emailConfigured ? "s" : "s queued"}` : ""),
      );
      setTitle("");
      setSubject("");
      setBody("");
      setLink("");
      setSelected(new Set());
      await qc.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
    } catch (err) {
      toast.error((err as Error).message ?? "Could not send announcement");
    } finally {
      setSending(false);
    }
  }

  const broadcasts = data?.broadcasts ?? [];

  return (
    <div>
      <AdminPageHeader
        title="Announcements"
        description="Send an update to your users — it appears in their in-app notifications, their email, or both."
      />

      {!emailConfigured && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Email is not set up.</strong> In-app notifications work now. Emails will be saved
          to the outbox but not delivered until an email provider (Resend or SMTP) is configured.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-hairline bg-surface p-5">
          <h2 className="font-display text-lg font-600 text-navy">New announcement</h2>

          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} />
              <Bell className="size-4 text-ink-muted" /> In-app notification
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} />
              <Mail className="size-4 text-ink-muted" /> Email
            </label>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-500 uppercase tracking-wider text-ink-muted">
                Title
              </span>
              <input
                className="input"
                maxLength={150}
                placeholder="e.g. New auctions added this week"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            {email && (
              <label className="block">
                <span className="mb-1 block text-xs font-500 uppercase tracking-wider text-ink-muted">
                  Email subject
                </span>
                <input
                  className="input"
                  maxLength={200}
                  placeholder="Defaults to the title"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-500 uppercase tracking-wider text-ink-muted">
                Message
              </span>
              <textarea
                className="input min-h-[140px] py-2"
                maxLength={8000}
                placeholder="Write your update…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-500 uppercase tracking-wider text-ink-muted">
                Link (optional)
              </span>
              <input
                className="input"
                placeholder="/auctions or https://…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-5 border-t border-hairline pt-4">
            <div className="mb-2 text-xs font-500 uppercase tracking-wider text-ink-muted">
              Audience
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="audience"
                  checked={audience === "all"}
                  onChange={() => setAudience("all")}
                />
                <Users className="size-4 text-ink-muted" /> All active users
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="audience"
                  checked={audience === "selected"}
                  onChange={() => setAudience("selected")}
                />
                Selected users ({selected.size})
              </label>
            </div>

            {audience === "selected" && (
              <div className="mt-3 rounded-lg border border-hairline">
                <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
                  <Search className="size-4 text-ink-muted" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Search users by email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 text-xs text-ink-muted">
                  <span>{selected.size} selected</span>
                  <div className="flex gap-3">
                    <button className="hover:text-navy" onClick={selectAllFiltered}>
                      Select all shown
                    </button>
                    <button className="hover:text-navy" onClick={clearSelected}>
                      Clear
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filtered.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 border-t border-hairline/60 px-3 py-2 text-sm hover:bg-surface-alt"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggle(u.id)}
                      />
                      <span className="text-ink">{u.email}</span>
                      {u.status !== "active" && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] uppercase text-amber-700">
                          {u.status}
                        </span>
                      )}
                    </label>
                  ))}
                  {!filtered.length && (
                    <div className="px-3 py-6 text-center text-sm text-ink-muted">
                      No users match.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <Button onClick={() => void send()} disabled={sending}>
              {sending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              {sending ? "Sending…" : "Send announcement"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-5">
          <div className="text-xs font-500 uppercase tracking-wider text-ink-muted">Preview</div>
          <div className="mt-3 rounded-lg border border-hairline bg-surface-alt p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-navy text-white">
                <Bell className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="font-600 text-navy">{title.trim() || "Announcement title"}</div>
                <div className="mt-0.5 whitespace-pre-wrap text-sm text-ink-muted">
                  {body.trim() || "Your message will appear here."}
                </div>
                {link.trim() && (
                  <div className="mt-1 text-xs font-500 text-navy">{link.trim()}</div>
                )}
              </div>
            </div>
          </div>
          {email && (
            <div className="mt-4">
              <div className="text-xs font-500 uppercase tracking-wider text-ink-muted">
                Email subject
              </div>
              <div className="mt-1 truncate rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm text-ink">
                {subject.trim() || title.trim() || "Announcement title"}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-600 text-navy">History</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-hairline bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-hairline bg-surface-alt text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-2">Sent</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Channels</th>
                <th className="px-4 py-2">Audience</th>
                <th className="px-4 py-2 text-right">Recipients</th>
                <th className="px-4 py-2 text-right">In-app</th>
                <th className="px-4 py-2 text-right">Email</th>
                <th className="px-4 py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b.id} className="border-b border-hairline/50 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-ink-muted">
                    {fmtDate(b.created_at)}
                  </td>
                  <td className="max-w-[280px] px-4 py-2">
                    <div className="truncate font-500 text-navy">{b.title}</div>
                    {b.body && <div className="truncate text-xs text-ink-muted">{b.body}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {b.send_in_app && <span className="mr-1">In-app</span>}
                    {b.send_email && <span>Email</span>}
                  </td>
                  <td className="px-4 py-2 text-xs capitalize">{b.audience}</td>
                  <td className="px-4 py-2 text-right">{b.recipient_count}</td>
                  <td className="px-4 py-2 text-right">{b.send_in_app ? b.in_app_count : "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {b.send_email ? (
                      <span
                        title={
                          b.email_configured ? "Delivered via provider" : "Queued (no provider)"
                        }
                      >
                        {b.email_sent_count}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-ink-muted">{b.sender_email ?? "—"}</td>
                </tr>
              ))}
              {!broadcasts.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-muted">
                    {isLoading ? "Loading…" : "No announcements sent yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`.input{border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:8px 10px;font-size:14px;width:100%}`}</style>
    </div>
  );
}
