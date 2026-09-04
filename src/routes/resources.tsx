import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  ScrollText,
  Landmark,
  HelpCircle,
  ChevronDown,
  Download,
  FileText,
} from "lucide-react";

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

type GuideItem = {
  title: string;
  summary: string;
  body: string[];
  bullets?: string[];
  link?: { to: string; label: string };
};

type GuideSection = {
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  items: GuideItem[];
};

const sections: GuideSection[] = [
  {
    icon: BookOpen,
    title: "Getting Started",
    subtitle: "The fundamentals every tax lien investor needs to know.",
    items: [
      {
        title: "What is a Tax Lien?",
        summary: "Learn the fundamentals of tax lien investing and how the market works.",
        body: [
          "When a property owner fails to pay their property taxes, the local taxing authority places a lien on the property for the unpaid amount plus penalties and interest. To recover that money, the county auctions the right to collect — the tax lien certificate — to private investors.",
          "When you win a lien certificate, you are effectively lending the county's money to the property owner at a fixed statutory rate. When the owner pays their overdue taxes (plus the winning interest rate), the county pays you back: your principal plus interest. That redemption is the primary way tax lien investors earn returns.",
        ],
        bullets: [
          "Secured by real estate — the property itself backs the debt.",
          "Statutory interest is often well above bank rates (commonly 12–18%).",
          "Should the property never be redeemed, you may be able to pursue foreclosure or a quit-claim mortgage deed, potentially acquiring the property itself.",
          "Entry costs are often low — many certificates are bid for hundreds of dollars, not thousands.",
        ],
        link: { to: "/faq", label: "Read the FAQ" },
      },
      {
        title: "How Auctions Work",
        summary: "Understand the bid-down interest rate process used in most tax lien sales.",
        body: [
          "Most county tax lien auctions are interest-rate auctions. The county sets a maximum statutory interest rate (for example, 18% in Illinois or Florida). Bidders then compete by bidding the interest rate DOWN — the lowest rate a bidder is willing to accept wins the certificate.",
          "That means the winning bidder accepts a lower return in exchange for beating the competition. If nobody bids down, the certificate is awarded at the maximum rate to the first registered bidder.",
        ],
        bullets: [
          "Registration closes before the auction — deposits often required.",
          "You compete on rate, not price: lowest bid-down rate wins.",
          "Live auctions run in real time; ensure your bidding balance is funded.",
          "Winning amounts are deducted from your account balance at close.",
        ],
        link: { to: "/how-it-works", label: "See how it works" },
      },
      {
        title: "Registration Guide",
        summary: "Step-by-step registration walkthrough for new bidders.",
        body: [
          "Getting registered takes a few minutes but should be started early — deposits must be cleared before the auction begins. Register, verify your identity (KYC), complete the bidder agreement, and add funds to your bidding balance.",
          "Registration requirements vary by county: some require a deposit equal to a percentage of the intended bids, others require specific forms to be filed ahead of the sale date.",
        ],
        bullets: [
          "Create your account and complete identity verification.",
          "Complete KYC before your first award to avoid delays.",
          "Fund your bidding balance before the registration deadline.",
          "Review each county's deposit & form requirements on its auction page.",
        ],
        link: { to: "/auth", label: "Create your account" },
      },
    ],
  },
  {
    icon: ScrollText,
    title: "Guides & Tutorials",
    subtitle: "Practical, step-by-step guidance that takes you from research to redemption.",
    items: [
      {
        title: "Due Diligence Checklist",
        summary: "Everything to research before you place a bid.",
        body: [
          "Never bid blind. A tax lien certificate is only as good as the property behind it. Before bidding, confirm the property's assessed value, condition, and likelihood of redemption.",
          "Start with the county parcel records, verify the address on a map, and check whether the property is improved or vacant land. Compare the taxes owed to the assessed value — substantial equity in the property makes redemption far more likely.",
        ],
        bullets: [
          "Confirm property address, status type (improved / vacant), and acreage.",
          "Compare assessed value to the taxes owed — target at least 5–10x coverage.",
          "Check for other liens (mortgage, HOA, special assessments) at the county recorder.",
          "Review the county's redemption period and calculation method.",
          "Set a maximum rate you are willing to accept before the auction.",
        ],
      },
      {
        title: "Property Assessment",
        summary: "How to evaluate a tax lien property before you commit.",
        body: [
          "Your two questions are: (1) can the owner afford to redeem, and (2) if not, is the property worth owning? Run the same numbers a lender would. Look at recent comparable sales for the area, not just the county's assessed value.",
          "Drive by the property if you can, or use the gallery images. Vacant land and abandoned structures carry different risk — and different upside — than an occupied, income-producing home.",
        ],
        bullets: [
          "Estimated property value vs. taxes owed = your equity cushion.",
          "Condition and occupancy affect redemption probability.",
          "Comps matter more than assessed value — use recent sold prices.",
          "Consider worst case: if you take possession, what is it worth?",
        ],
      },
      {
        title: "Redemption Process",
        summary: "What happens after you win a lien.",
        body: [
          "After the auction, your winning amount is debited from your balance and a certificate is issued in your name. The property owner then has a statutory window — commonly 12 to 36 months depending on state — to redeem by paying the taxes owed plus interest at your winning rate.",
          "If the owner redeems, the county pays you principal + interest. If not, you can begin the foreclosure or quit-claim deed process per your jurisdiction's rules, potentially acquiring the property.",
        ],
        bullets: [
          "Certificate issued after your winning amount is settled.",
          "Redemption windows vary: Florida 2 years, Illinois ~2.5 years, Arizona 3 years.",
          "You can be outbid at a later tax sale — track notices carefully.",
          "ChicagoTaxLien surfaces upcoming redemption deadlines in your dashboard.",
        ],
        link: { to: "/glossary", label: "Browse the glossary" },
      },
    ],
  },
  {
    icon: FileText,
    title: "Forms & Documents",
    subtitle: "The documents you'll need to participate and collect.",
    items: [
      {
        title: "W-9 Tax Form",
        summary: "Required for U.S. bidders before your first award.",
        body: [
          "The IRS requires a completed W-9 to report interest and other taxable income you receive from tax lien participation. We use your W-9 to issue the appropriate 1099-INT or 1099-MISC at year end.",
          "You can upload your W-9 securely from your profile — it is stored as a sensitive document and only visible to you and our compliance team.",
        ],
        bullets: [
          "Required once, before your first certificate award or pay-out.",
          "Your tax documents will be filed with the IRS at year end.",
          "Upload securely from your dashboard profile.",
        ],
        link: { to: "/dashboard/documents", label: "Upload from your dashboard" },
      },
      {
        title: "Bidder Agreement",
        summary: "The terms of participation — review before you bid.",
        body: [
          "The Bidder Agreement governs your participation in each county's auction: bidding rules, deposit requirements, payment deadlines, and the obligations you take on when you win a certificate. It is legally binding, so read it carefully.",
          "You must accept the agreement for each jurisdiction in which you bid. Signed agreements are stored in your documents and viewable at any time.",
        ],
        bullets: [
          "Accept once per jurisdiction, before placing your first bid.",
          "Covers deposits, payment deadlines, and certificate delivery.",
          "Your signed copy is stored securely in your dashboard.",
        ],
      },
      {
        title: "Power of Attorney",
        summary: "For entity bidders and those delegating authority.",
        body: [
          "If you are bidding on behalf of an LLC, trust, corporation, or another individual, you will need appropriate authorization. A Power of Attorney (POA) or entity authorization letter lets an authorized signer execute the bidder agreement and bid on the entity's behalf.",
          "Upload your POA or entity documents with your KYC application so our compliance team can verify your authority before the auction.",
        ],
        bullets: [
          "Ensure the signer is authorized to bind the entity.",
          "Witnessed and notarized documents are preferred.",
          "Submit with KYC to avoid last-minute verification delays.",
        ],
        link: { to: "/dashboard/kyc", label: "Submit with KYC" },
      },
    ],
  },
  {
    icon: Landmark,
    title: "State Information",
    subtitle: "Key rules by state — max rates, redemption windows, and quirks.",
    items: [
      {
        title: "Florida — Up to 18%",
        summary: "Up to 18% max interest, 2-year redemption.",
        body: [
          "Florida tax certificates pay a statutory minimum of 5% plus the bid-down rate on the unpaid taxes, with a maximum bid-down cap of 18%. Certificates earn simple interest and the certificate holder can make subsequent 'ace' payments on later-year taxes to protect their position.",
          "Redemption runs roughly two years from the date of sale. If left unredeemed, the certificate holder may apply for a tax deed, gaining title to the property at the following public auction.",
        ],
        bullets: [
          "Max statutory rate: 18% (min 5%).",
          "Redemption: ~2 years from the date of sale.",
          "You may pay subsequent-year taxes to keep your position senior.",
          "Unredeemed → apply for tax deed after redemption period.",
        ],
      },
      {
        title: "Illinois — Up to 18%",
        summary: "18% max, ~2.5-year redemption for most properties.",
        body: [
          "Illinois annual tax sales cap the interest at 18% on the base taxes. The redemption period for most property types is 2 years and 6 months; for some commercial property and vacant land it can be shorter (e.g., 6 months to 3 years depending on the sale and property type).",
          "Because redemption periods vary heavily by property type, Illinois requires the most careful reading of each certificate's sale terms.",
        ],
        bullets: [
          "Max statutory rate: 18%.",
          "Redemption: commonly 2.5 years; shorter for some property types.",
          "Owners must redeem with the county, which pays the certificate holder.",
          "Unredeemed → petition for tax deed.",
        ],
      },
      {
        title: "Arizona — Up to 16%",
        summary: "16% max, 3-year redemption.",
        body: [
          "Arizona tax lien sales award a lien with a 16% maximum annual rate. The property owner has three years to redeem before the investor may pursue foreclosure. Arizona is popular among longer-horizon investors because of the three-year window combined with a predictable 16% cap.",
          "Bidding in Arizona also happens online in most counties, and the fee schedules are standardized across the state.",
        ],
        bullets: [
          "Max statutory rate: 16%.",
          "Redemption: 3 years.",
          "Uniform process across Arizona counties.",
          "Foreclosure available to the investor after the redemption window.",
        ],
      },
    ],
  },
  {
    icon: HelpCircle,
    title: "FAQs",
    subtitle: "The most common questions, answered in full.",
    items: [
      {
        title: "Investment Risks",
        summary: "Common risks and how to mitigate them.",
        body: [
          "Tax lien investing is not risk-free. The owner may fail to redeem, the property may be worth less than expected, and redemption can be delayed by litigation, bankruptcy, or county processing timelines.",
          "Risk is managed with diligence: prefer properties with strong equity coverage, confirm the redemption rules, and never concentrate your entire balance in a single certificate. Diversify across counties and property types.",
        ],
        bullets: [
          "Equity coverage: assess value should comfortably exceed the lien.",
          "Redemption risk: longer windows mean your money is tied up longer.",
          "Hidden liens and special assessments can erode the position — check the recorder.",
          "Spread bids across counties to lower single-market exposure.",
        ],
      },
      {
        title: "Payment Methods",
        summary: "Accepted payment options at registration and close.",
        body: [
          "We accept ACH, wire transfer, and Zelle for deposits into your bidding balance. All deposits are verified by our finance team before credit — same-day for wires, typically 1–2 business days for ACH and Zelle.",
          "Winning auction amounts are deducted from your balance. You may withdraw available funds at any time; withdrawals are processed within 3 business days after approval.",
        ],
        bullets: [
          "ACH and Zelle: 1–2 business day verification.",
          "Wire: same-day verification when received before cutoff.",
          "Winning bids settle from your balance automatically.",
          "Withdrawals: 3 business days after approval.",
        ],
        link: { to: "/dashboard/funds", label: "Go to Account Funds" },
      },
      {
        title: "Support",
        summary: "How to reach our team.",
        body: [
          "Fastest path: email our support team and we will respond within 24 hours, usually much faster. Signed-in users can also message us directly from their dashboard.",
          "For anything involving active bids, funds, or certificates, please include the property address or parcel ID and mention the auction name so we can route your case quickly.",
        ],
        bullets: [
          "Email: typically answered within 24 hours.",
          "Signed-in users: in-dashboard messaging.",
          "Include property address / parcel ID for fast routing.",
          "Urgent bid issues? Email immediately with 'URGENT' in the subject.",
        ],
        link: { to: "/support", label: "Contact support" },
      },
    ],
  },
];

