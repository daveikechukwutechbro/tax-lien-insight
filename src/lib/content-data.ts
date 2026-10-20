// Default content for the admin-editable site pages that used to be hardcoded
// in route components. Every value here is only a FALLBACK: whatever the admin
// saves in Admin -> Content & Site -> Pages is merged over these defaults, so
// this file can change without affecting an already-customised site.

export type RateModel = "lien" | "hybrid" | "deed";

export type StateRate = {
  state: string;
  model: RateModel;
  rate: string;
  how: string;
  min: string;
  note?: string;
};

export const DEFAULT_STATE_RATES: StateRate[] = (
  [
    {
      state: "Alaska",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Alabama",
      model: "hybrid",
      rate: "12% max",
      how: "Bid down at auction",
      min: "No floor",
    },
    {
      state: "Arkansas",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Arizona",
      model: "lien",
      rate: "16% max",
      how: "Bid down at auction",
      min: "No floor",
    },
    {
      state: "California",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Colorado",
      model: "lien",
      rate: "14% max",
      how: "Fixed by statute",
      min: "None",
    },
    {
      state: "Connecticut",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "District of Columbia",
      model: "lien",
      rate: "18% max",
      how: "Fixed by statute",
      min: "None",
    },
    {
      state: "Delaware",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Florida",
      model: "hybrid",
      rate: "18% max",
      how: "Bid down at auction",
      min: "5%",
      note: "Also runs a tax deed path.",
    },
    {
      state: "Georgia",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Hawaii",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
      note: "No investor tax-sale auction; delinquent liens stay with the county.",
    },
    {
      state: "Iowa",
      model: "lien",
      rate: "24% max",
      how: "Fixed by statute",
      min: "None",
      note: "Highest ceiling in the country.",
    },
    {
      state: "Idaho",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Illinois",
      model: "lien",
      rate: "9% max",
      how: "Bid down at auction",
      min: "No floor",
      note: "One- or three-year redemption by property type.",
    },
    {
      state: "Indiana",
      model: "lien",
      rate: "15% max",
      how: "Flat penalty",
      min: "10%",
      note: "Penalty paid on redemption rather than compounding interest.",
    },
    {
      state: "Kansas",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Kentucky",
      model: "lien",
      rate: "12% max",
      how: "Fixed by statute",
      min: "None",
    },
    {
      state: "Louisiana",
      model: "lien",
      rate: "12% max",
      how: "Bid down at auction",
      min: "8.4%",
      note: "Resets under Acts 2024 No. 774, effective Jan 1, 2026.",
    },
    {
      state: "Massachusetts",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Maryland",
      model: "lien",
      rate: "20% max",
      how: "Set by county law",
      min: "6%",
      note: "Statute sets a default; counties may go higher.",
    },
    {
      state: "Maine",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Michigan",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Minnesota",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Missouri",
      model: "lien",
      rate: "10% max",
      how: "Fixed by statute",
      min: "None",
    },
    {
      state: "Mississippi",
      model: "lien",
      rate: "18% max",
      how: "Fixed by statute",
      min: "None",
    },
    {
      state: "Montana",
      model: "lien",
      rate: "10% max",
      how: "Fixed by statute",
      min: "None",
    },
    {
      state: "North Carolina",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "North Dakota",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Nebraska",
      model: "lien",
      rate: "14% max",
      how: "Fixed by statute",
      min: "None",
    },
    {
      state: "New Hampshire",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "New Jersey",
      model: "lien",
      rate: "18% max",
      how: "Bid down at auction",
      min: "None",
    },
    {
      state: "New Mexico",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Nevada",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "New York",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Ohio",
      model: "hybrid",
      rate: "18% max",
      how: "Bid down at auction",
      min: "No floor",
      note: "Also runs a tax deed / foreclosure path.",
    },
    {
      state: "Oklahoma",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Oregon",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Pennsylvania",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Rhode Island",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "South Carolina",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "South Dakota",
      model: "lien",
      rate: "10% max",
      how: "Bid down at auction",
      min: "None",
    },
    {
      state: "Tennessee",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Texas",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Utah",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Virginia",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Vermont",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Washington",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "Wisconsin",
      model: "deed",
      rate: "—",
      how: "No investor interest",
      min: "—",
    },
    {
      state: "West Virginia",
      model: "lien",
      rate: "12% max",
      how: "Fixed by statute",
      min: "None",
      note: "Roughly 1% per month on redemption.",
    },
    {
      state: "Wyoming",
      model: "lien",
      rate: "15% max",
      how: "Fixed by statute",
      min: "None",
    },
  ] as StateRate[]
).sort((a, b) => a.state.localeCompare(b.state));

