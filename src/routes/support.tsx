import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Clock, MessageSquare, Send, CheckCircle2, Phone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Contact Support — Auction Ledger" },
      { name: "description", content: "Reach our support team by email or live message. Get help with bids, funds, certificates, and redemption pay-outs." },
      { property: "og:title", content: "Contact Support — Auction Ledger" },
      { property: "og:description", content: "Email or message the Auction Ledger support team for help with your account, bids, funds and certificates." },
    ],
  }),
  component: SupportPage,
});

const SUPPORT_EMAIL = "auctionledger@gmail.com";

function SupportPage() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Bidding & auctions");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in your name, email, and a message.");
      return;
    }
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`,
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[Support] ${topic}`)}&body=${body}`;
    setSent(true);
    toast.success("Opening your email app — press send and we'll get back to you within 24 hours.");
  }

  return (
    <main className="bg-background pb-20">
      <section className="border-b border-hairline bg-navy text-primary-foreground">
        <div className="container-tight py-14">
          <div className="flex items-center gap-2 text-gold">
            <Mail className="size-5" />
            <span className="text-xs uppercase tracking-[0.24em]">Contact Support</span>
          </div>
          <h1 className="mt-3 font-display text-4xl font-600">We're here to help</h1>
          <p className="mt-2 max-w-2xl text-primary-foreground/80">
            Questions about bidding, your funds, certificates, or a redemption pay-out?
            Send us an email and a member of the team will get back to you within one business day.
          </p>
        </div>
      </section>

      <section className="container-tight py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Contact form */}
          <div className="rounded-xl border border-hairline bg-surface p-6">
            <h2 className="font-display text-xl font-600 text-navy">Send us a message</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Fill this out and your email app will open with the message ready to send.
            </p>

            {sent ? (
              <div className="mt-8 rounded-xl border border-success/30 bg-success-soft p-6 text-center">
                <CheckCircle2 className="mx-auto size-10 text-success" />
                <h3 className="mt-3 font-display text-lg font-600 text-navy">Almost done!</h3>
                <p className="mt-1 text-sm text-ink">
                  Your email app should now be open with your message filled in. Just press{" "}
                  <strong>Send</strong> and our team will reply to <strong>{email || SUPPORT_EMAIL}</strong>{" "}
                  within 24 hours.
                </p>
                <button
                  type="button"
                  onClick={() => { setSent(false); setName(""); setEmail(""); setMessage(""); }}
                  className="mt-4 rounded-md border border-hairline px-4 py-2 text-sm font-600 text-navy hover:border-navy"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Your name">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Investor"
                      className="h-10 w-full rounded-md border border-hairline bg-surface px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                    />
                  </Field>
                  <Field label="Your email">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-10 w-full rounded-md border border-hairline bg-surface px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                    />
                  </Field>
                </div>
                <Field label="Topic">
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="h-10 w-full rounded-md border border-hairline bg-surface px-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                  >
                    <option>Bidding & auctions</option>
                    <option>Adding / withdrawing funds</option>
                    <option>Certificates & redemption</option>
                    <option>Account & profile</option>
                    <option>KYC / identity verification</option>
                    <option>Technical issue</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="Message">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Tell us how we can help — please include any relevant property address, parcel ID, or auction name."
                    className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
                  />
                </Field>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-navy px-6 text-sm font-600 text-primary-foreground shadow-sm transition-colors hover:bg-navy-deep"
                >
                  <Send className="size-4" /> Send message
                </button>
              </form>
            )}
          </div>

          {/* Contact info */}
          <aside className="space-y-4">
            <InfoCard
              icon={<Mail className="size-5" />}
              title="Email us"
              lines={[SUPPORT_EMAIL, "We reply within 24 hours, usually much faster."]}
            />
            <InfoCard
              icon={<Clock className="size-5" />}
              title="Support hours"
              lines={["Mon – Fri, 9am – 6pm ET", "Weekend messages are answered on the next business day."]}
            />
            <InfoCard
              icon={<MessageSquare className="size-5" />}
              title="Already registered?"
              lines={["Signed-in users can also message us from their dashboard."]}
              href="/dashboard/messages"
            />
            <InfoCard
              icon={<Phone className="size-5" />}
              title="Urgent auction issue?"
              lines={["Bids are binding. If you believe an error occurred, email us immediately and mention 'URGENT'.", "Do not attempt to cancel a bid yourself."]}
            />
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-600 uppercase tracking-wider text-ink-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function InfoCard({
  icon,
  title,
  lines,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  lines: string[];
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-navy/5 text-navy">{icon}</div>
        <h3 className="font-display text-base font-600 text-navy">{title}</h3>
      </div>
      <div className="mt-3 space-y-1">
        {lines.map((l, i) => (
          <p key={i} className={i === 0 ? "text-sm font-500 text-ink" : "text-xs text-ink-muted"}>{l}</p>
        ))}
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} className="block rounded-xl border border-hairline bg-surface p-5 transition-colors hover:border-navy">
        {body}
      </a>
    );
  }
  return <div className="rounded-xl border border-hairline bg-surface p-5">{body}</div>;
}