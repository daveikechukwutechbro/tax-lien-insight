// Demo-mode mock Supabase client. Serves in-memory data + a fake auth session so
// the entire site can be browsed without a real backend or Firebase setup yet.

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

const DEMO_STORAGE_KEY = "taxlien-demo-mode";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEMO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function enableDemoMode(): boolean {
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, "1");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("taxlien-demo-change"));
    }
    return true;
  } catch {
    return false;
  }
}

export function disableDemoMode(): void {
  try {
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("taxlien-demo-change"));
    }
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const now = new Date();
const iso = (daysFromNow: number, hours = 10) =>
  new Date(now.getTime() + daysFromNow * 86400000 + hours * 3600000).toISOString();
const pastIso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();

type County = { id: string; name: string; state: string; state_full: string };
type Auction = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "draft" | "scheduled" | "live" | "closed" | "canceled";
  county: County;
};
type Lien = {
  id: string;
  property_id: string;
  auction_id: string | null;
  taxes_owed: number;
  min_bid: number;
  starting_rate: number;
  current_rate: number | null;
  tax_year: number;
  redemption_period_months: number;
  status: "active" | "redeemed" | "canceled" | "expired";
};
type Property = {
  id: string;
  county_id: string;
  parcel_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: "residential" | "land" | "commercial";
  description: string | null;
  image_url: string | null;
  gallery_urls: string[];
  year_built: number | null;
  living_area_sqft: number | null;
  lot_size_acres: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  use_type: string | null;
  assessed_value: number | null;
  land_value: number | null;
  improvement_value: number | null;
  owner_name: string | null;
  owner_mailing_address: string | null;
  created_at: string;
};

const counties: County[] = [
  { id: "cnt-001", name: "Cook County", state: "IL", state_full: "Illinois" },
  { id: "cnt-002", name: "Los Angeles County", state: "CA", state_full: "California" },
  { id: "cnt-003", name: "Harris County", state: "TX", state_full: "Texas" },
  { id: "cnt-004", name: "Wayne County", state: "MI", state_full: "Michigan" },
  { id: "cnt-005", name: "Essex County", state: "NJ", state_full: "New Jersey" },
  { id: "cnt-006", name: "Orange County", state: "FL", state_full: "Florida" },
];