// ---- Investor guides (resources page) ----

export type GuideSectionMeta = { title: string; subtitle: string; icon: string };
export type GuideItem = {
  section: string;
  title: string;
  summary: string;
  body: string;
  bullets: string;
  linkLabel: string;
  linkTo: string;
};

export const DEFAULT_GUIDE_SECTIONS: GuideSectionMeta[] = [
  {
    icon: "book",
    title: "Getting Started",
    subtitle: "The fundamentals every tax lien investor needs to know.",
  },
  {
    icon: "scroll",
    title: "Guides & Tutorials",
    subtitle: "Practical, step-by-step guidance that takes you from research to redemption.",
  },
  {
    icon: "file",
    title: "Forms & Documents",
    subtitle: "The documents you'll need to participate and collect.",
  },
  {
    icon: "landmark",
    title: "State Information",
    subtitle: "Key rules by state — max rates, redemption windows, and quirks.",
  },
  { icon: "help", title: "FAQs", subtitle: "The most common questions, answered in full." },
];

export const DEFAULT_GUIDES: GuideItem[] = [
  {
    section: "Getting Started",
    title: "What is a Tax Lien?",
    summary: "Learn the fundamentals of tax lien investing and how the market works.",
    body: [
      "When a property owner fails to pay their property taxes, the local taxing authority places a lien on the property for the unpaid amount plus penalties and interest. To recover that money, the county auctions the right to collect — the tax lien certificate — to private investors.",
      "When you win a lien certificate, you are effectively lending the county's money to the property owner at a fixed statutory rate. When the owner pays their overdue taxes (plus the winning interest rate), the county pays you back: your principal plus interest. That redemption is the primary way tax lien investors earn returns.",
    ].join("\n\n"),
    bullets: [
      "Secured by real estate — the property itself backs the debt.",
      "Statutory interest is often well above bank rates (commonly 12–18%).",
      "Should the property never be redeemed, you may be able to pursue foreclosure or a quit-claim mortgage deed, potentially acquiring the property itself.",
      "Entry costs are often low — many certificates are bid for hundreds of dollars, not thousands.",
    ].join("\n"),
    linkLabel: "Read the FAQ",
    linkTo: "/faq",
  },
  {
    section: "Getting Started",
    title: "How Auctions Work",
    summary: "Understand the bid-down interest rate process used in most tax lien sales.",
    body: [
      "Most county tax lien auctions are interest-rate auctions. The county sets a maximum statutory interest rate (for example, 18% in Illinois or Florida). Bidders then compete by bidding the interest rate DOWN — the lowest rate a bidder is willing to accept wins the certificate.",
      "That means the winning bidder accepts a lower return in exchange for beating the competition. If nobody bids down, the certificate is awarded at the maximum rate to the first registered bidder.",
    ].join("\n\n"),
    bullets: [
      "Registration closes before the auction — deposits often required.",
      "You compete on rate, not price: lowest bid-down rate wins.",
      "Live auctions run in real time; ensure your bidding balance is funded.",
      "Winning amounts are deducted from your account balance at close.",
    ].join("\n"),
    linkLabel: "See how it works",
    linkTo: "/how-it-works",
  },
  {
    section: "Getting Started",
    title: "Registration Guide",
    summary: "Step-by-step registration walkthrough for new bidders.",
    body: [
      "Getting registered takes a few minutes but should be started early — deposits must be cleared before the auction begins. Register, verify your identity (KYC), complete the bidder agreement, and add funds to your bidding balance.",
      "Registration requirements vary by county: some require a deposit equal to a percentage of the intended bids, others require specific forms to be filed ahead of the sale date.",
    ].join("\n\n"),
    bullets: [
      "Create your account and complete identity verification.",
      "Complete KYC before your first award to avoid delays.",
      "Fund your bidding balance before the registration deadline.",
      "Review each county's deposit & form requirements on its auction page.",
    ].join("\n"),
    linkLabel: "Create your account",
    linkTo: "/auth",
  },
  {
    section: "Guides & Tutorials",
    title: "Due Diligence Checklist",
    summary: "Everything to research before you place a bid.",
    body: [
      "Never bid blind. A tax lien certificate is only as good as the property behind it. Before bidding, confirm the property's assessed value, condition, and likelihood of redemption.",
      "Start with the county parcel records, verify the address on a map, and check whether the property is improved or vacant land. Compare the taxes owed to the assessed value — substantial equity in the property makes redemption far more likely.",
    ].join("\n\n"),
    bullets: [
      "Confirm property address, status type (improved / vacant), and acreage.",
      "Compare assessed value to the taxes owed — target at least 5–10x coverage.",
      "Check for other liens (mortgage, HOA, special assessments) at the county recorder.",
      "Review the county's redemption period and calculation method.",
      "Set a maximum rate you are willing to accept before the auction.",
    ].join("\n"),
    linkLabel: "",
    linkTo: "",
  },
  {
    section: "Guides & Tutorials",
    title: "Property Assessment",
    summary: "How to evaluate a tax lien property before you commit.",
    body: [
      "Your two questions are: (1) can the owner afford to redeem, and (2) if not, is the property worth owning? Run the same numbers a lender would. Look at recent comparable sales for the area, not just the county's assessed value.",
      "Drive by the property if you can, or use the gallery images. Vacant land and abandoned structures carry different risk — and different upside — than an occupied, income-producing home.",
    ].join("\n\n"),
    bullets: [
      "Estimated property value vs. taxes owed = your equity cushion.",
      "Condition and occupancy affect redemption probability.",
      "Comps matter more than assessed value — use recent sold prices.",
      "Consider worst case: if you take possession, what is it worth?",
    ].join("\n"),
    linkLabel: "",
    linkTo: "",
  },
  {
    section: "Guides & Tutorials",
    title: "Redemption Process",
    summary: "What happens after you win a lien.",
    body: [
      "After the auction, your winning amount is debited from your balance and a certificate is issued in your name. The property owner then has a statutory window — commonly 12 to 36 months depending on state — to redeem by paying the taxes owed plus interest at your winning rate.",
      "If the owner redeems, the county pays you principal + interest. If not, you can begin the foreclosure or quit-claim deed process per your jurisdiction's rules, potentially acquiring the property.",
    ].join("\n\n"),
    bullets: [
      "Certificate issued after your winning amount is settled.",
      "Redemption windows vary: Florida 2 years, Illinois ~2.5 years, Arizona 3 years.",
      "You can be outbid at a later tax sale — track notices carefully.",
      "Auction Ledger surfaces upcoming redemption deadlines in your dashboard.",
    ].join("\n"),
    linkLabel: "Browse the glossary",
    linkTo: "/glossary",
  },
  {
    section: "Forms & Documents",
    title: "W-9 Tax Form",
    summary: "Required for U.S. bidders before your first award.",
    body: [
      "The IRS requires a completed W-9 to report interest and other taxable income you receive from tax lien participation. We use your W-9 to issue the appropriate 1099-INT or 1099-MISC at year end.",
      "You can upload your W-9 securely from your profile — it is stored as a sensitive document and only visible to you and our compliance team.",
    ].join("\n\n"),
    bullets: [
      "Required once, before your first certificate award or pay-out.",
      "Your tax documents will be filed with the IRS at year end.",
      "Upload securely from your dashboard profile.",
    ].join("\n"),
    linkLabel: "Upload from your dashboard",
    linkTo: "/dashboard/documents",
  },
  {
    section: "Forms & Documents",
    title: "Bidder Agreement",
    summary: "The terms of participation — review before you bid.",
    body: [
      "The Bidder Agreement governs your participation in each county's auction: bidding rules, deposit requirements, payment deadlines, and the obligations you take on when you win a certificate. It is legally binding, so read it carefully.",
      "You must accept the agreement for each jurisdiction in which you bid. Signed agreements are stored in your documents and viewable at any time.",
    ].join("\n\n"),
    bullets: [
      "Accept once per jurisdiction, before placing your first bid.",
      "Covers deposits, payment deadlines, and certificate delivery.",
      "Your signed copy is stored securely in your dashboard.",
    ].join("\n"),
    linkLabel: "",
    linkTo: "",
  },
  {
    section: "Forms & Documents",
    title: "Power of Attorney",
    summary: "For entity bidders and those delegating authority.",
    body: [
      "If you are bidding on behalf of an LLC, trust, corporation, or another individual, you will need appropriate authorization. A Power of Attorney (POA) or entity authorization letter lets an authorized signer execute the bidder agreement and bid on the entity's behalf.",
      "Upload your POA or entity documents with your KYC application so our compliance team can verify your authority before the auction.",
    ].join("\n\n"),
    bullets: [
      "Ensure the signer is authorized to bind the entity.",
      "Witnessed and notarized documents are preferred.",
      "Submit with KYC to avoid last-minute verification delays.",
    ].join("\n"),
    linkLabel: "Submit with KYC",
    linkTo: "/dashboard/kyc",
  },
  {
    section: "State Information",
    title: "Interest rates by state",
    summary: "The statutory lien rate, how it is set, and any minimum — for every US state and DC.",
    body: [
      "Each jurisdiction decides its own model. Lien states pay a statutory interest rate on redemption, hybrid states run both lien and deed paths, and deed states pay no investor interest at all — your return there comes from acquiring the property.",
      "The full reference shows the maximum rate, how it is set (bid-down auction, fixed statute, or county law), any statutory minimum, and redemption quirks for all 50 states and DC — verified against state statutes.",
    ].join("\n\n"),
    bullets: [
      "Iowa tops the list at 24%; typical ceilings run 10–18%.",
      "In bid-down states the rate is set at auction, often well below the ceiling.",
      "Deed states pay no interest — model the property, not the rate.",
    ].join("\n"),
    linkLabel: "See interest rates by state",
    linkTo: "/rates",
  },
  {
    section: "FAQs",
    title: "Investment Risks",
    summary: "Common risks and how to mitigate them.",
    body: [
      "Tax lien investing is not risk-free. The owner may fail to redeem, the property may be worth less than expected, and redemption can be delayed by litigation, bankruptcy, or county processing timelines.",
      "Risk is managed with diligence: prefer properties with strong equity coverage, confirm the redemption rules, and never concentrate your entire balance in a single certificate. Diversify across counties and property types.",
    ].join("\n\n"),
    bullets: [
      "Equity coverage: assess value should comfortably exceed the lien.",
      "Redemption risk: longer windows mean your money is tied up longer.",
      "Hidden liens and special assessments can erode the position — check the recorder.",
      "Spread bids across counties to lower single-market exposure.",
    ].join("\n"),
    linkLabel: "",
    linkTo: "",
  },
  {
    section: "FAQs",
    title: "Payment Methods",
    summary: "Funding your bidding balance with USDC — bank and card options coming soon.",
    body: [
      "Your bidding balance is currently funded with USDC (USD Coin), a widely used U.S. dollar-backed stablecoin — 1 USDC is always equal to 1 USD. From the Add Funds page, pick the blockchain network, generate a unique deposit address, and send USDC. Your balance updates once the deposit is confirmed on-chain.",
      "U.S. bank transfers (ACH and wire) and debit/credit card funding are coming soon while we complete our banking and payment processing integrations. Withdrawals are paid out in USDC to your wallet.",
    ].join("\n\n"),
    bullets: [
      "USDC: 1:1 with USD, fast settlement, available 24/7.",
      "Bank transfers (ACH / wire) and debit/credit cards: coming soon.",
      "Deposits are verified on-chain before they are credited to your balance.",
      "Withdrawals are paid out in USDC to your wallet.",
    ].join("\n"),
    linkLabel: "Go to Add Funds",
    linkTo: "/dashboard/funds",
  },
  {
    section: "FAQs",
    title: "Support",
    summary: "How to reach our team.",
    body: [
      "Fastest path: email our support team and we will respond within 24 hours, usually much faster. Signed-in users can also message us directly from their dashboard.",
      "For anything involving active bids, funds, or certificates, please include the property address or parcel ID and mention the auction name so we can route your case quickly.",
    ].join("\n\n"),
    bullets: [
      "Email: typically answered within 24 hours.",
      "Signed-in users: in-dashboard messaging.",
      "Include property address / parcel ID for fast routing.",
      "Urgent bid issues? Email immediately with 'URGENT' in the subject.",
    ].join("\n"),
    linkLabel: "Contact support",
    linkTo: "/support",
  },
];

