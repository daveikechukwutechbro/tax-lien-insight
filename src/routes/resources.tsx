import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Chicago TaxLien Auctions" },
      { name: "description", content: "Investor guides, state interest rate schedules, and glossary for tax lien investing." },
      { property: "og:title", content: "Tax Lien Resources" },
      { property: "og:description", content: "Guides and reference material for tax lien investors." },
      { property: "og:url", content: "/resources" },
    ],
    links: [{ rel: "canonical", href: "/resources" }],
  }),
  component: ResourcesPage,
});

const sections = [
  {
    title: "Getting Started",
    items: [
      { name: "What is a Tax Lien?", desc: "Learn the fundamentals of tax lien investing." },
      { name: "How Auctions Work", desc: "Understand the bid-down interest rate process." },
      { name: "Registration Guide", desc: "Step-by-step registration walkthrough." },
    ],
  },
  {
    title: "Guides & Tutorials",
    items: [
      { name: "Due Diligence Checklist", desc: "What to research before you bid." },
      { name: "Property Assessment", desc: "How to evaluate a tax lien property." },
      { name: "Redemption Process", desc: "What happens after you win." },
    ],
  },
  {
    title: "Forms & Documents",
    items: [
      { name: "W-9 Tax Form", desc: "Required for U.S. bidders." },
      { name: "Bidder Agreement", desc: "Terms of participation." },
      { name: "Power of Attorney", desc: "For entity bidders." },
    ],
  },
  {
    title: "State Information",
    items: [
      { name: "Florida", desc: "Up to 18% max interest, 2-year redemption." },
      { name: "Illinois", desc: "18% max, 2.5-year redemption." },
      { name: "Arizona", desc: "16% max, 3-year redemption." },
    ],
  },
  {
    title: "FAQs",
    items: [
      { name: "Investment Risks", desc: "Common risks and how to mitigate them." },
      { name: "Payment Methods", desc: "Accepted payment options at close." },
      { name: "Support", desc: "How to reach our team." },
    ],
  },
];

function ResourcesPage() {
  return (
    <div className="container-tight py-10">
      <h1 className="font-display text-4xl font-600 text-navy">Resources</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">Everything you need to invest confidently in tax lien certificates — guides, forms, state schedules, and answers.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <section key={s.title} className="rounded-xl border border-hairline bg-surface p-5">
            <h2 className="font-display text-lg font-600 text-navy">{s.title}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {s.items.map((it) => (
                <li key={it.name} className="border-b border-hairline pb-2 last:border-0">
                  <div className="font-500 text-navy">{it.name}</div>
                  <div className="text-xs text-ink-muted">{it.desc}</div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8"><Link to="/" className="text-sm font-500 text-navy underline underline-offset-4">← Back home</Link></div>
    </div>
  );
}