const properties: Property[] = [
  {
    id: "prop-001", county_id: "cnt-001", parcel_id: "11-22-33-44-5",
    address: "1834 S Throop St", city: "Chicago", state: "IL", zip: "60608",
    property_type: "residential",
    description: "Two-unit brick Greystone built in the early 1900s. Original woodwork, spacious rooms, and a fenced rear yard.",
    image_url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=60",
    gallery_urls: [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=60",
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=60",
    ],
    year_built: 1906, living_area_sqft: 3100, lot_size_acres: 0.08,
    bedrooms: 6, bathrooms: 2, use_type: "Multi-family (2 units)",
    assessed_value: 245000, land_value: 42000, improvement_value: 203000,
    owner_name: "Est. of Mary K. O'Connor",
    owner_mailing_address: "1834 S Throop St, Chicago, IL 60608",
    created_at: pastIso(40),
  },
  {
    id: "prop-002", county_id: "cnt-001", parcel_id: "16-01-302-011",
    address: "6721 S Normal Blvd", city: "Chicago", state: "IL", zip: "60621",
    property_type: "residential",
    description: "Single-family Englewood home with detached two-car garage and large lot.",
    image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=60",
    gallery_urls: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=60",
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&q=60",
    ],
    year_built: 1922, living_area_sqft: 1500, lot_size_acres: 0.14,
    bedrooms: 3, bathrooms: 1, use_type: "Single-family",
    assessed_value: 98000, land_value: 15000, improvement_value: 83000,
    owner_name: "James R. Whitfield",
    owner_mailing_address: "6721 S Normal Blvd, Chicago, IL 60621",
    created_at: pastIso(35),
  },
  {
    id: "prop-003", county_id: "cnt-002", parcel_id: "850-0109-032-00",
    address: "9230 S Hobart Blvd", city: "Los Angeles", state: "CA", zip: "90061",
    property_type: "residential",
    description: "Mid-century single-family home on a wide corner lot in South LA.",
    image_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=60",
    gallery_urls: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=60",
    ],
    year_built: 1952, living_area_sqft: 1280, lot_size_acres: 0.21,
    bedrooms: 3, bathrooms: 2, use_type: "Single-family",
    assessed_value: 310000, land_value: 140000, improvement_value: 170000,
    owner_name: "Luis A. Mendez",
    owner_mailing_address: "9230 S Hobart Blvd, Los Angeles, CA 90061",
    created_at: pastIso(30),
  },
  {
    id: "prop-004", county_id: "cnt-003", parcel_id: "045-852-000-001-1",
    address: "4501 Aldine Mail Route Rd", city: "Houston", state: "TX", zip: "77039",
    property_type: "commercial",
    description: "Retail strip center corner parcel with frontage on Aldine Mail Route Road.",
    image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=60",
    gallery_urls: [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=60",
    ],
    year_built: 1978, living_area_sqft: 8400, lot_size_acres: 0.85,
    bedrooms: null, bathrooms: null, use_type: "Retail",
    assessed_value: 685000, land_value: 210000, improvement_value: 475000,
    owner_name: "Aldine Mall Associates, LLC",
    owner_mailing_address: "PO Box 88912, Houston, TX 77288",
    created_at: pastIso(25),
  },
  {
    id: "prop-005", county_id: "cnt-004", parcel_id: "20-11-0034-0080",
    address: "3118 W Grand Blvd", city: "Detroit", state: "MI", zip: "48238",
    property_type: "residential",
    description: "Brick bungalow with a rear wood-frame addition. Solid bones, needs renovation.",
    image_url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=60",
    gallery_urls: [
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=60",
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=60",
    ],
    year_built: 1924, living_area_sqft: 1450, lot_size_acres: 0.11,
    bedrooms: 3, bathrooms: 1, use_type: "Single-family",
    assessed_value: 54000, land_value: 8000, improvement_value: 46000,
    owner_name: "Hattie B. Washington",
    owner_mailing_address: "3118 W Grand Blvd, Detroit, MI 48238",
    created_at: pastIso(20),
  },
  {
    id: "prop-006", county_id: "cnt-005", parcel_id: "06-0402-0001-0023",
    address: "47 Elizabeth Ave", city: "Newark", state: "NJ", zip: "07108",
    property_type: "residential",
    description: "Three-family frame house with full basement and landscaped yard.",
    image_url: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=60",
    gallery_urls: [
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=60",
    ],
    year_built: 1910, living_area_sqft: 3600, lot_size_acres: 0.07,
    bedrooms: 9, bathrooms: 3, use_type: "Multi-family (3 units)",
    assessed_value: 265000, land_value: 60000, improvement_value: 205000,
    owner_name: "Irene M. Delgado",
    owner_mailing_address: "47 Elizabeth Ave, Newark, NJ 07108",
    created_at: pastIso(15),
  },
  {
    id: "prop-007", county_id: "cnt-006", parcel_id: "19-44-28-000-000-0140",
    address: "8800 W Southpointe Blvd", city: "Orlando", state: "FL", zip: "32827",
    property_type: "land",
    description: "Vacant residential lot in a developing Lake Nona-area subdivision.",
    image_url: null,
    gallery_urls: [],
    year_built: null, living_area_sqft: null, lot_size_acres: 0.31,
    bedrooms: null, bathrooms: null, use_type: "Vacant lot",
    assessed_value: 72000, land_value: 72000, improvement_value: 0,
    owner_name: "Lake Nona Dev Partners, LP",
    owner_mailing_address: "14 N Orange Ave, Orlando, FL 32801",
    created_at: pastIso(12),
  },
  {
    id: "prop-008", county_id: "cnt-002", parcel_id: "4013-020-024",
    address: "1125 W 18th St", city: "Los Angeles", state: "CA", zip: "90015",
    property_type: "land",
    description: "Downtown infill lot zoned for mixed residential/commercial.",
    image_url: null,
    gallery_urls: [],
    year_built: null, living_area_sqft: null, lot_size_acres: 0.19,
    bedrooms: null, bathrooms: null, use_type: "Vacant lot",
    assessed_value: 560000, land_value: 560000, improvement_value: 0,
    owner_name: "Central City Holdings LLC",
    owner_mailing_address: "1125 W 18th St C/O Agent, Los Angeles, CA 90015",
    created_at: pastIso(10),
  },
  {
    id: "prop-009", county_id: "cnt-001", parcel_id: "20-29-102-012-0000",
    address: "4411 S Bishop St", city: "Chicago", state: "IL", zip: "60609",
    property_type: "residential",
    description: "Two-flat with updated roof and newer mechanicals. Rents current.",
    image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=60",
    gallery_urls: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=60",
    ],
    year_built: 1915, living_area_sqft: 2800, lot_size_acres: 0.06,
    bedrooms: 5, bathrooms: 2, use_type: "Multi-family (2 units)",
    assessed_value: 210000, land_value: 38000, improvement_value: 172000,
    owner_name: "Samuel T. Brooks",
    owner_mailing_address: "4411 S Bishop St, Chicago, IL 60609",
    created_at: pastIso(8),
  },
  {
    id: "prop-010", county_id: "cnt-003", parcel_id: "129-340-001-0001",
    address: "2901 Westheimer Rd", city: "Houston", state: "TX", zip: "77098",
    property_type: "commercial",
    description: "High-visibility office/retail building along Westheimer corridor.",
    image_url: "https://images.unsplash.com/photo-1554435493-93422e8220c8?w=600&q=60",
    gallery_urls: [
      "https://images.unsplash.com/photo-1554435493-93422e8220c8?w=600&q=60",
    ],
    year_built: 1965, living_area_sqft: 12000, lot_size_acres: 0.42,
    bedrooms: null, bathrooms: null, use_type: "Office/Retail",
    assessed_value: 1420000, land_value: 620000, improvement_value: 800000,
    owner_name: "Westheimer Partners, LP",
    owner_mailing_address: "2901 Westheimer Rd, Houston, TX 77098",
    created_at: pastIso(5),
  },
];

