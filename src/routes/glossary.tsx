import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/glossary")({
  head: () => ({
    meta: [
      { title: "Glossary — ChicagoTaxLien" },
      { name: "description", content: "Plain-language definitions for tax lien investing terms: certificate, redemption, bid-down, over-the-counter, and more." },
      { property: "og:title", content: "Glossary — ChicagoTaxLien" },
      { property: "og:description", content: "Key tax lien investing terms defined." },
    ],
  }),
  component: Glossary,
});

const terms: { term: string; def: string }[] = [
  { term: "Assignment", def: "Transfer of a tax lien certificate from one investor to another." },
  { term: "Bid-down", def: "An auction model where bidders compete by lowering the interest rate they will accept." },
  { term: "Certificate", def: "The instrument issued to the winning bidder representing the tax debt owed by the property owner." },
  { term: "Delinquent taxes", def: "Property taxes that were not paid by the statutory due date." },
  { term: "Deed application", def: "The formal request to convert an unredeemed lien into ownership of the property." },
  { term: "Face amount", def: "Original tax debt plus statutory penalties and fees." },
  { term: "Foreclosure", def: "Legal process to take title of the property when the lien is not redeemed." },
  { term: "Interest rate", def: "The annual rate the property owner must pay to redeem the lien." },
  { term: "Over-the-counter (OTC)", def: "Liens unsold at auction that may be purchased directly from the county at a fixed rate." },
  { term: "Parcel ID", def: "Unique identifier assigned to a property by the county assessor." },
  { term: "Premium bid", def: "An auction model where bidders offer amounts over the tax debt; premium is not returned on redemption." },
  { term: "Redemption", def: "The property owner's payment of the lien plus interest, ending the investor's claim." },
  { term: "Redemption period", def: "Statutory window in which the owner may redeem — commonly 12–36 months." },
  { term: "Subsequent taxes (subs)", def: "Later-year taxes paid by the lien holder to protect their position." },
  { term: "Tax sale", def: "Public auction of tax lien certificates or tax deeds held by a county." },
];

function Glossary() {
  return (
    <main className="bg-background pb-20">
      <section className="border-b border-hairline bg-surface">
        <div className="container-tight py-12">
          <span className="text-xs uppercase tracking-[0.24em] text-ink-muted">Reference</span>
          <h1 className="mt-2 font-display text-4xl font-600 text-navy">Glossary of tax lien terms</h1>
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