// ---- Glossary ----

export const DEFAULT_GLOSSARY_TERMS: { term: string; def: string }[] = [
  { term: "Assignment", def: "Transfer of a tax lien certificate from one investor to another." },
  {
    term: "Bid-down",
    def: "An auction model where bidders compete by lowering the interest rate they will accept.",
  },
  {
    term: "Certificate",
    def: "The instrument issued to the winning bidder representing the tax debt owed by the property owner.",
  },
  { term: "Delinquent taxes", def: "Property taxes that were not paid by the statutory due date." },
  {
    term: "Deed application",
    def: "The formal request to convert an unredeemed lien into ownership of the property.",
  },
  { term: "Face amount", def: "Original tax debt plus statutory penalties and fees." },
  {
    term: "Foreclosure",
    def: "Legal process to take title of the property when the lien is not redeemed.",
  },
  { term: "Interest rate", def: "The annual rate the property owner must pay to redeem the lien." },
  {
    term: "Over-the-counter (OTC)",
    def: "Liens unsold at auction that may be purchased directly from the county at a fixed rate.",
  },
  { term: "Parcel ID", def: "Unique identifier assigned to a property by the county assessor." },
  {
    term: "Premium bid",
    def: "An auction model where bidders offer amounts over the tax debt; premium is not returned on redemption.",
  },
  {
    term: "Redemption",
    def: "The property owner's payment of the lien plus interest, ending the investor's claim.",
  },
  {
    term: "Redemption period",
    def: "Statutory window in which the owner may redeem — commonly 12–36 months.",
  },
  {
    term: "Subsequent taxes (subs)",
    def: "Later-year taxes paid by the lien holder to protect their position.",
  },
  {
    term: "Tax sale",
    def: "Public auction of tax lien certificates or tax deeds held by a county.",
  },
];

