import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Globe, Lock, ShieldCheck, BarChart3, ArrowRight, type LucideIcon } from "lucide-react";
import { useSiteContent, renderBold } from "@/lib/site-content";
import { PageSeo } from "@/components/site/page-seo";

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

const ICONS: Record<string, LucideIcon> = {
  lock: Lock,
  shield: ShieldCheck,
  chart: BarChart3,
  globe: Globe,
};

function AboutPage() {
  const {
    eyebrow,
    title,
    intro,
    stats,
    investorsTitle,
    investorsBody,
    values,
    whyTitle,
    whyBodies,
    chooseTitle,
    diffs,
    ctaTitle,
    ctaSubtitle,
    seoTitle,
    seoDescription,
  } = useSiteContent("about");

  return (
    <main className="bg-background pb-20">
      <PageSeo title={seoTitle} description={seoDescription} />
      <div className="container-tight">
        {/* Hero */}
        <section className="pt-20 pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-navy/5 px-3 py-1 text-xs font-600 uppercase tracking-wider text-navy">
              <Building2 className="size-3.5" />
              {eyebrow}
            </div>
            <h1 className="mt-4 font-display text-4xl font-600 text-navy sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-muted">{intro}</p>
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
          <h2 className="font-display text-3xl font-600 text-navy">{investorsTitle}</h2>
          <p className="mt-3 max-w-2xl text-ink-muted leading-7">{investorsBody}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {values.map((v) => {
              const Icon = ICONS[v.icon] ?? Lock;
              return (
                <div key={v.title} className="rounded-xl border border-hairline bg-surface p-6">
                  <div className="grid size-10 place-items-center rounded-lg bg-navy/5 text-navy">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-600 text-navy">{v.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{v.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Why this matters */}
        <section className="mt-20 rounded-2xl border border-gold-soft bg-gold-soft/30 p-8 sm:p-12">
          <h2 className="font-display text-3xl font-600 text-navy">{whyTitle}</h2>
          <div className="mt-5 max-w-2xl space-y-4 text-ink leading-7">
            {whyBodies.map((p, i) => (
              <p key={i}>{renderBold(p.text)}</p>
            ))}
          </div>
        </section>

        {/* Trust / differentiators */}
        <section className="mt-20">
          <h2 className="font-display text-3xl font-600 text-navy">{chooseTitle}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {diffs.map((d) => (
              <div key={d.title}>
                <div className="font-display text-lg font-600 text-navy">{d.title}</div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-20 text-center">
          <h2 className="font-display text-3xl font-600 text-navy">{ctaTitle}</h2>
          <p className="mt-3 text-ink-muted">{ctaSubtitle}</p>
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
