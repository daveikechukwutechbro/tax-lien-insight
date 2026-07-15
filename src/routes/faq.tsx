import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — ChicagoTaxLien" },
      { name: "description", content: "Frequently asked questions about tax lien investing, bidding, deposits, redemptions and payouts on ChicagoTaxLien." },
      { property: "og:title", content: "FAQ — ChicagoTaxLien" },
      { property: "og:description", content: "Answers to the most common questions from tax lien investors." },
    ],
  }),
  component: FAQ,
});

const items: { q: string; a: string }[] = [
  { q: "What is a tax lien certificate?", a: "When a property owner fails to pay property taxes, the county sells the debt to an investor as a certificate. The investor is paid back with interest when the owner redeems, or may pursue the property after the redemption period." },
  { q: "How does bid-down interest work?", a: "Auctions start at a maximum statutory rate (often 18%). Bidders lower the rate they are willing to accept. The lowest rate wins the lien." },
  { q: "How much do I need to deposit to bid?", a: "Deposit requirements are set per auction. You must fund your bidding balance before the registration deadline shown on each auction page." },
  { q: "How do I add funds?", a: "From your dashboard, open Account Funds and submit a deposit request. We currently accept ACH, wire transfer, and Zelle. Deposits are credited after admin verification." },
  { q: "How do I withdraw funds?", a: "Submit a withdrawal request from Account Funds. Withdrawals are typically processed within 3 business days after approval." },
  { q: "What happens if I win a lien?", a: "The winning bid amount is debited from your balance. The certificate is issued in your name. You collect principal plus your winning interest rate when the owner redeems." },
  { q: "What is the redemption period?", a: "The window during which the property owner may pay back the lien plus interest. Length varies by jurisdiction — commonly 12 to 36 months." },
  { q: "What if the lien is not redeemed?", a: "You may pursue foreclosure or deed application per your jurisdiction's rules. ChicagoTaxLien surfaces upcoming deadlines in your dashboard." },
  { q: "Are tax lien investments guaranteed?", a: "No. Returns depend on redemption, jurisdiction rules, and property condition. Do your own due diligence on every property." },
  { q: "Can I cancel a bid?", a: "Bids are binding once placed. Contact support immediately if you believe a bid was placed in error." },
];

function FAQ() {
  return (
    <main className="bg-background pb-20">
      <section className="border-b border-hairline bg-surface">
        <div className="container-tight py-12">
          <span className="text-xs uppercase tracking-[0.24em] text-ink-muted">Support</span>
          <h1 className="mt-2 font-display text-4xl font-600 text-navy">Frequently asked questions</h1>
        </div>
      </section>
      <section className="container-tight py-10">
        <div className="space-y-3">
          {items.map((it) => (
            <details key={it.q} className="group rounded-xl border border-hairline bg-surface p-5 open:border-navy">
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