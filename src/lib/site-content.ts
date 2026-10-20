// Public site content: typed defaults, admin form schemas, and a hook that
// merges admin-edited content (stored in the backend `site_content` table) over
// these defaults. If a field is unset, empty, or an empty array, the default is
// used so the public site never renders blank copy.
//
// This file is the single source of truth for both the public pages and the
// admin editor (src/routes/admin/content/pages.tsx).

import { queryOptions, useQuery } from "@tanstack/react-query";
import { createElement, Fragment, type ReactNode } from "react";
import { getSiteContent, type SiteContentSlug } from "@/lib/backend";
import {
  DEFAULT_STATE_RATES,
  DEFAULT_GUIDE_SECTIONS,
  DEFAULT_GUIDES,
  DEFAULT_GLOSSARY_TERMS,
  DEFAULT_HELP_CATS,
  DEFAULT_ABOUT_STATS,
  DEFAULT_ABOUT_VALUES,
  DEFAULT_ABOUT_DIFFS,
  DEFAULT_ABOUT_WHY,
  DEFAULT_NAV_LINKS,
  DEFAULT_FOOTER_LINKS,
} from "@/lib/content-data";

// Shared query so route loaders can prefetch the same cache entry the hook reads.
export function siteContentQuery<K extends SiteContentSlug>(slug: K) {
  return queryOptions({
    queryKey: ["site-content", slug],
    queryFn: () => getSiteContent(slug),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// Public route for each slug — used by the admin "Preview" button.
export const SITE_PATHS: Record<SiteContentSlug, string> = {
  settings: "/",
  home: "/",
  navigation: "/",
  "how-it-works": "/how-it-works",
  faq: "/faq",
  rates: "/rates",
  resources: "/resources",
  support: "/support",
  about: "/about",
  glossary: "/glossary",
  help: "/help",
};

export type SelectOption = { value: string; label: string };

export type ItemFieldType = "text" | "textarea" | "select";

export type ItemField = {
  key: string;
  label: string;
  type: ItemFieldType;
  placeholder?: string;
  options?: SelectOption[];
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
    }
  | {
      key: string;
      label: string;
      type: "toggle";
      help?: string;
    }
  | {
      key: string;
      label: string;
      type: "select";
      help?: string;
      options: SelectOption[];
    }
  | {
      key: string;
      label: string;
      type: "image";
      help?: string;
      /** Short hint shown under the preview, e.g. recommended file size. */
      hint?: string;
    };

export type ContentSchema = {
  slug: SiteContentSlug;
  label: string;
  description: string;
  fields: ContentField[];
};

const SEO_TITLE_HELP = "Shown in the browser tab and in search results.";
const SEO_DESC_HELP = "The summary search engines show under the title.";

const THEME_OPTIONS: SelectOption[] = [
  { value: "light", label: "Light (crisp white)" },
  { value: "dark", label: "Dark" },
];

const ICON_OPTIONS = (icons: string[]): SelectOption[] =>
  icons.map((i) => ({ value: i, label: i }));

export const SITE_CONTENT_DEFAULTS = {
  settings: {
    siteName: "Auction Ledger",
    siteTagline: "Tax Lien Auctions",
    contactEmail: "auctionledger@gmail.com",
    announcementEnabled: true,
    announcementText: "",
    logo: "",
    favicon: "",
    defaultTheme: "light",
    seoSiteTitle: "Auction Ledger — Tax Lien Certificates & Auction Marketplace",
    seoSiteDescription:
      "Browse upcoming multi-state tax lien auctions, review property and lien data, and place bids on secured tax lien certificates.",
    twitterUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    youtubeUrl: "",
    footerBlurb:
      "The transparent multi-state marketplace for tax lien certificates. Registered bidders only. Not financial advice.",
    footerLegal: "Licensed in participating US jurisdictions. Bidding subject to county rules.",
  },
  navigation: {
    navLinks: DEFAULT_NAV_LINKS,
    footerLinks: DEFAULT_FOOTER_LINKS,
    footerColMarketplace: "Marketplace",
    footerColLearn: "Learn",
    footerColAccount: "Account",
  },
  home: {
    heroTitle: "Upcoming Tax Lien Auction",
    heroSubtitle:
      "These properties are scheduled for auction. Register now and be ready to bid on secured tax lien certificates.",
    seoTitle: "Upcoming Tax Lien Auction — Auction Ledger",
    seoDescription:
      "Browse the next multi-state tax lien auction. Review scheduled properties and counties, then register to bid on secured tax lien certificates.",
    ctaTitle: "Register now to participate in the auction.",
    ctaSubtitle: "Create an account, add funds, and be ready to bid when the auction goes live.",
    whyInvest: [
      { text: "Earn interest up to 18% or more" },
      { text: "Secured by real estate" },
      { text: "Low investment minimums" },
      { text: "Potential for high returns" },
    ],
    showAuctionDate: true,
    showCountdown: true,
    showStats: true,
    showFilterBar: true,
    showRegisterBanner: true,
  },
  "how-it-works": {
    title: "How It Works",
    subtitle:
      "Four steps from account creation to earning interest on secured tax lien certificates.",
    ctaLabel: "Create your account",
    seoTitle: "How It Works — Auction Ledger",
    seoDescription:
      "Register, fund your account, bid down the interest rate, and collect when the property owner redeems.",
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
    seoTitle: "FAQ — Auction Ledger",
    seoDescription:
      "Answers about tax lien certificates, bid-down auctions, deposits, redemption, and payouts.",
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
        a: "From your dashboard, open Account Funds and submit a deposit request. Your bidding balance is funded with USDC while our ACH, wire, and card integrations are completed. Deposits are credited after confirmation.",
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
    rows: DEFAULT_STATE_RATES,
    sourcesNote:
      "Sources: state statutes cited to official legislative sources and cross-checked Sep 2026. Rules and rates change — always verify with the county treasurer before bidding. Not financial advice.",
    seoTitle: "Interest Rates by State — Auction Ledger",
    seoDescription:
      "The statutory tax lien interest rate, how it is set, and any minimum for every US state and DC — lien, hybrid, and deed jurisdictions.",
  },
  resources: {
    eyebrow: "Investor Resources",
    title: "Everything you need to invest with confidence",
    subtitle:
      "Guides, tutorials, forms, state schedules, and answers — expand any item below for the full detail.",
    sections: DEFAULT_GUIDE_SECTIONS,
    guides: DEFAULT_GUIDES,
    seoTitle: "Resources — Auction Ledger",
    seoDescription:
      "Investor guides, state interest rate schedules, and glossary for tax lien investing.",
  },
  glossary: {
    eyebrow: "Reference",
    title: "Glossary of tax lien terms",
    terms: DEFAULT_GLOSSARY_TERMS,
    seoTitle: "Glossary — Auction Ledger",
    seoDescription:
      "Plain-language definitions for tax lien investing terms: certificate, redemption, bid-down, over-the-counter, and more.",
  },
  help: {
    eyebrow: "Help Center",
    title: "How can we help?",
    subtitle:
      "Everything you need to bid confidently, from your first deposit through redemption payouts.",
    cats: DEFAULT_HELP_CATS,
    seoTitle: "Help Center — Auction Ledger",
    seoDescription:
      "Guides, tutorials, and answers for tax lien investors. Learn how auctions, bidding, redemptions and payouts work.",
  },
  support: {
    eyebrow: "Contact Support",
    title: "We're here to help",
    subtitle:
      "Questions about bidding, your funds, certificates, or a redemption pay-out? Send us an email and a member of the team will get back to you within one business day.",
    email: "",
    hours: "Mon – Fri, 9am – 6pm ET",
    hoursNote: "Weekend messages are answered on the next business day.",
    seoTitle: "Contact Support — Auction Ledger",
    seoDescription:
      "Questions about bidding, funds, certificates or redemption? Get in touch with the Auction Ledger team.",
  },
  about: {
    eyebrow: "About Auction Ledger",
    title: "The marketplace tax lien investors actually want to use.",
    intro:
      "Auction Ledger was built to solve a simple problem: tax lien auctions are a powerful investment opportunity, but the process is fragmented, opaque, and stuck behind outdated county portals. We bring every participating jurisdiction together on one platform — so you can research, compare, and invest with confidence.",
    stats: DEFAULT_ABOUT_STATS,
    investorsTitle: "Built for serious investors",
    investorsBody:
      "Whether you're a first-time lien buyer or managing a portfolio across multiple states, Auction Ledger gives you the tools and transparency to move fast and invest wisely.",
    values: DEFAULT_ABOUT_VALUES,
    whyTitle: "Why tax liens?",
    whyBodies: DEFAULT_ABOUT_WHY.map((text) => ({ text })),
    chooseTitle: "Why investors choose Auction Ledger",
    diffs: DEFAULT_ABOUT_DIFFS,
    ctaTitle: "Ready to invest?",
    ctaSubtitle: "Create a free bidder account and start researching the next auction.",
    seoTitle: "About — Auction Ledger",
    seoDescription:
      "Auction Ledger is the transparent multi-state marketplace connecting investors with county tax lien auctions across the United States.",
  },
};

export const SITE_CONTENT_SCHEMAS: ContentSchema[] = [
  {
    slug: "settings",
    label: "Site settings",
    description:
      "Global branding, search-engine defaults, contact details, and the announcement banner shown across the site.",
    fields: [
      { key: "siteName", label: "Site name", type: "text", placeholder: "Auction Ledger" },
      { key: "siteTagline", label: "Tagline", type: "text", placeholder: "Tax Lien Auctions" },
      {
        key: "logo",
        label: "Logo",
        type: "image",
        help: "Shown in the header and footer.",
        hint: "Square PNG or SVG, up to 300 KB",
      },
      {
        key: "favicon",
        label: "Favicon",
        type: "image",
        help: "Browser tab icon.",
        hint: "32×32 PNG, up to 64 KB",
      },
      {
        key: "defaultTheme",
        label: "Default colour theme",
        type: "select",
        options: THEME_OPTIONS,
        help: "Applied to first-time visitors; each visitor can still switch with the header toggle.",
      },
      {
        key: "contactEmail",
        label: "Support email",
        type: "text",
        placeholder: "you@example.com",
        help: "Used wherever the site shows a contact address.",
      },
      {
        key: "announcementEnabled",
        label: "Show announcement banner",
        type: "toggle",
        help: "The bar above the header on every page.",
      },
      {
        key: "announcementText",
        label: "Announcement banner text",
        type: "textarea",
        placeholder: "Next multi-state auction opens Nov 4 — register now.",
      },
      { key: "seoSiteTitle", label: "Default SEO title", type: "text", help: SEO_TITLE_HELP },
      {
        key: "seoSiteDescription",
        label: "Default SEO description",
        type: "textarea",
        help: SEO_DESC_HELP,
      },
      {
        key: "twitterUrl",
        label: "X / Twitter URL",
        type: "text",
        placeholder: "https://x.com/yourhandle",
      },
      {
        key: "facebookUrl",
        label: "Facebook URL",
        type: "text",
        placeholder: "https://facebook.com/yourpage",
      },
      {
        key: "instagramUrl",
        label: "Instagram URL",
        type: "text",
        placeholder: "https://instagram.com/yourhandle",
      },
      {
        key: "linkedinUrl",
        label: "LinkedIn URL",
        type: "text",
        placeholder: "https://linkedin.com/company/yourcompany",
      },
      {
        key: "youtubeUrl",
        label: "YouTube URL",
        type: "text",
        placeholder: "https://youtube.com/@yourchannel",
      },
      { key: "footerBlurb", label: "Footer blurb", type: "textarea" },
      { key: "footerLegal", label: "Footer legal line", type: "text" },
    ],
  },
  {
    slug: "navigation",
    label: "Navigation",
    description: "The header menu links and the footer link columns.",
    fields: [
      {
        key: "navLinks",
        label: "Header menu",
        type: "items",
        itemLabel: "Link",
        help: "Shown in the top navigation, left to right.",
        fields: [
          { key: "label", label: "Label", type: "text", placeholder: "Auctions" },
          { key: "to", label: "Path or URL", type: "text", placeholder: "/auctions" },
        ],
      },
      { key: "footerColMarketplace", label: "Footer column 1 title", type: "text" },
      { key: "footerColLearn", label: "Footer column 2 title", type: "text" },
      {
        key: "footerColAccount",
        label: "Footer column 3 title (account links are added automatically)",
        type: "text",
      },
      {
        key: "footerLinks",
        label: "Footer links",
        type: "items",
        itemLabel: "Link",
        help: "Column is either the first or second footer column title above. Account links are session-aware and added automatically.",
        fields: [
          {
            key: "column",
            label: "Column",
            type: "select",
            options: [
              { value: "marketplace", label: "Column 1" },
              { value: "learn", label: "Column 2" },
            ],
          },
          { key: "label", label: "Label", type: "text", placeholder: "Upcoming auctions" },
          { key: "to", label: "Path or URL", type: "text", placeholder: "/auctions" },
        ],
      },
    ],
  },
  {
    slug: "home",
    label: "Home page",
    description:
      "The headline, call-to-action, search-engine text, and section visibility for the landing page.",
    fields: [
      { key: "heroTitle", label: "Hero title", type: "text" },
      { key: "heroSubtitle", label: "Hero subtitle", type: "textarea" },
      { key: "seoTitle", label: "SEO title", type: "text", help: SEO_TITLE_HELP },
      { key: "seoDescription", label: "SEO description", type: "textarea", help: SEO_DESC_HELP },
      { key: "ctaTitle", label: "Registration banner title", type: "text" },
      { key: "ctaSubtitle", label: "Registration banner subtitle", type: "textarea" },
      {
        key: "whyInvest",
        label: "Why invest points",
        type: "items",
        itemLabel: "Point",
        fields: [{ key: "text", label: "Text", type: "text" }],
      },
      {
        key: "showAuctionDate",
        label: "Show auction date card",
        type: "toggle",
        help: "The date card beside the hero headline.",
      },
      {
        key: "showCountdown",
        label: "Show countdown timer",
        type: "toggle",
        help: "The live countdown to the next auction start.",
      },
      {
        key: "showStats",
        label: "Show stats & why-invest panel",
        type: "toggle",
        help: "The row of property/county/taxes figures.",
      },
      { key: "showFilterBar", label: "Show search & filters", type: "toggle" },
      { key: "showRegisterBanner", label: "Show register banner", type: "toggle" },
    ],
  },
  {
    slug: "how-it-works",
    label: "How it works",
    description: "The four-step explainer, its call to action, and search-engine text.",
    fields: [
      { key: "title", label: "Page title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "ctaLabel", label: "Button label", type: "text" },
      { key: "seoTitle", label: "SEO title", type: "text", help: SEO_TITLE_HELP },
      { key: "seoDescription", label: "SEO description", type: "textarea", help: SEO_DESC_HELP },
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
      { key: "seoTitle", label: "SEO title", type: "text", help: SEO_TITLE_HELP },
      { key: "seoDescription", label: "SEO description", type: "textarea", help: SEO_DESC_HELP },
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
    label: "Interest rates",
    description: "The full state interest-rate table, its intro copy, and the sources note.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "seoTitle", label: "SEO title", type: "text", help: SEO_TITLE_HELP },
      { key: "seoDescription", label: "SEO description", type: "textarea", help: SEO_DESC_HELP },
      {
        key: "rows",
        label: "Rates table",
        type: "items",
        itemLabel: "Row",
        help: "Model: lien, hybrid, or deed. Leave a row's minimum as — when it does not apply.",
        fields: [
          { key: "state", label: "State", type: "text", placeholder: "Florida" },
          {
            key: "model",
            label: "Model",
            type: "select",
            options: [
              { value: "lien", label: "Lien" },
              { value: "hybrid", label: "Hybrid" },
              { value: "deed", label: "Deed" },
            ],
          },
          { key: "rate", label: "Max investor rate", type: "text", placeholder: "18% max" },
          { key: "how", label: "How set", type: "text", placeholder: "Bid down at auction" },
          { key: "min", label: "Minimum", type: "text", placeholder: "5%" },
          { key: "note", label: "Note", type: "text", placeholder: "Optional" },
        ],
      },
      { key: "sourcesNote", label: "Sources & disclaimer", type: "textarea" },
    ],
  },
  {
    slug: "resources",
    label: "Investor guides",
    description: "The guide library shown on the resources page, grouped into sections.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "seoTitle", label: "SEO title", type: "text", help: SEO_TITLE_HELP },
      { key: "seoDescription", label: "SEO description", type: "textarea", help: SEO_DESC_HELP },
      {
        key: "sections",
        label: "Sections",
        type: "items",
        itemLabel: "Section",
        help: "Group order on the page follows the order of the guides below.",
        fields: [
          { key: "title", label: "Title", type: "text", placeholder: "Getting Started" },
          { key: "subtitle", label: "Subtitle", type: "text" },
          {
            key: "icon",
            label: "Icon",
            type: "select",
            options: ICON_OPTIONS(["book", "scroll", "file", "landmark", "help"]),
          },
        ],
      },
      {
        key: "guides",
        label: "Guides",
        type: "items",
        itemLabel: "Guide",
        help: "Section must match a section title above. Separate paragraphs with a blank line; one bullet per line. Leave link fields blank for no button.",
        fields: [
          {
            key: "section",
            label: "Section",
            type: "select",
            options: DEFAULT_GUIDE_SECTIONS.map((s) => ({ value: s.title, label: s.title })),
          },
          { key: "title", label: "Title", type: "text" },
          { key: "summary", label: "Summary", type: "text" },
          { key: "body", label: "Body (paragraphs separated by a blank line)", type: "textarea" },
          { key: "bullets", label: "Bullet points (one per line)", type: "textarea" },
          { key: "linkLabel", label: "Link label", type: "text", placeholder: "Read the FAQ" },
          { key: "linkTo", label: "Link path", type: "text", placeholder: "/faq" },
        ],
      },
    ],
  },
  {
    slug: "glossary",
    label: "Glossary",
    description: "The tax-lien term definitions shown on the glossary page.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      { key: "seoTitle", label: "SEO title", type: "text", help: SEO_TITLE_HELP },
      { key: "seoDescription", label: "SEO description", type: "textarea", help: SEO_DESC_HELP },
      {
        key: "terms",
        label: "Terms",
        type: "items",
        itemLabel: "Term",
        fields: [
          { key: "term", label: "Term", type: "text", placeholder: "Redemption" },
          { key: "def", label: "Definition", type: "textarea" },
        ],
      },
    ],
  },
  {
    slug: "help",
    label: "Help center",
    description: "The category cards shown on the help center page.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "title", label: "Page title", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "seoTitle", label: "SEO title", type: "text", help: SEO_TITLE_HELP },
      { key: "seoDescription", label: "SEO description", type: "textarea", help: SEO_DESC_HELP },
      {
        key: "cats",
        label: "Categories",
        type: "items",
        itemLabel: "Category",
        fields: [
          {
            key: "icon",
            label: "Icon",
            type: "select",
            options: ICON_OPTIONS(["book", "gavel", "wallet", "shield", "landmark", "lifebuoy"]),
          },
          { key: "title", label: "Title", type: "text" },
          { key: "desc", label: "Description", type: "textarea" },
          { key: "to", label: "Link path", type: "text", placeholder: "/faq" },
        ],
      },
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
      { key: "seoTitle", label: "SEO title", type: "text", help: SEO_TITLE_HELP },
      { key: "seoDescription", label: "SEO description", type: "textarea", help: SEO_DESC_HELP },
      {
        key: "email",
        label: "Support email",
        type: "text",
        help: "Leave blank to use the support email from Site settings.",
      },
      { key: "hours", label: "Support hours", type: "text" },
      { key: "hoursNote", label: "Support hours note", type: "text" },
    ],
  },
  {
    slug: "about",
    label: "About page",
    description:
      "Every section of the About page — headline, stats, value cards, and call to action.",
    fields: [
      { key: "eyebrow", label: "Eyebrow badge", type: "text" },
      { key: "title", label: "Headline", type: "text" },
      { key: "intro", label: "Intro paragraph", type: "textarea" },
      { key: "seoTitle", label: "SEO title", type: "text", help: SEO_TITLE_HELP },
      { key: "seoDescription", label: "SEO description", type: "textarea", help: SEO_DESC_HELP },
      {
        key: "stats",
        label: "Stats band",
        type: "items",
        itemLabel: "Stat",
        fields: [
          { key: "value", label: "Value", type: "text", placeholder: "12+" },
          { key: "label", label: "Label", type: "text", placeholder: "Counties" },
        ],
      },
      { key: "investorsTitle", label: '"Built for investors" heading', type: "text" },
      { key: "investorsBody", label: '"Built for investors" intro', type: "textarea" },
      {
        key: "values",
        label: "Value cards",
        type: "items",
        itemLabel: "Card",
        fields: [
          {
            key: "icon",
            label: "Icon",
            type: "select",
            options: ICON_OPTIONS(["lock", "shield", "chart", "globe"]),
          },
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
        ],
      },
      { key: "whyTitle", label: '"Why tax liens?" heading', type: "text" },
      {
        key: "whyBodies",
        label: '"Why tax liens?" paragraphs',
        type: "items",
        itemLabel: "Paragraph",
        help: "Wrap text in **double asterisks** to make it bold.",
        fields: [{ key: "text", label: "Text", type: "textarea" }],
      },
      { key: "chooseTitle", label: "Differentiators heading", type: "text" },
      {
        key: "diffs",
        label: "Differentiator cards",
        type: "items",
        itemLabel: "Card",
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Body", type: "textarea" },
        ],
      },
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

// Draft-preview support: the admin "Preview" button stores the unsaved draft in
// sessionStorage under `al-preview:<slug>` and opens the public page with
// `?preview=<slug>`. Only that browser tab (and only with the query param) sees
// the draft instead of the published content.
function readPreviewBody(slug: SiteContentSlug): Record<string, unknown> | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    if (new URLSearchParams(window.location.search).get("preview") !== slug) return undefined;
    const raw = window.sessionStorage.getItem(`al-preview:${slug}`);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

export type SiteContentFor<K extends SiteContentSlug> = (typeof SITE_CONTENT_DEFAULTS)[K];

export function useSiteContent<K extends SiteContentSlug>(slug: K): SiteContentFor<K> {
  const defaults = SITE_CONTENT_DEFAULTS[slug] as unknown as SiteContentFor<K>;
  const { data } = useQuery(siteContentQuery(slug));
  const preview = readPreviewBody(slug);
  const body = preview ?? data?.body;
  return mergeDefaults(
    defaults as unknown as Record<string, unknown>,
    body,
  ) as unknown as SiteContentFor<K>;
}

/** Parses a **bold**-marked paragraph for pages that store rich-ish text. */
export function renderBold(text: string): ReactNode[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) =>
      i % 2 === 1
        ? createElement("strong", { key: i }, part)
        : createElement(Fragment, { key: i }, part),
    );
}