const auctions: Auction[] = [
  {
    id: "auc-001", title: "Cook County Spring Tax Lien Sale",
    starts_at: iso(7, 9), ends_at: iso(9, 17), status: "scheduled",
    county: counties[0],
  },
  {
    id: "auc-002", title: "LA County Delinquent Tax Auction",
    starts_at: iso(3, 10), ends_at: iso(4, 16), status: "scheduled",
    county: counties[1],
  },
  {
    id: "auc-003", title: "Harris County Tax Lien Certificate Sale",
    starts_at: iso(-2, 8), ends_at: iso(-1, 20), status: "live",
    county: counties[2],
  },
  {
    id: "auc-004", title: "Wayne County Annual Lien Auction",
    starts_at: iso(-20, 9), ends_at: iso(-19, 18), status: "closed",
    county: counties[3],
  },
];

const liens: Lien[] = properties.map((p, i) => ({
  id: `lien-${String(i + 1).padStart(3, "0")}`,
  property_id: p.id,
  auction_id:
    i % 4 === 0 ? "auc-001"
    : i % 4 === 1 ? "auc-002"
    : i % 4 === 2 ? "auc-003"
    : "auc-004",
  taxes_owed: 4500 + i * 1830,
  min_bid: 900 + i * 380,
  starting_rate: 4 + (i % 7) / 2,
  current_rate: i % 3 === 0 ? null : 8 - (i % 4) * 0.4,
  tax_year: 2024 - (i % 2),
  redemption_period_months: 24,
  status: i % 5 === 4 ? "expired" : "active",
}));

const bids = [
  {
    id: "bid-001", user_id: DEMO_USER_ID, lien_id: "lien-003",
    interest_rate: 5.5, status: "winning",
    placed_at: pastIso(2),
  },
  {
    id: "bid-002", user_id: DEMO_USER_ID, lien_id: "lien-001",
    interest_rate: 4.75, status: "outbid",
    placed_at: pastIso(4),
  },
  {
    id: "bid-003", user_id: DEMO_USER_ID, lien_id: "lien-004",
    interest_rate: 6.0, status: "won",
    placed_at: pastIso(15),
  },
  {
    id: "bid-004", user_id: DEMO_USER_ID, lien_id: "lien-007",
    interest_rate: 7.25, status: "won",
    placed_at: pastIso(18),
  },
];