// ---- Help center ----

export const DEFAULT_HELP_CATS: { icon: string; title: string; desc: string; to: string }[] = [
  {
    icon: "book",
    title: "Getting Started",
    desc: "Create an account, verify identity, and fund your bidding balance.",
    to: "/how-it-works",
  },
  {
    icon: "gavel",
    title: "Bidding & Auctions",
    desc: "How interest-rate bid-down works, registration deadlines, and winning strategies.",
    to: "/resources",
  },
  {
    icon: "wallet",
    title: "Payments & Funds",
    desc: "Accepted methods, deposit approvals, withdrawals, and processing times.",
    to: "/faq",
  },
  {
    icon: "shield",
    title: "Redemption & Payouts",
    desc: "How redemption works, timelines, and how you get paid.",
    to: "/glossary",
  },
  {
    icon: "landmark",
    title: "Certificates & Titles",
    desc: "Certificate issuance, foreclosure timelines, and jurisdictional rules.",
    to: "/resources",
  },
  {
    icon: "lifebuoy",
    title: "Contact Support",
    desc: "Reach the Auction Ledger support team by email, or message them from your dashboard.",
    to: "/support",
  },
];

// ---- About page ----

export const DEFAULT_ABOUT_STATS: { value: string; label: string }[] = [
  { value: "12+", label: "Counties" },
  { value: "150+", label: "Properties per auction" },
  { value: "18%", label: "Max statutory yield" },
  { value: "24/7", label: "Marketplace access" },
];

