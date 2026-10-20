import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  HelpCircle,
  LifeBuoy,
  ScrollText,
  Landmark,
  Gavel,
  Wallet,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useSiteContent } from "@/lib/site-content";
import { PageSeo } from "@/components/site/page-seo";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — Auction Ledger" },
      { name: "description", content: "Guides, tutorials, and answers for tax lien investors. Learn how auctions, bidding, redemptions and payouts work." },
      { property: "og:title", content: "Help Center — Auction Ledger" },
      { property: "og:description", content: "Guides, tutorials and answers for tax lien investors." },
    ],
  }),
  component: HelpCenter,
});

const ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  scroll: ScrollText,
  file: ScrollText,
  gavel: Gavel,
  wallet: Wallet,
  shield: ShieldCheck,
  landmark: Landmark,
  lifebuoy: LifeBuoy,
  chart: ScrollText,
  lock: ShieldCheck,
  globe: Landmark,
};

function HelpCenter() {
  const { eyebrow, title, subtitle, cats, seoTitle, seoDescription } = useSiteContent("help");
  return (
    <main className="bg-background pb-20">
      <PageSeo title={seoTitle} description={seoDescription} />
      <section className="border-b border-hairline bg-navy text-primary-foreground">
        <div className="container-tight py-16">
          <div className="flex items-center gap-2 text-gold"><HelpCircle className="size-5" /><span className="text-xs uppercase tracking-[0.24em]">{eyebrow}</span></div>
          <h1 className="mt-3 font-display text-4xl font-600">{title}</h1>
          <p className="mt-2 max-w-2xl text-primary-foreground/80">{subtitle}</p>
        </div>
      </section>
      <section className="container-tight py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cats.map(({ icon, title: catTitle, desc, to }) => {
            const Icon = ICONS[icon] ?? HelpCircle;
            return (
              <Link key={catTitle} to={to} className="rounded-xl border border-hairline bg-surface p-6 hover:border-navy">
                <div className="flex size-10 items-center justify-center rounded-md bg-navy/5 text-navy"><Icon className="size-5" /></div>
                <h2 className="mt-4 font-display text-lg font-600 text-navy">{catTitle}</h2>
                <p className="mt-2 text-sm text-ink-muted">{desc}</p>
              </Link>
            );
          })}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/faq" className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface px-4 py-2 text-sm font-600 text-navy hover:border-navy"><ScrollText className="size-4" /> FAQ</Link>
          <Link to="/glossary" className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface px-4 py-2 text-sm font-600 text-navy hover:border-navy"><BookOpen className="size-4" /> Glossary</Link>
          <Link to="/support" className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-600 text-primary-foreground"><LifeBuoy className="size-4" /> Contact support</Link>
        </div>
      </section>
    </main>
  );
}