const profiles = [
  {
    id: DEMO_USER_ID, full_name: "Demo Bidder", email: "demo@taxlieninsight.com",
    account_balance: 18400.5, verified: true, phone: "(312) 555-0187",
    created_at: pastIso(60),
  },
  {
    id: "00000000-0000-0000-0000-000000000002", full_name: "Jane Administrator", email: "admin@taxlieninsight.com",
    account_balance: 0, verified: true, phone: null, created_at: pastIso(120),
  },
  {
    id: "00000000-0000-0000-0000-000000000003", full_name: "Robert Investor", email: "robert@example.com",
    account_balance: 6400, verified: true, phone: "(214) 555-0192", created_at: pastIso(45),
  },
  {
    id: "00000000-0000-0000-0000-000000000004", full_name: "Susan First-Time", email: "susan@example.com",
    account_balance: 250, verified: false, phone: null, created_at: pastIso(10),
  },
];

const watchlist = [
  { id: "wl-001", user_id: DEMO_USER_ID, property_id: "prop-002", created_at: pastIso(3) },
  { id: "wl-002", user_id: DEMO_USER_ID, property_id: "prop-006", created_at: pastIso(2) },
];

const notifications = [
  {
    id: "ntf-001", user_id: DEMO_USER_ID, title: "You've been outbid", body: "Your bid on 1834 S Throop St is no longer the highest.",
    kind: "warning", link: "/properties/prop-001", read_at: null, created_at: pastIso(1),
  },
  {
    id: "ntf-002", user_id: DEMO_USER_ID, title: "Auction starting soon", body: "Cook County Spring Tax Lien Sale starts tomorrow at 9:00 AM CT.",
    kind: "info", link: "/auctions/auc-001", read_at: pastIso(1), created_at: pastIso(2),
  },
  {
    id: "ntf-003", user_id: DEMO_USER_ID, title: "Identity verified", body: "Your account has been verified. You can now bid.",
    kind: "success", link: "/dashboard/verify", read_at: null, created_at: pastIso(6),
  },
];

const fund_requests = [
  {
    id: "fr-001", user_id: DEMO_USER_ID, amount: 2500, method: "Bank Transfer",
    status: "approved", created_at: pastIso(5),
  },
  {
    id: "fr-002", user_id: DEMO_USER_ID, amount: 5000, method: "Wire",
    status: "pending", created_at: pastIso(1),
  },
];

const messages = [
  {
    id: "msg-001", user_id: DEMO_USER_ID, subject: "Welcome to TaxLien Auctions", body: "Thanks for joining. Get in touch with any questions!",
    read_at: pastIso(5), created_at: pastIso(6),
  },
];

const documents = properties.slice(0, 4).map((p, i) => ({
  id: `doc-${String(i + 1).padStart(3, "0")}`,
  property_id: p.id,
  kind: i % 2 === 0 ? "tax_bill" : "deed",
  name: `${p.address} — ${i % 2 === 0 ? "Delinquent Tax Bill" : "Copy of Deed"}`,
  url: "/placeholder-document.pdf",
  created_at: pastIso(3 + i),
}));

const kyc_submissions = [
  {
    id: "kyc-001", user_id: DEMO_USER_ID, legal_name: "Demo Bidder", date_of_birth: "1990-04-15",
    address_line1: "1 Demo Way", city: "Chicago", state: "IL", postal_code: "60601",
    country: "US", tax_id_last4: "1234", status: "approved", admin_notes: null,
    reviewed_at: pastIso(6), created_at: pastIso(9),
  },
  {
    id: "kyc-002", user_id: "00000000-0000-0000-0000-000000000003", legal_name: "Robert Investor", date_of_birth: "1985-01-01",
    address_line1: "2 Main St", city: "Houston", state: "TX", postal_code: "77002",
    country: "US", tax_id_last4: "9876", status: "pending", admin_notes: null,
    reviewed_at: null, created_at: pastIso(1),
  },
];

const saved_searches = [
  { id: "ss-001", user_id: DEMO_USER_ID, query: "bungalow near Detroit", created_at: pastIso(4) },
  { id: "ss-002", user_id: DEMO_USER_ID, query: "vacant lots Orlando", created_at: pastIso(2) },
];

const auction_registrations = [
  { id: "ar-001", auction_id: "auc-001", user_id: DEMO_USER_ID, created_at: pastIso(2) },
];