export const DEFAULT_ABOUT_VALUES: { icon: string; title: string; body: string }[] = [
  {
    icon: "lock",
    title: "Transparent Pricing",
    body: "Every lien, every property, every interest rate is visible before you place a bid. No hidden fees, no surprise terms — just the data you need to make confident decisions.",
  },
  {
    icon: "shield",
    title: "Verified Investors Only",
    body: "Every bidder completes identity verification before the auction opens. That means you're bidding alongside serious, vetted participants — not anonymous accounts.",
  },
  {
    icon: "chart",
    title: "Real-Time Data",
    body: "Current interest rates, assessed property values, redemption periods, and auction status — updated live across every participating jurisdiction.",
  },
  {
    icon: "globe",
    title: "Multi-State Access",
    body: "Browse, research, and bid across jurisdictions from a single dashboard. No more jumping between county websites with different rules and formats.",
  },
];

export const DEFAULT_ABOUT_DIFFS: { title: string; body: string }[] = [
  {
    title: "County-verified data",
    body: "Property details, assessed values, and lien records come directly from participating county offices — not scraped or estimated by third parties.",
  },
  {
    title: "Full bid history",
    body: "See starting rates, current rates, and historical results for every lot. Know exactly what you're bidding on and what comparable lots have yielded.",
  },
  {
    title: "Watchlist and alerts",
    body: "Track the properties you're interested in. Get notified when auctions go live, when bidding opens, and when results are finalized — so you never miss a window.",
  },
];

