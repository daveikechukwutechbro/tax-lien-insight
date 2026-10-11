// Public site content: typed defaults, admin form schemas, and a hook that
// merges admin-edited content (stored in the backend `site_content` table) over
// these defaults. If a field is unset, empty, or an empty array, the default is
// used so the public site never renders blank copy.
//
// This file is the single source of truth for both the public pages and the
// admin editor (src/routes/admin/content/pages.tsx).

import { useQuery } from "@tanstack/react-query";
import { getSiteContent, type SiteContentSlug } from "@/lib/backend";

export type ItemFieldType = "text" | "textarea";

export type ItemField = {
  key: string;
  label: string;
  type: ItemFieldType;
  placeholder?: string;
};

export type ContentField =
  | {
      key: string;
      label: string;
      type: "text" | "textarea";
      placeholder?: string;
      help?: string;
    }
  | {
      key: string;
      label: string;
      type: "items";
      itemLabel: string;
      help?: string;
      fields: ItemField[];
    };

export type ContentSchema = {
  slug: SiteContentSlug;
  label: string;
  description: string;
  fields: ContentField[];
};

export const SITE_CONTENT_DEFAULTS = {
  settings: {
    siteName: "Auction Ledger",
    siteTagline: "Tax Lien Auctions",
    contactEmail: "auctionledger@gmail.com",
    announcementText: "",
    footerBlurb:
      "The transparent multi-state marketplace for tax lien certificates. Registered bidders only. Not financial advice.",
    footerLegal: "Licensed in participating US jurisdictions. Bidding subject to county rules.",
  },
  home: {
    heroTitle: "Upcoming Tax Lien Auction",
    heroSubtitle:
      "These properties are scheduled for auction. Register now and be ready to bid on secured tax lien certificates.",
    ctaTitle: "Register now to participate in the auction.",
    ctaSubtitle: "Create an account, add funds, and be ready to bid when the auction goes live.",
    whyInvest: [
      { text: "Earn interest up to 18% or more" },
      { text: "Secured by real estate" },
      { text: "Low investment minimums" },
      { text: "Potential for high returns" },
    ],
  },
  "how-it-works": {
    title: "How It Works",
    subtitle:
      "Four steps from account creation to earning interest on secured tax lien certificates.",
    ctaLabel: "Create your account",
    steps: [
      {
        title: "Register",
        body: "Create an account and complete bidder verification for the counties you want to participate in.",
      },
      {
        title: "Fund",
        body: "Deposit funds securely. Your deposit determines your bidding capacity for the auction.",
      },
      {
        title: "Bid",
        body: "Bid down the interest rate on liens you want. Lowest rate wins the certificate.",
      },
      {
        title: "Collect",
        body: "When the property owner redeems, you collect the tax amount plus accrued interest.",
      },
    ],
  },
  faq: {
    eyebrow: "Support",
    title: "Frequently asked questions",
    items: [
      {
        q: "What is a tax lien certificate?",
        a: "When a property owner fails to pay property taxes, the county sells the debt to an investor as a certificate. The investor is paid back with interest when the owner redeems, or may pursue the property after the redemption period.",
      },
      {
        q: "How does bid-down interest work?",
        a: "Auctions start at a maximum statutory rate (often 18%). Bidders lower the rate they are willing to accept. The lowest rate wins the lien.",
      },
      {
        q: "How much do I need to deposit to bid?",
        a: "Deposit requirements are set per auction. You must fund your bidding balance before the registration deadline shown on each auction page.",
      },
      {
        q: "How do I add funds?",
        a: "From your dashboard, open Account Funds and submit a deposit request. We currently accept ACH, wire transfer, and Zelle. Deposits are credited after admin verification.",
      },
      {
        q: "How do I withdraw funds?",
        a: "Submit a withdrawal request from Account Funds. Withdrawals are typically processed within 3 business days after approval.",
      },
      {
        q: "What happens if I win a lien?",
        a: "The winning bid amount is debited from your balance. The certificate is issued in your name. You collect principal plus your winning interest rate when the owner redeems.",
      },
      {
        q: "What is the redemption period?",
        a: "The window during which the property owner may pay back the lien plus interest. Length varies by jurisdiction — commonly 12 to 36 months.",
      },
      {
        q: "What if the lien is not redeemed?",
        a: "You may pursue foreclosure or deed application per your jurisdiction's rules. Auction Ledger surfaces upcoming deadlines in your dashboard.",
      },
      {
        q: "Are tax lien investments guaranteed?",
        a: "No. Returns depend on redemption, jurisdiction rules, and property condition. Do your own due diligence on every property.",
      },
      {
        q: "Can I cancel a bid?",
        a: "Bids are binding once placed. Contact support immediately if you believe a bid was placed in error.",
      },
    ],
  },
  rates: {
    eyebrow: "State Reference",
    title: "Interest rates by state",
    subtitle:
      "The statutory interest a tax lien certificate can earn, how that rate is set, and any minimum — for every US state and DC. Rates are statutory ceilings and were checked against state law; confirm the current figure with the county before you bid.",
  },
  resources: {
    eyebrow: "Investor Resources",
    title: "Everything you need to invest with confidence",
    subtitle:
      "Guides, tutorials, forms, state schedules, and answers — expand any item below for the full detail.",
  },
  support: {
    eyebrow: "Contact Support",
    title: "We're here to help",
    subtitle:
      "Questions about bidding, your funds, certificates, or a redemption pay-out? Send us an email and a member of the team will get back to you within one business day.",
    email: "auctionledger@gmail.com",
    hours: "Mon – Fri, 9am – 6pm ET",
    hoursNote: "Weekend messages are answered on the next business day.",
  },
  about: {
    title: "The marketplace tax lien investors actually want to use.",
    intro:
      "Auction Ledger was built to solve a simple problem: tax lien auctions are a powerful investment opportunity, but the process is fragmented, opaque, and stuck behind outdated county portals. We bring every participating jurisdiction together on one platform — so you can research, compare, and invest with confidence.",
    ctaTitle: "Ready to invest?",
    ctaSubtitle: "Create a free bidder account and start researching the next auction.",
  },
} as const;