const admin_logs = [
  { id: "al-001", actor_user_id: DEMO_USER_ID, action: "kyc_approve", target_table: "kyc_submissions", target_id: "kyc-001", meta: { user_id: DEMO_USER_ID }, created_at: pastIso(6) },
  { id: "al-002", actor_user_id: DEMO_USER_ID, action: "fund_approve", target_table: "fund_requests", target_id: "fr-001", meta: null, created_at: pastIso(5) },
  { id: "al-003", actor_user_id: "00000000-0000-0000-0000-000000000002", action: "user_suspend", target_table: "profiles", target_id: "00000000-0000-0000-0000-000000000005", meta: null, created_at: pastIso(3) },
];

const user_roles = [
  { user_id: DEMO_USER_ID, role: "admin" },
  { user_id: "00000000-0000-0000-0000-000000000002", role: "admin" },
  { user_id: "00000000-0000-0000-0000-000000000003", role: "bidder" },
  { user_id: "00000000-0000-0000-0000-000000000004", role: "bidder" },
];

// In-memory database (mutations live for the page session).
const db: Record<string, Record<string, unknown>[]> = {
  counties: [...counties],
  properties: [...properties],
  liens: [...liens],
  auctions: [...auctions],
  bids: [...bids],
  profiles: [...profiles],
  watchlist: [...watchlist],
  notifications: [...notifications],
  fund_requests: [...fund_requests],
  messages: [...messages],
  documents: [...documents],
  kyc_submissions: [...kyc_submissions],
  saved_searches: [...saved_searches],
  auction_registrations: [...auction_registrations],
  admin_logs: [...admin_logs],
  user_roles: [...user_roles],
};

// Pre-join rows with the nested shapes the app's selects expect.
function propertyRow(p: Property) {
  const county = counties.find((c) => c.id === p.county_id)!;
  const pliens = liens.filter((l) => l.property_id === p.id).map((l) => {
    const auction = auctions.find((a) => a.id === l.auction_id) ?? null;
    return { ...l, auction: auction ? { id: auction.id, title: auction.title, starts_at: auction.starts_at, ends_at: auction.ends_at, status: auction.status } : null };
  });
  return { ...p, county: { id: county.id, name: county.name, state: county.state, state_full: county.state_full }, liens: pliens };
}

function auctionRow(a: Auction) {
  const aliens = liens.filter((l) => l.auction_id === a.id).map((l) => {
    const p = properties.find((pr) => pr.id === l.property_id)!;
    return { ...l, taxes_owed: l.taxes_owed, status: l.status, property: { id: p.id, parcel_id: p.parcel_id, address: p.address, city: p.city, state: p.state, zip: p.zip, property_type: p.property_type, image_url: p.image_url } };
  });
  return { ...a, county: { ...a.county }, liens: aliens };
}

function lienWithRelations(l: Lien) {
  const p = properties.find((pr) => pr.id === l.property_id)!;
  const a = auctions.find((x) => x.id === l.auction_id) ?? null;
  return {
    ...l,
    property: {
      id: p.id, parcel_id: p.parcel_id, address: p.address, city: p.city, state: p.state,
      zip: p.zip, property_type: p.property_type, description: p.description, image_url: p.image_url,
      county: counties.find((c) => c.id === p.county_id),
    },
    auction: a ? { id: a.id, title: a.title, starts_at: a.starts_at, ends_at: a.ends_at, status: a.status } : null,
  };
}

function countyRow(c: County) {
  const cprops = properties.filter((p) => p.county_id === c.id);
  const cauctions = auctions.filter((a) => a.county.id === c.id);
  return {
    ...c,
    properties: cprops.map((p) => ({ id: p.id })),
    auctions: cauctions.map((a) => ({ id: a.id, starts_at: a.starts_at, status: a.status })),
  };
}

function bidRow(b: (typeof bids)[number]) {
  const lien = liens.find((l) => l.id === b.lien_id);
  const rel = lien ? lienWithRelations(lien) : null;
  return {
    ...b,
    lien: rel
      ? {
          id: rel.id,
          taxes_owed: rel.taxes_owed,
          current_rate: rel.current_rate,
          starting_rate: rel.starting_rate,
          property: rel.property,
          auction: rel.auction,
        }
      : null,
  };
}

