import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, HelpCircle, LifeBuoy, ScrollText, Landmark, Gavel, Wallet, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — ChicagoTaxLien" },
      { name: "description", content: "Guides, tutorials, and answers for tax lien investors. Learn how auctions, bidding, redemptions and payouts work." },
      { property: "og:title", content: "Help Center — ChicagoTaxLien" },
      { property: "og:description", content: "Guides, tutorials and answers for tax lien investors." },
    ],
  }),
  component: HelpCenter,
});

const cats: { icon: typeof BookOpen; title: string; desc: string; to: string }[] = [
  { icon: BookOpen, title: "Getting Started", desc: "Create an account, verify identity, and fund your bidding balance.", to: "/how-it-works" },
  { icon: Gavel, title: "Bidding & Auctions", desc: "How interest-rate bid-down works, registration deadlines, and winning strategies.", to: "/resources" },
  { icon: Wallet, title: "Payments & Funds", desc: "Accepted methods, deposit approvals, withdrawals, and processing times.", to: "/faq" },
  { icon: ShieldCheck, title: "Redemption & Payouts", desc: "How redemption works, timelines, and how you get paid.", to: "/glossary" },
  { icon: Landmark, title: "Certificates & Titles", desc: "Certificate issuance, foreclosure timelines, and jurisdictional rules.", to: "/resources" },
  { icon: LifeBuoy, title: "Contact Support", desc: "Reach the ChicagoTaxLien support team directly from your dashboard.", to: "/dashboard/messages" },
];

function HelpCenter() {
  return (
    <main className="bg-background pb-20">
      <section className="border-b border-hairline bg-navy text-primary-foreground">
        <div className="container-tight py-16">
          <div className="flex items-center gap-2 text-gold"><HelpCircle className="size-5" /><span className="text-xs uppercase tracking-[0.24em]">Help Center</span></div>
          <h1 className="mt-3 font-display text-4xl font-600">How can we help?</h1>
          <p className="mt-2 max-w-2xl text-primary-foreground/80">Everything you need to bid confidently, from your first deposit through redemption payouts.</p>
        </div>
      </section>
      <section className="container-tight py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cats.map(({ icon: Icon, title, desc, to }) => (
            <Link key={title} to={to} className="rounded-xl border border-hairline bg-surface p-6 hover:border-navy">
              <div className="flex size-10 items-center justify-center rounded-md bg-navy/5 text-navy"><Icon className="size-5" /></div>
              <h2 className="mt-4 font-display text-lg font-600 text-navy">{title}</h2>
              <p className="mt-2 text-sm text-ink-muted">{desc}</p>
            </Link>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/faq" className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface px-4 py-2 text-sm font-600 text-navy hover:border-navy"><ScrollText className="size-4" /> FAQ</Link>
          <Link to="/glossary" className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface px-4 py-2 text-sm font-600 text-navy hover:border-navy"><BookOpen className="size-4" /> Glossary</Link>
          <Link to="/dashboard/messages" className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-600 text-primary-foreground"><LifeBuoy className="size-4" /> Contact support</Link>
        </div>
      </section>
    </main>
  );
}