function ResourcesPage() {
  return (
    <main className="bg-background pb-20">
      <section className="border-b border-hairline bg-navy text-primary-foreground">
        <div className="container-tight py-14">
          <div className="flex items-center gap-2 text-gold">
            <BookOpen className="size-5" />
            <span className="text-xs uppercase tracking-[0.24em]">Investor Resources</span>
          </div>
          <h1 className="mt-3 font-display text-4xl font-600">Everything you need to invest with confidence</h1>
          <p className="mt-2 max-w-2xl text-primary-foreground/80">
            Guides, tutorials, forms, state schedules, and answers — expand any item below for the full detail.
          </p>
        </div>
      </section>

      <section className="container-tight py-10">
        <div className="space-y-8">
          {sections.map((s) => (
            <div key={s.title} className="rounded-xl border border-hairline bg-surface p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-navy/5 text-navy">
                  <s.icon className="size-6" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="font-display text-xl font-600 text-navy">{s.title}</h2>
                  <p className="mt-0.5 text-sm text-ink-muted">{s.subtitle}</p>
                </div>
              </div>

              <div className="mt-5 divide-y divide-hairline">
                {s.items.map((it) => (
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
                      {it.body.map((p, i) => (
                        <p key={i} className="text-sm leading-relaxed text-ink">{p}</p>
                      ))}
                      {it.bullets && (
                        <ul className="mt-3 space-y-1.5">
                          {it.bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-ink">
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-navy" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {it.link && (
                        <Link
                          to={it.link.to}
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-600 text-navy hover:underline"
                        >
                          {it.link.label} <span aria-hidden>→</span>
                        </Link>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink icon={<BookOpen className="size-5" />} title="Glossary" desc="Every tax lien term, explained in plain English." to="/glossary" />
          <QuickLink icon={<HelpCircle className="size-5" />} title="FAQ" desc="More questions? Browse the full list of answers." to="/faq" />
          <QuickLink icon={<Download className="size-5" />} title="One-page cheat sheet" desc="Download the key numbers for every state." to="/support" />
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