// Real data client for the Auction Ledger backend Worker.
// All requests are same-origin (the Vercel proxy forwards /api/v1/* to the
// Worker) so the session cookie flows automatically.

import { request, type BackendUser } from "@/lib/backend-auth";

export async function getMe(): Promise<BackendUser | null> {
  return request<BackendUser | null>("/api/v1/me").catch(() => null);
}

export type ProfilePatch = {
  fullName?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  avatarData?: string;
};

export async function updateProfile(patch: ProfilePatch): Promise<BackendUser> {
  return request<BackendUser>("/api/v1/me/profile", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export type DashboardSummary = {
  bids: { count: number; active: number; winning: number; outbid: number; lost: number };
  awards: { count: number; principalValue: number };
  funds: { available: number; held: number; pending: number };
  payments: { pending: number; paid: number };
  certificates: { issued: number; active: number; redeemed: number };
  redemptions: { active: number; completed: number; realizedInterest: number };
};

type SummaryEnvelope = {
  bids: { count: number; active: number; winning: number; outbid: number; lost: number };
  awards: { count: number; principalValue: string };
  funds: { available: string; held: string; pending: string };
  payments: { pending: string; paid: string };
  certificates: { issued: number; active: number; redeemed: number };
  redemptions: { active: number; completed: number; realizedInterest: string };
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const s = await request<SummaryEnvelope>("/api/v1/me/dashboard");
  const num = (v: string) => Number(v) || 0;
  return {
    bids: s.bids,
    awards: { count: s.awards.count, principalValue: num(s.awards.principalValue) },
    funds: { available: num(s.funds.available), held: num(s.funds.held), pending: num(s.funds.pending) },
    payments: { pending: num(s.payments.pending), paid: num(s.payments.paid) },
    certificates: s.certificates,
    redemptions: { active: s.redemptions.active, completed: s.redemptions.completed, realizedInterest: num(s.redemptions.realizedInterest) },
  };
}

export type UserBid = {
  bid_id: string;
  lienId: string | null;
  status: string;
  rate: number;
  amount: number;
  placed_at: string;
  property: {
    id?: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  } | null;
};

export async function getMyBids(): Promise<UserBid[]> {
  const rows = await request<RawBid[]>("/api/v1/my/bids");
  return rows.map((b) => ({
    bid_id: b.id,
    lienId: b.lot_id ?? b.id,
    status: b.status,
    rate: Number(b.rate) || 0,
    amount: Number(b.amount) || 0,
    placed_at: b.created_at,
    property:
      b.address != null
        ? {
            id: b.property_id,
            address: b.address,
            city: b.city,
            state: b.state,
            postal_code: b.postal_code,
          }
        : null,
  }));
}

type RawBid = {
  id: string;
  lot_id: string | null;
  auction_id: string | null;
  status: string;
  rate: number | string | null;
  amount: number | string | null;
  created_at: string;
  property_id?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
};

export type WatchedProperty = {
  id: string;
  auction_id?: string | null;
  lot_id?: string | null;
  property_id?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  starting_rate?: number | null;
  current_rate?: number | null;
  auction_starts_at?: string | null;
  created_at: string;
};

export async function getWatchlist(): Promise<WatchedProperty[]> {
  const rows = await request<(WatchedProperty & { starting_rate: number | string | null; current_rate: number | string | null })[]>("/api/v1/my/watchlist");
  return rows.map((w) => ({
    ...w,
    starting_rate: w.starting_rate != null ? Number(w.starting_rate) : null,
    current_rate: w.current_rate != null ? Number(w.current_rate) : null,
  }));
}

export async function removeWatchlistItem(id: string): Promise<void> {
  await request<{ deleted: boolean }>(`/api/v1/watchlist/${id}`, { method: "DELETE" });
}

export type FundsSummary = { available: number; held: number; pending: number };
export async function getFunds(): Promise<FundsSummary> {
  const s = await request<{ available: number | string; held: number | string; pending: number | string }>("/api/v1/my/funds");
  return {
    available: Number(s.available) || 0,
    held: Number(s.held) || 0,
    pending: Number(s.pending) || 0,
  };
}

export type Deposit = {
  id: string;
  network_code: string;
  asset_symbol: string;
  status: string;
  expected_amount: number | null;
  created_at: string;
};
export async function getDeposits(): Promise<Deposit[]> {
  const rows = await request<Deposit[]>("/api/v1/my/usdc/deposits");
  return rows.map((d) => ({ ...d, expected_amount: d.expected_amount != null ? Number(d.expected_amount) / 100 : null }));
}
export async function createUsdcDeposit(input: {
  networkCode: string;
  tokenSymbol?: string;
  expectedAmountCents: number;
}): Promise<{ id: string; status: string }> {
  const res = await request<{ depositId: string; status: string }>("/api/v1/usdc/deposits", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return { id: res.depositId, status: res.status };
}

export type Invoice = {
  id: string;
  total: number | string;
  status: string;
  description: string | null;
  created_at: string;
};
export async function getInvoices(): Promise<Invoice[]> {
  const rows = await request<Invoice[]>("/api/v1/my/invoices");
  return rows.map((r) => ({ ...r, total: Number(r.total) || 0 }));
}

export type Notification = {
  id: string;
  title: string | null;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};
export async function getNotifications(): Promise<Notification[]> {
  const rows = await request<Notification[]>("/api/v1/my/notifications");
  return rows.map((n) => ({
    id: n.id,
    title: n.title ?? n.body ?? "Notification",
    body: n.body ?? null,
    link: n.link ?? null,
    read_at: n.read_at ?? null,
    created_at: n.created_at,
  }));
}

export type SavedSearch = {
  id: string;
  name: string;
  filters: Record<string, string | boolean | undefined>;
  alerts_enabled: boolean;
  created_at: string;
};
export async function getSavedSearches(): Promise<SavedSearch[]> {
  const rows = await request<
    { id: string; name: string; filters_json?: string | null; query?: string | null; alerts_enabled: boolean; created_at: string }[]
  >("/api/v1/my/saved-searches");
  return rows.map((r) => {
    let filters: Record<string, string | boolean | undefined> = {};
    try {
      const parsed = r.filters_json ? JSON.parse(r.filters_json) : {};
      filters = typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      filters = {};
    }
    return { id: r.id, name: r.name, filters, alerts_enabled: Boolean(r.alerts_enabled), created_at: r.created_at };
  });
}
export async function saveSearch(input: { name: string; filters?: Record<string, unknown>; alertsEnabled?: boolean }): Promise<string> {
  const res = await request<{ id: string }>("/api/v1/saved-searches", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.id;
}
export async function deleteSavedSearch(id: string): Promise<void> {
  await request<{ deleted: boolean }>(`/api/v1/saved-searches/${id}`, { method: "DELETE" });
}

export type Message = {
  id: string;
  body: string;
  subject: string | null;
  sender_id: string | null;
  created_at: string;
};
export async function getMessages(): Promise<Message[]> {
  const rows = await request<Message[]>("/api/v1/my/messages");
  return rows;
}
export async function sendMessage(input: { body: string; subject?: string }): Promise<void> {
  await request<{ id: string }>("/api/v1/messages", { method: "POST", body: JSON.stringify(input) });
}

export type KycStatus = {
  id: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
} | null;
export async function getKycStatus(): Promise<KycStatus> {
  return request<KycStatus>("/api/v1/kyc/status");
}
export async function submitKyc(documents: { documentType: string; documentId: string }[]): Promise<string> {
  const res = await request<{ id: string }>("/api/v1/kyc/submit", {
    method: "POST",
    body: JSON.stringify({ documents }),
  });
  return res.id;
}

export async function createDocument(input: {
  bodyBase64: string;
  mimeType?: string;
  resourceType?: string;
  accessScope?: string;
}): Promise<string> {
  const res = await request<{ id: string }>("/api/v1/documents", {
    method: "POST",
    body: JSON.stringify({ ...input, accessScope: input.accessScope ?? "owner_only" }),
  });
  return res.id;
}

export type MyDocument = {
  id: string;
  resource_type: string;
  access_scope: string;
  created_at: string;
};
export async function getMyDocuments(): Promise<MyDocument[]> {
  return request<MyDocument[]>("/api/v1/my/documents");
}
export async function getDocumentUrl(id: string): Promise<string> {
  const res = await request<{ url: string }>(`/api/v1/documents/${id}/url`);
  return res.url;
}

export type Certificate = {
  id: string;
  certificate_number?: string | null;
  status: string;
  principal: number | string;
  interest_rate?: number | string | null;
  issued_at?: string | null;
  created_at: string;
};
export async function getCertificates(): Promise<Certificate[]> {
  const rows = await request<Certificate[]>("/api/v1/my/certificates");
  return rows.map((c) => ({
    ...c,
    principal: Number(c.principal) || 0,
    interest_rate: c.interest_rate != null ? Number(c.interest_rate) : null,
  }));
}

export type Redemption = {
  id: string;
  certificate_id?: string | null;
  status: string;
  amount: number | string;
  created_at: string;
};
export async function getRedemptions(): Promise<Redemption[]> {
  const rows = await request<Redemption[]>("/api/v1/my/redemptions");
  return rows.map((r) => ({ ...r, amount: Number(r.amount) || 0 }));
}

export type UpcomingAuction = {
  id: string;
  title: string;
  state: string | null;
  starts_at: string | null;
  status: string;
};
export async function getUpcomingAuctions(): Promise<UpcomingAuction[]> {
  const rows = await getAuctions();
  const upcoming = rows.filter((a) =>
    ["scheduled", "registration_open", "registration_closed", "live"].includes(a.status),
  );
  return upcoming
    .map((a) => ({
      id: a.id,
      title: a.title,
      state: a.county?.state ?? null,
      starts_at: a.starts_at,
      status: a.status,
    }))
    .sort((a, b) => new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime());
}

export async function registerForAuction(auctionId: string): Promise<void> {
  await request<{ registered: boolean }>(`/api/v1/auctions/${auctionId}/register`, { method: "POST" });
}

export type AuctionLot = {
  id: string;
  property_id: string | null;
  parcel_id: string | null;
  status: string;
  starting_rate: number;
  current_rate: number | null;
  minimum_rate: number;
  taxes_owed: number;
  tax_year: number | null;
  redemption_period_months: number;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  property_type: string | null;
  assessed_value: number | null;
};
export async function getAuctionLots(auctionId: string): Promise<AuctionLot[]> {
  const rows = await request<
    (Partial<AuctionLot> & {
      id: string;
      property_id: string | null;
      status: string;
      starting_rate: number | string | null;
      current_rate: number | string | null;
    })[]
  >(`/api/v1/auctions/${auctionId}/lots`);
  return rows.map((l) => ({
    id: l.id,
    property_id: l.property_id ?? null,
    parcel_id: l.parcel_id ?? null,
    status: l.status,
    starting_rate: Number(l.starting_rate) || 0,
    current_rate: l.current_rate != null ? Number(l.current_rate) : null,
    minimum_rate: Number(l.minimum_rate) || 0,
    taxes_owed: Number(l.taxes_owed) || 0,
    tax_year: l.tax_year ?? null,
    redemption_period_months: l.redemption_period_months != null ? Number(l.redemption_period_months) : 12,
    address: l.address ?? null,
    city: l.city ?? null,
    state: l.state ?? null,
    postal_code: l.postal_code ?? null,
    property_type: l.property_type ?? null,
    assessed_value: l.assessed_value != null ? Number(l.assessed_value) : null,
  }));
}

// ---- Public auction calendar (county + lien stats) ----

export type AuctionCounty = { id: string; name: string; state: string };
export type AuctionApi = {
  id: string;
  title: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  county: AuctionCounty | null;
  lien_count: number;
  total_taxes_owed: number;
};

type RawAuction = {
  id: string;
  title: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  county: AuctionCounty | null;
  lienCount: number | string;
  totalTaxesOwed: number | string;
};

function mapAuction(r: RawAuction): AuctionApi {
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    starts_at: r.startsAt,
    ends_at: r.endsAt,
    county: r.county,
    lien_count: Number(r.lienCount) || 0,
    total_taxes_owed: Number(r.totalTaxesOwed) || 0,
  };
}

export async function getAuctions(): Promise<AuctionApi[]> {
  const rows = await request<RawAuction[]>("/api/v1/auctions");
  return (rows ?? []).map(mapAuction);
}

export async function getAuction(id: string): Promise<AuctionApi> {
  return mapAuction(await request<RawAuction>(`/api/v1/auctions/${id}`));
}

export async function getAuctionDetail(id: string): Promise<{ auction: AuctionApi; lots: AuctionLot[] }> {
  const [auction, lots] = await Promise.all([getAuction(id), getAuctionLots(id)]);
  return { auction, lots };
}

// ---- Properties & lots ----

export type RawProperty = {
  id: string;
  jurisdictionId?: string | null;
  parcelId: string | null;
  address: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  propertyType: string | null;
  assessedValue: number | null;
  landValue?: number | null;
  improvementValue?: number | null;
  countyName: string | null;
  countyState: string | null;
  status: string;
  lotId?: string | null;
  lotStatus?: string | null;
  startingRate?: number | null;
  currentRate?: number | null;
  taxesOwed?: number | null;
  auctionId?: string | null;
  auctionStatus?: string | null;
  auctionStartsAt?: string | null;
};
export async function getProperty(id: string): Promise<RawProperty> {
  return request<RawProperty>(`/api/v1/properties/${id}`);
}

export async function getProperties(filters: {
  search?: string;
  type?: string;
  jurisdictionId?: string;
  state?: string;
  city?: string;
  pageSize?: number;
} = {}): Promise<RawProperty[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== "") qs.set(k, String(v));
  }
  const data = await request<RawProperty[]>(
    `/api/v1/properties${qs.toString() ? `?${qs.toString()}` : ""}`,
  );
  return data ?? [];
}

export type County = { id: string; name: string; stateId: string | null; stateCode: string | null; jurisdictionType: string };
export async function getCounties(): Promise<County[]> {
  const rows = await request<Array<Record<string, unknown>>>(`/api/v1/jurisdictions`);
  return (rows ?? [])
    .filter((r) => r.jurisdiction_type === "county")
    .map((r) => ({
      id: r.id as string,
      name: (r.name as string) ?? "",
      stateId: (r.state_id as string) ?? null,
      stateCode: (r.state_code as string) ?? null,
      jurisdictionType: (r.jurisdiction_type as string) ?? "county",
    }))
    .sort((a, b) => `${a.stateCode ?? ""} ${a.name}`.localeCompare(`${b.stateCode ?? ""} ${b.name}`));
}

export type RawLot = {
  id: string;
  auction_id: string;
  property_id: string | null;
  parcel_id: string | null;
  lot_number: string | null;
  status: string;
  starting_rate: number | string | null;
  current_rate: number | string | null;
  minimum_rate: number | string | null;
  taxes_owed: number | string | null;
  tax_year: number | null;
  redemption_period_months: number | null;
};
export async function getLot(id: string): Promise<RawLot> {
  const row = await request<RawLot>(`/api/v1/auction-lots/${id}`);
  return {
    ...row,
    starting_rate: Number(row.starting_rate) || 0,
    current_rate: row.current_rate != null ? Number(row.current_rate) : null,
    minimum_rate: Number(row.minimum_rate) || 0,
    taxes_owed: Number(row.taxes_owed) || 0,
    redemption_period_months: row.redemption_period_months != null ? Number(row.redemption_period_months) : 12,
  };
}

export async function getLotEligibility(lotId: string): Promise<{ eligible: boolean; reasons: string[] }> {
  return request<{ eligible: boolean; reasons: string[] }>(`/api/v1/auction-lots/${lotId}/eligibility`);
}

export async function placeBidApi(input: {
  lotId: string;
  rate: number;
  amount: number;
  idempotencyKey?: string;
}): Promise<{ bidId: string }> {
  const res = await request<{ bidId?: string; id?: string }>(`/api/v1/auction-lots/${input.lotId}/bids`, {
    method: "POST",
    body: JSON.stringify({
      rate: input.rate,
      amount: input.amount / 100,
      idempotencyKey: input.idempotencyKey,
    }),
  });
  return { bidId: res.bidId ?? res.id ?? "" };
}

// ---- Watchlist (write) ----

export async function addWatchItem(input: { lotId?: string; auctionId?: string }): Promise<string | null> {
  const res = await request<{ id: string | null }>("/api/v1/watchlist", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.id ?? null;
}

// ---- Activity feed ----

export type ActivityItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  at: string;
};
export async function getActivity(limit = 30): Promise<ActivityItem[]> {
  return request<ActivityItem[]>(`/api/v1/me/activity?limit=${limit}`);
}

// ---- Notifications (write) ----

export async function markNotificationRead(id: string): Promise<void> {
  await request<{ read: boolean }>(`/api/v1/my/notifications/${id}/read`, { method: "PATCH" });
}
export async function markAllNotificationsRead(): Promise<number> {
  const res = await request<{ marked: number }>("/api/v1/my/notifications/read-all", { method: "POST" });
  return res.marked ?? 0;
}