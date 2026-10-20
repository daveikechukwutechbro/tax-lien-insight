import { createFileRoute } from "@tanstack/react-router";
import { useSiteContent } from "@/lib/site-content";
import { PageSeo } from "@/components/site/page-seo";

export const Route = createFileRoute("/glossary")({
  head: () => ({
    meta: [
      { title: "Glossary — Auction Ledger" },
      { name: "description", content: "Plain-language definitions for tax lien investing terms: certificate, redemption, bid-down, over-the-counter, and more." },
      { property: "og:title", content: "Glossary — Auction Ledger" },
      { property: "og:description", content: "Key tax lien investing terms defined." },
    ],
  }),
  component: Glossary,
});

function Glossary() {
  const { eyebrow, title, terms, seoTitle, seoDescription } = useSiteContent("glossary");
  return (
    <main className="bg-background pb-20">
      <PageSeo title={seoTitle} description={seoDescription} />
      <section className="border-b border-hairline bg-surface">
        <div className="container-tight py-12">
          <span className="text-xs uppercase tracking-[0.24em] text-ink-muted">{eyebrow}</span>
          <h1 className="mt-2 font-display text-4xl font-600 text-navy">{title}</h1>
        </div>
      </section>
      <section className="container-tight py-10">
        <dl className="grid gap-4 md:grid-cols-2">
          {terms.map((t) => (
            <div key={t.term} className="rounded-xl border border-hairline bg-surface p-5">
              <dt className="font-display font-600 text-navy">{t.term}</dt>
              <dd className="mt-1 text-sm text-ink">{t.def}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