function watchlistRow(w: (typeof watchlist)[number]) {
  const p = properties.find((pr) => pr.id === w.property_id);
  return { ...w, property: p ? propertyRow(p) : null };
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------

type Filter = { op: "eq" | "neq" | "in" | "ilike" | "or"; col?: string; value?: unknown };
type OrderBy = { col: string; ascending: boolean };

class MockQuery {
  private table: string;
  private filters: Filter[] = [];
  private orderBy: OrderBy[] = [];
  private limitN: number | null = null;
  private singleMode: "single" | "maybeSingle" | null = null;
  private countMode: "exact" | null = null;
  private headMode = false;
  private pendingInsert: Record<string, unknown>[] = [];
  private pendingUpdate: Record<string, unknown> | null = null;
  private pendingDelete = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns?: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    this.countMode = (opts?.count === "exact" ? "exact" : null);
    this.headMode = opts?.head ?? false;
    return this;
  }

  eq(col: string, value: unknown) {
    this.filters.push({ op: "eq", col, value });
    return this;
  }

  neq(col: string, value: unknown) {
    this.filters.push({ op: "neq", col, value });
    return this;
  }

  in(col: string, values: unknown[]) {
    this.filters.push({ op: "in", col, value: values });
    return this;
  }

  ilike(col: string, pattern: string) {
    this.filters.push({ op: "ilike", col, value: pattern });
    return this;
  }

  or(orString: string) {
    this.filters.push({ op: "or", value: orString });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy.push({ col, ascending: opts?.ascending ?? true });
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
    const list = Array.isArray(rows) ? rows : [rows];
    const table = db[this.table];
    if (Array.isArray(table)) {
      for (const row of list) {
        table.push({
          id: row.id ?? `mock-${this.table}-${Math.random().toString(36).slice(2, 10)}`,
          created_at: row.created_at ?? new Date().toISOString(),
          ...row,
        });
      }
    }
    this.pendingInsert = list;
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.pendingUpdate = patch;
    return this;
  }

  delete() {
    this.pendingDelete = true;
    return this;
  }

  private matches(row: Record<string, unknown>): boolean {
    for (const f of this.filters) {
      if (f.op === "or") {
        const clauses = String(f.value).split(",").map((c) => c.trim());
        const anyMatch = clauses.some((clause) => {
          const m = clause.match(/^([a-z_.]+)(ilike|eq|neq|like|gt|lt|gte|lte)\.(.*)$/i);
          if (!m) return false;
          const col = m[1];
          const val = String(m[3]).replace(/^%/, "").replace(/%$/, "").toLowerCase();
          const cellVal = String((row as Record<string, unknown>)[col] ?? "");
          if (m[2].toLowerCase() === "ilike" || m[2].toLowerCase() === "like") return cellVal.toLowerCase().includes(val);
          return cellVal === val;
        });
        if (!anyMatch) return false;
        continue;
      }
      const actual = (row as Record<string, unknown>)[f.col ?? ""];
      if (f.op === "eq" && actual !== f.value) return false;
      if (f.op === "neq" && actual === f.value) return false;
      if (f.op === "in" && !(f.value as unknown[]).includes(actual)) return false;
      if (f.op === "ilike") {
        const pattern = String(f.value).replace(/^%/, "").replace(/%$/, "").toLowerCase();
        if (!String(actual ?? "").toLowerCase().includes(pattern)) return false;
      }
    }
    return true;
  }

  private run(): { data: unknown; error: null | { message: string }; count?: number } {
    const table = db[this.table];
    if (!Array.isArray(table)) return { data: [], error: null };

    let rows =
      this.table === "properties" ? table.map((p) => propertyRow(p as unknown as Property))
      : this.table === "auctions" ? table.map((a) => auctionRow(a as unknown as Auction))
      : this.table === "liens" ? table.map((l) => lienWithRelations(l as unknown as Lien))
      : this.table === "counties" ? table.map((c) => countyRow(c as unknown as County))
      : this.table === "bids" ? table.map((r) => bidRow(r as unknown as (typeof bids)[number]))
      : this.table === "watchlist" ? table.map((r) => watchlistRow(r as unknown as (typeof watchlist)[number]))
      : table.map((r) => r);

    rows = rows.filter((r) => this.matches(r as Record<string, unknown>));

    if (this.pendingDelete) {
      for (let i = table.length - 1; i >= 0; i--) {
        const direct = table[i] as Record<string, unknown>;
        let ok = true;
        for (const f of this.filters) {
          // Only simple equality filters are honoured against raw rows.
          if (f.op === "eq" && direct[f.col ?? ""] !== f.value) ok = false;
        }
        if (ok) table.splice(i, 1);
      }
      return { data: null, error: null };
    }

    for (const ob of this.orderBy) {
      rows = [...rows].sort((a, b) => {
        const av = (a as Record<string, unknown>)[ob.col];
        const bv = (b as Record<string, unknown>)[ob.col];
        if (av === bv) return 0;
        const cmp = av == null ? 1 : bv == null ? -1 : String(av) < String(bv) ? -1 : 1;
        return ob.ascending ? cmp : -cmp;
      });
    }

    if (this.limitN != null) rows = rows.slice(0, this.limitN);

    if (this.pendingUpdate) {
      for (const r of rows) Object.assign(r, { ...this.pendingUpdate });
      return { data: [], error: null };
    }
    if (this.pendingInsert.length) {
      const inserted = this.pendingInsert;
      if (this.singleMode) return { data: inserted[0] ?? null, error: null };
      return { data: inserted, error: null };
    }

    if (this.headMode || this.countMode) {
      return { data: null, error: null, count: rows.length };
    }

    if (this.singleMode === "single" && rows.length === 0) {
      return { data: null, error: { message: "No rows found" } };
    }
    if (this.singleMode) return { data: rows[0] ?? null, error: rows.length === 0 && this.singleMode === "single" ? { message: "No rows found" } : null };
    return { data: rows, error: null };
  }

  then(onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
    return Promise.resolve(this.run()).then(onFulfilled, onRejected);
  }
}

