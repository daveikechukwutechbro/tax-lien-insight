import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  ScrollText,
  Landmark,
  HelpCircle,
  ChevronDown,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { useSiteContent } from "@/lib/site-content";
import { PageSeo } from "@/components/site/page-seo";
import type { GuideItem } from "@/lib/content-data";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Auction Ledger" },
      { name: "description", content: "Investor guides, state interest rate schedules, and glossary for tax lien investing." },
      { property: "og:title", content: "Tax Lien Resources" },
      { property: "og:description", content: "Guides and reference material for tax lien investors." },
      { property: "og:url", content: "/resources" },
    ],
    links: [{ rel: "canonical", href: "/resources" }],
  }),
  component: ResourcesPage,
});

const ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  scroll: ScrollText,
  file: FileText,
  landmark: Landmark,
  help: HelpCircle,
};

const splitParagraphs = (s: string) =>
  (s ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

const splitBullets = (s: string) =>
  (s ?? "")
    .split("\n")
    .map((b) => b.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);

function ResourcesPage() {
  const { eyebrow, title, subtitle, sections, guides, seoTitle, seoDescription } =
    useSiteContent("resources");
  return (
    <main className="bg-background pb-20">
      <PageSeo title={seoTitle} description={seoDescription} />
      <section className="border-b border-hairline bg-navy text-primary-foreground">
        <div className="container-tight py-14">
          <div className="flex items-center gap-2 text-gold">
            <BookOpen className="size-5" />
            <span className="text-xs uppercase tracking-[0.24em]">{eyebrow}</span>
          </div>
          <h1 className="mt-3 font-display text-4xl font-600">{title}</h1>
          <p className="mt-2 max-w-2xl text-primary-foreground/80">{subtitle}</p>
        </div>
      </section>

      <section className="container-tight py-10">
        <div className="space-y-8">
          {sections.map((s) => {
            const Icon = ICONS[s.icon] ?? BookOpen;
            const items = (guides as GuideItem[]).filter((g) => g.section === s.title);
            return (
              <div key={s.title} className="rounded-xl border border-hairline bg-surface p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy">
                    <Icon className="size-6" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-600 text-navy">{s.title}</h2>
                    <p className="mt-0.5 text-sm text-ink-muted">{s.subtitle}</p>
                  </div>
                </div>

                <div className="mt-5 divide-y divide-hairline">
                  {items.map((it) => (
                    <details key={it.title} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4">
                        <div>
                          <div className="font-600 text-navy group-open:text-navy">{it.title}</div>
                          <div className="text-sm text-ink-muted">{it.summary}</div>
                        </div>
                        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-hairline text-ink-muted transition-transform group-open:rotate-180 group-open:border-navy group-open:text-navy">
                          <ChevronDown className="size-4" />
                        </span>
                      </summary>
                      <div className="pb-5">
                        {splitParagraphs(it.body).map((p, i) => (
                          <p key={i} className="text-sm leading-relaxed text-ink">{p}</p>
                        ))}
                        {splitBullets(it.bullets).length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {splitBullets(it.bullets).map((b, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-navy" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {it.linkTo && it.linkLabel && (
                          <Link
                            to={it.linkTo}
                            className="mt-4 inline-flex items-center gap-1.5 text-sm font-600 text-navy hover:underline"
                          >
                            {it.linkLabel} <span aria-hidden>→</span>
                          </Link>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink icon={<BookOpen className="size-5" />} title="Glossary" desc="Every tax lien term, explained in plain English." to="/glossary" />
          <QuickLink icon={<HelpCircle className="size-5" />} title="FAQ" desc="More questions? Browse the full list of answers." to="/faq" />
          <QuickLink icon={<Landmark className="size-5" />} title="Interest rates by state" desc="Statutory rates for every US state and DC." to="/rates" />
        </div>

        <div className="mt-8"><Link to="/" className="text-sm font-500 text-navy underline underline-offset-4">← Back home</Link></div>
      </section>
    </main>
  );
}

function QuickLink({
  icon,
  title,
  desc,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: string;
}) {
  return (
    <Link to={to} className="flex items-start gap-3 rounded-xl border border-hairline bg-surface p-5 transition-colors hover:border-navy">
      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-navy/5 text-navy">{icon}</div>
      <div>
        <div className="font-600 text-navy">{title}</div>
        <div className="mt-0.5 text-xs text-ink-muted">{desc}</div>
      </div>
    </Link>
  );
}
