import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { useState } from "react";
import { toast } from "sonner";
import { getMessages, sendMessage } from "@/lib/backend";

export const Route = createFileRoute("/_authenticated/dashboard/messages")({
  component: Messages,
});

function Messages() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["messages", user?.id],
    enabled: !!user?.id,
    queryFn: getMessages,
  });
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await sendMessage({ body, subject: subject || undefined });
      setBody(""); setSubject("");
      qc.invalidateQueries({ queryKey: ["messages"] });
      toast.success("Message sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    }
  }
  return (
    <div>
      <h1 className="font-display text-3xl font-600 text-navy">Messages & Support</h1>
      <p className="mt-1 text-sm text-ink-muted">Send our team a message. Replies appear here.</p>
      <div className="mt-6 space-y-3">
        {rows.length === 0 && <p className="rounded-xl border border-dashed border-hairline bg-surface p-8 text-center text-sm text-ink-muted">No messages yet.</p>}
        {rows.map((m) => {
          const fromSupport = m.sender_id !== user?.id;
          return (
            <div key={m.id} className={`max-w-[80%] rounded-xl border border-hairline p-3 ${fromSupport ? "bg-surface" : "ml-auto bg-navy text-primary-foreground"}`}>
              {m.subject && <div className="text-xs font-600 opacity-80">{m.subject}</div>}
              <p className="text-sm">{m.body}</p>
              <div className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString()} · {fromSupport ? "Support" : "You"}</div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="mt-6 grid gap-3 rounded-xl border border-hairline bg-surface p-4">
        <input value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="Subject (optional)" className="input" />
        <textarea required value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Type your message…" className="input h-24 py-2" />
        <button className="w-fit rounded-md bg-navy px-5 py-2 text-sm font-600 text-primary-foreground">Send</button>
      </form>
      <style>{`.input{border-radius:6px;border:1px solid var(--hairline);background:var(--surface);padding:8px 10px;font-size:14px;width:100%}`}</style>
    </div>
  );
}