export const DEFAULT_ABOUT_WHY: string[] = [
  "When a property owner falls behind on taxes, the county sells the debt to an investor as a tax lien certificate. In return, the investor funds the county's operations — and earns a statutory interest rate when the owner redeems the property.",
  "It's one of the few alternative investments that is **secured by real estate**, governed by state law, and backed by the county's own collection process. Returns are set by statute — not by market speculation — giving you a predictable, rules-based yield.",
  "Auction Ledger simply makes it easier to find, evaluate, and invest in those opportunities — across state lines, in one place.",
];

// ---- Header / footer navigation ----

export const DEFAULT_NAV_LINKS: { label: string; to: string }[] = [
  { to: "/auctions", label: "Auctions" },
  { to: "/states", label: "By State" },
  { to: "/search", label: "Search Properties" },
  { to: "/how-it-works", label: "How It Works" },
];

export const DEFAULT_FOOTER_LINKS: { column: string; label: string; to: string }[] = [
  { column: "marketplace", label: "Upcoming auctions", to: "/auctions" },
  { column: "marketplace", label: "Search properties", to: "/search" },
  { column: "marketplace", label: "Interest rates by state", to: "/rates" },
  { column: "learn", label: "How it works", to: "/how-it-works" },
  { column: "learn", label: "Investor guides", to: "/resources" },
  { column: "learn", label: "About us", to: "/about" },
];