export const SITE_CONTENT_SCHEMAS: ContentSchema[] = [
  {
    slug: "settings",
    label: "Site settings",
    description: "Global branding, contact details, and the announcement banner shown across the site.",
    fields: [
      { key: "siteName", label: "Site name", type: "text", placeholder: "Auction Ledger" },
      { key: "siteTagline", label: "Tagline", type: "text", placeholder: "Tax Lien Auctions" },
      { key: "contactEmail", label: "Support email", type: "text", placeholder: "you@example.com" },
      {
        key: "announcementText",
        label: "Announcement banner",
        type: "textarea",
        help: "Shown in a bar at the top of every page. Leave blank to hide it.",
        placeholder: "Next multi-state auction opens Nov 4 — register now.",
      },
      { key: "footerBlurb", label: "Footer blurb", type: "textarea" },
      { key: "footerLegal", label: "Footer legal line", type: "text" },
    ],
  },
  {
    slug: "home",
    label: "Home page",
    description: "The headline and call-to-action shown on the landing page.",
    fields: [
      { key: "heroTitle", label: "Hero title", type: "text" },
      { key: "heroSubtitle", label: "Hero subtitle", type: "textarea" },
      { key: "ctaTitle", label: "Registration banner title", type: "text" },
      { key: "ctaSubtitle", label: "Registration banner subtitle", type: "textarea" },
      {
        key: "whyInvest",
        label: "Why invest points",
        type: "items",
        itemLabel: "Point",
        fields: [{ key: "text", label: "Text", type: "text" }],
      },
    ],
  },
  {
    slug: "how-it-works",
    label: "How it works",
    description: "The four-step explainer and its call to action.",
    fields: [
      { key: "title", label: "Page title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "ctaLabel", label: "Button label", type: "text" },
      {
        key: "steps",
        label: "Steps",
        type: "items",
        itemLabel: "Step",
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
        ],
      },
    ],
  },
  {
    slug: "faq",
    label: "FAQ",
    description: "Questions and answers shown on the FAQ page.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      {
        key: "items",
        label: "Questions",
        type: "items",
        itemLabel: "Question",
        fields: [
          { key: "q", label: "Question", type: "text" },
          { key: "a", label: "Answer", type: "textarea" },
        ],
      },
    ],
  },
  {
    slug: "rates",
    label: "Rates page intro",
    description: "Intro copy for the interest-rates reference table. The table itself is fixed data.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
    ],
  },
  {
    slug: "resources",
    label: "Resources page intro",
    description: "Intro copy for the investor resources page. The guides themselves are fixed content.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
    ],
  },
  {
    slug: "support",
    label: "Support page",
    description: "Contact page copy, support email, and hours.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "email", label: "Support email", type: "text" },
      { key: "hours", label: "Support hours", type: "text" },
      { key: "hoursNote", label: "Support hours note", type: "text" },
    ],
  },
  {
    slug: "about",
    label: "About page",
    description: "The About page headline, intro, and closing call to action.",
    fields: [
      { key: "title", label: "Headline", type: "text" },
      { key: "intro", label: "Intro paragraph", type: "textarea" },
      { key: "ctaTitle", label: "Call-to-action title", type: "text" },
      { key: "ctaSubtitle", label: "Call-to-action subtitle", type: "text" },
    ],
  },
];

function isBlank(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function mergeDefaults<T extends Record<string, unknown>>(defaults: T, body: unknown): T {
  const patch = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (!isBlank(patch[key])) out[key] = patch[key];
  }
  return out as T;
}

export type SiteContentFor<K extends SiteContentSlug> = (typeof SITE_CONTENT_DEFAULTS)[K];

export function useSiteContent<K extends SiteContentSlug>(slug: K): SiteContentFor<K> {
  const defaults = SITE_CONTENT_DEFAULTS[slug] as unknown as SiteContentFor<K>;
  const { data } = useQuery({
    queryKey: ["site-content", slug],
    queryFn: () => getSiteContent(slug),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return mergeDefaults(defaults as unknown as Record<string, unknown>, data?.body) as unknown as SiteContentFor<K>;
}