// ---------------------------------------------------------------------------
// Mock auth
// ---------------------------------------------------------------------------

const demoUser = {
  id: DEMO_USER_ID,
  email: "demo@taxlieninsight.com",
  app_metadata: {},
  user_metadata: { full_name: "Demo Bidder" },
  aud: "authenticated",
  created_at: pastIso(60),
  updated_at: pastIso(0),
  role: "authenticated",
};

const demoSession = {
  access_token: "demo-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(now.getTime() / 1000) + 3600,
  refresh_token: "demo-refresh-token",
  user: { ...demoUser },
};

type AuthListener = (event: string, session: unknown) => void;
let authListeners: AuthListener[] = [];

function notifyAuth(event: string, session: unknown) {
  for (const cb of authListeners) cb(event, session);
}

function sessionForMode(): typeof demoSession | null {
  return isDemoMode() ? demoSession : null;
}

function userForMode(): typeof demoUser | null {
  return isDemoMode() ? demoUser : null;
}

// ---------------------------------------------------------------------------
// Per-user seeding (used by real Firebase auth so new users aren't empty)
// ---------------------------------------------------------------------------

export function seedFirebaseUser(userId: string, email?: string) {
  const profiles = db["profiles"];
  if (Array.isArray(profiles) && !profiles.some((p) => (p as { id: string }).id === userId)) {
    profiles.push({
      id: userId,
      full_name: email?.split("@")[0] ?? "Bidder",
      email: email ?? null,
      account_balance: 12500,
      verified: true,
      phone: null,
      created_at: new Date().toISOString(),
    });
  }

  const bids = db["bids"];
  if (Array.isArray(bids) && !bids.some((b) => (b as { user_id: string }).user_id === userId)) {
    const liensForUser = (db["liens"] as Record<string, unknown>[] ?? []).slice(0, 3);
    liensForUser.forEach((lien, i) => {
      bids.push({
        id: `bid-${userId.slice(0, 6)}-${i}`,
        user_id: userId,
        lien_id: lien.id,
        interest_rate: 5 + i * 0.5,
        status: i === 0 ? "winning" : i === 1 ? "outbid" : "won",
        placed_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
      });
    });
  }

  const watchlist = db["watchlist"];
  if (Array.isArray(watchlist)) {
    const props = (db["properties"] as Record<string, unknown>[] ?? []).slice(0, 2);
    props.forEach((prop, i) => {
      const key = (p: Record<string, unknown>) => `${p.user_id}|${p.property_id}`;
      if (!watchlist.some((w) => key(w as Record<string, unknown>) === key({ user_id: userId, property_id: prop.id }))) {
        watchlist.push({
          id: `wl-${userId.slice(0, 6)}-${i}`,
          user_id: userId,
          property_id: prop.id,
          created_at: new Date().toISOString(),
        });
      }
    });
  }

  const notifications = db["notifications"];
  if (Array.isArray(notifications) && !notifications.some((n) => (n as { user_id: string }).user_id === userId)) {
    notifications.push({
      id: `ntf-${userId.slice(0, 6)}-0`,
      user_id: userId,
      title: "Welcome to TaxLien Auctions",
      body: "Your account is ready. Add funds and start bidding on secured tax lien certificates.",
      kind: "info",
      link: "/dashboard/funds",
      read_at: null,
      created_at: new Date().toISOString(),
    });
  }
}

