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
  const rows = await request<
    { id: string; title: string; state: string | null; starts_at: string | null; status: string }[]
  >("/api/v1/auctions");
  const upcoming = (rows ?? []).filter((a) =>
    ["scheduled", "registration_open", "registration_closed", "live"].includes(a.status),
  );
  return upcoming.sort(
    (a, b) => new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime(),
  );
}

export async function registerForAuction(auctionId: string): Promise<void> {
  await request<{ registered: boolean }>(`/api/v1/auctions/${auctionId}/register`, { method: "POST" });
}

export type AuctionLot = {
  id: string;
  property_id: string | null;
  status: string;
  starting_rate: number | string;
  current_rate: number | string | null;
};
export async function getAuctionLots(auctionId: string): Promise<AuctionLot[]> {
  const rows = await request<AuctionLot[]>(`/api/v1/auctions/${auctionId}/lots`);
  return rows.map((l) => ({
    ...l,
    starting_rate: Number(l.starting_rate) || 0,
    current_rate: l.current_rate != null ? Number(l.current_rate) : null,
  }));
}