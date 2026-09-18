import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Globe, Lock, ShieldCheck, BarChart3, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Auction Ledger" },
      { name: "description", content: "Auction Ledger is the transparent multi-state marketplace connecting investors with county tax lien auctions across the United States." },
      { property: "og:title", content: "About Auction Ledger" },
      { property: "og:description", content: "Transparent, rules-based tax lien marketplace. Multi-state access. Real-time data." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const stats = [
  { value: "12+", label: "Counties" },
  { value: "150+", label: "Properties per auction" },
  { value: "18%", label: "Max statutory yield" },
  { value: "24/7", label: "Marketplace access" },
];

const values = [
  { icon: Lock, title: "Transparent Pricing", body: "Every lien, every property, every interest rate is visible before you place a bid. No hidden fees, no surprise terms — just the data you need to make confident decisions." },
  { icon: ShieldCheck, title: "Verified Investors Only", body: "Every bidder completes identity verification before the auction opens. That means you're bidding alongside serious, vetted participants — not anonymous accounts." },
  { icon: BarChart3, title: "Real-Time Data", body: "Current interest rates, assessed property values, redemption periods, and auction status — updated live across every participating jurisdiction." },
  { icon: Globe, title: "Multi-State Access", body: "Browse, research, and bid across jurisdictions from a single dashboard. No more jumping between county websites with different rules and formats." },
];

function AboutPage() {
  return (
    <main className="bg-background pb-20">
      <div className="container-tight">
        {/* Hero */}
        <section className="pt-20 pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-navy/5 px-3 py-1 text-xs font-600 uppercase tracking-wider text-navy">
              <Building2 className="size-3.5" />
              About Auction Ledger
            </div>
            <h1 className="mt-4 font-display text-4xl font-600 text-navy sm:text-5xl">
              The marketplace tax lien investors actually want to use.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-muted">
              Auction Ledger was built to solve a simple problem: tax lien auctions are a powerful
              investment opportunity, but the process is fragmented, opaque, and stuck behind
              outdated county portals. We bring every participating jurisdiction together on one
              platform — so you can research, compare, and invest with confidence.
            </p>
          </div>
        </section>

        {/* Stats band */}
        <section className="rounded-2xl border border-hairline bg-surface p-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl font-700 text-navy">{s.value}</div>
                <div className="mt-1 text-sm text-ink-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it helps investors */}
        <section className="mt-20">
          <h2 className="font-display text-3xl font-600 text-navy">Built for serious investors</h2>
          <p className="mt-3 max-w-2xl text-ink-muted leading-7">
            Whether you're a first-time lien buyer or managing a portfolio across multiple states,
            Auction Ledger gives you the tools and transparency to move fast and invest wisely.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="rounded-xl border border-hairline bg-surface p-6">
                <div className="grid size-10 place-items-center rounded-lg bg-navy/5 text-navy">
                  <v.icon className="size-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 font-display text-lg font-600 text-navy">{v.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why this matters */}
        <section className="mt-20 rounded-2xl border border-gold-soft bg-gold-soft/30 p-8 sm:p-12">
          <h2 className="font-display text-3xl font-600 text-navy">Why tax liens?</h2>
          <div className="mt-5 max-w-2xl space-y-4 text-ink leading-7">
            <p>
              When a property owner falls behind on taxes, the county sells the debt to an investor
              as a tax lien certificate. In return, the investor funds the county's operations — and
              earns a statutory interest rate when the owner redeems the property.
            </p>
            <p>
              It's one of the few alternative investments that is
              <strong> secured by real estate</strong>, governed by state law, and backed by the
              county's own collection process. Returns are set by statute — not by market
              speculation — giving you a predictable, rules-based yield.
            </p>
            <p>
              Auction Ledger simply makes it easier to find, evaluate, and invest in those
              opportunities — across state lines, in one place.
            </p>
          </div>
        </section>

        {/* Trust / differentiators */}
        <section className="mt-20">
          <h2 className="font-display text-3xl font-600 text-navy">Why investors choose Auction Ledger</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div>
              <div className="font-display text-lg font-600 text-navy">County-verified data</div>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Property details, assessed values, and lien records come directly from participating
                county offices — not scraped or estimated by third parties.
              </p>
            </div>
            <div>
              <div className="font-display text-lg font-600 text-navy">Full bid history</div>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                See starting rates, current rates, and historical results for every lot. Know
                exactly what you're bidding on and what comparable lots have yielded.
              </p>
            </div>
            <div>
              <div className="font-display text-lg font-600 text-navy">Watchlist and alerts</div>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Track the properties you're interested in. Get notified when auctions go live, when
                bidding opens, and when results are finalized — so you never miss a window.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 text-center">
          <h2 className="font-display text-3xl font-600 text-navy">Ready to invest?</h2>
          <p className="mt-3 text-ink-muted">Create a free bidder account and start researching the next auction.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-sm font-600 text-primary-foreground hover:bg-navy-deep">
              Get started
              <ArrowRight className="size-4" />
            </Link>
            <Link to="/how-it-works" className="inline-flex items-center rounded-md border border-navy/20 bg-surface px-6 py-3 text-sm font-600 text-navy hover:border-navy">
              How it works
            </Link>
          </div>
        </section>

        <div className="mt-16">
          <Link to="/" className="text-sm font-500 text-navy underline underline-offset-4">← Back home</Link>
        </div>
      </div>
    </main>
  );
}