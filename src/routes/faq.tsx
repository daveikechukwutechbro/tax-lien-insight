import { createFileRoute } from "@tanstack/react-router";
import { useSiteContent } from "@/lib/site-content";
import { PageSeo } from "@/components/site/page-seo";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Auction Ledger" },
      { name: "description", content: "Frequently asked questions about tax lien investing, bidding, deposits, redemptions and payouts on Auction Ledger." },
      { property: "og:title", content: "FAQ — Auction Ledger" },
      { property: "og:description", content: "Answers to the most common questions from tax lien investors." },
    ],
  }),
  component: FAQ,
});

function FAQ() {
  const { eyebrow, title, items, seoTitle, seoDescription } = useSiteContent("faq");
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
        <div className="space-y-3">
          {items.map((it, i) => (
            <details key={`${it.q}-${i}`} className="group rounded-xl border border-hairline bg-surface p-5 open:border-navy">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-600 text-navy">{it.q}</span>
                <span className="text-ink-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink">{it.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}