// ---------------------------------------------------------------------------
// Public mock client
// ---------------------------------------------------------------------------

export const mockSupabase = {
  auth: {
    getSession: async () => ({ data: { session: sessionForMode() }, error: null }),
    getUser: async () => ({ data: { user: userForMode() }, error: null }),
    onAuthStateChange: (cb: AuthListener) => {
      authListeners.push(cb);
      return { data: { subscription: { unsubscribe: () => { authListeners = authListeners.filter((l) => l !== cb); } } } };
    },
    signInWithPassword: async ({ email }: { email: string }) => {
      enableDemoMode();
      notifyAuth("SIGNED_IN", demoSession);
      return { data: { user: demoUser, session: demoSession }, error: null };
    },
    signUp: async () => {
      enableDemoMode();
      notifyAuth("SIGNED_IN", demoSession);
      return { data: { user: demoUser, session: demoSession }, error: null };
    },
    signOut: async () => {
      disableDemoMode();
      notifyAuth("SIGNED_OUT", null);
      return { error: null };
    },
    setSession: async () => {
      enableDemoMode();
      return { data: { session: demoSession }, error: null };
    },
    getClaims: async () => ({ data: { claims: { sub: DEMO_USER_ID } }, error: null }),
    getAdminToken: async () => ({ data: { token: null }, error: null }),
    installAuth: async () => ({}),
  },
  from: (table: string) => new MockQuery(table),
  rpc: async (fn: string, args?: Record<string, unknown>) => {
    switch (fn) {
      case "has_role":
        return { data: true, error: null };
      case "claim_first_admin":
        return { data: true, error: null };
      case "place_bid": {
        const t = db["bids"];
        if (Array.isArray(t)) {
          t.push({
            id: `bid-${Math.random().toString(36).slice(2, 10)}`,
            user_id: DEMO_USER_ID,
            lien_id: args?._lien_id,
            interest_rate: args?._interest_rate,
            status: "winning",
            placed_at: new Date().toISOString(),
          });
        }
        return { data: null, error: null };
      }
      case "review_kyc":
      case "approve_fund_request":
      case "admin_delete_registration":
      case "admin_set_role":
      case "admin_set_verified":
      case "admin_adjust_balance":
      case "admin_send_message":
        return { data: null, error: null };
      case "get_bid_eligibility":
        return { data: { eligible: true, reasons: [] }, error: null };
      case "place_bid_secure": {
        const t = db["bids"];
        if (Array.isArray(t)) {
          t.push({
            id: `bid-${Math.random().toString(36).slice(2, 10)}`,
            user_id: DEMO_USER_ID,
            lien_id: args?._lien_id,
            interest_rate: args?._interest_rate,
            status: "winning",
            lifecycle: "accepted",
            placed_at: new Date().toISOString(),
          });
        }
        return {
          data: { success: true, code: "BID_ACCEPTED", bid_id: `bid-${Math.random().toString(36).slice(2, 10)}` },
          error: null,
        };
      }
      case "get_user_dashboard_summary":
        return {
          data: {
            bids: { count: 7, active: 4, winning: 2, outbid: 1, lost: 0 },
            awards: { count: 2, principal_value: 18475.0 },
            funds: { available: 12500.0, held: 6400.0, pending: 0 },
            payments: { pending: 1850.0, paid: 9530.0 },
            redemptions: { active: 1, completed: 1, realized_interest: 431.5 },
            certificates: { pending: 1 },
          },
          error: null,
        };
      case "get_user_bid_metrics":
      case "get_user_funds_summary":
      case "get_user_certificate_summary":
      case "get_user_redemption_summary":
      case "get_certificate_public_verification":
      case "get_jurisdiction_rules":
      case "get_available_balance":
        return { data: null, error: null };
      default:
        return { data: null, error: null };
    }
  },
};