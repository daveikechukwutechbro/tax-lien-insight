// Real backend queries for the dashboard (rewired from the demo mock).
// All data comes from the deployed Worker via the same-origin /api/v1 proxy.

import { queryOptions } from "@tanstack/react-query";
import { getMe } from "@/lib/backend-auth";
import {
  getMyBids,
  getWatchlist,
  getDashboardSummary,
  type DashboardSummary,
  type UserBid,
  type WatchedProperty as ApiWatchedProperty,
} from "@/lib/backend";

export type DashboardBid = {
  bid_id: string;
  interest_rate: number;
  status: string;
  placed_at: string;
  lien: {
    id: string;
    taxes_owed: number;
    current_rate: number | null;
    starting_rate: number;
    property: {
      id: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      parcel_id?: string | null;
      image_url?: string | null;
    };
    auction: { starts_at: string | null; status?: string } | null;
  };
};

function mapBid(b: UserBid): DashboardBid {
  return {
    bid_id: b.bid_id,
    interest_rate: b.rate,
    status: b.status,
    placed_at: b.placed_at,
    lien: {
      id: b.lienId ?? b.bid_id,
      taxes_owed: (b.amount || 0) / 100,
      current_rate: null,
      starting_rate: b.rate,
      property: b.property
        ? {
            id: b.property.id ?? b.bid_id,
            address: b.property.address ?? "Property",
            city: b.property.city ?? "",
            state: b.property.state ?? "",
            zip: b.property.postal_code ?? "",
            parcel_id: null,
            image_url: null,
          }
        : {
            id: b.bid_id,
            address: "Property",
            city: "",
            state: "",
            zip: "",
            parcel_id: null,
            image_url: null,
          },
      auction: null,
    },
  };
}

export function myBidsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["dashboard", "bids", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DashboardBid[]> => {
      const bids = await getMyBids();
      return bids.map(mapBid);
    },
  });
}

export type WatchedProperty = {
  id: string;
  property_id?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  parcel_id?: string | null;
  image_url?: string | null;
  taxes_owed?: number | null;
  current_rate?: number | null;
  starting_rate?: number | null;
  auction_starts_at?: string | null;
};

export function watchlistQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["dashboard", "watchlist", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WatchedProperty[]> => {
      const rows = await getWatchlist();
      return rows.map((w: ApiWatchedProperty) => ({
        id: w.id,
        property_id: w.property_id ?? undefined,
        address: w.address ?? undefined,
        city: w.city ?? undefined,
        state: w.state ?? undefined,
        zip: w.postal_code ?? undefined,
        parcel_id: undefined,
        image_url: null,
        taxes_owed: null,
        current_rate: w.current_rate ?? null,
        starting_rate: w.starting_rate ?? null,
        auction_starts_at: w.auction_starts_at ?? undefined,
      }));
    },
  });
}

export type ProfileInfo = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  avatar?: string | null;
  verified: boolean;
  kyc_status: string;
};

export function profileQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProfileInfo | null> => {
      const me = await getMe();
      if (!me) return null;
      return {
        full_name: me.fullName,
        phone: me.phone,
        email: me.email,
        address_line: me.address?.addressLine ?? null,
        city: me.address?.city ?? null,
        state: me.address?.state ?? null,
        postal_code: me.address?.postalCode ?? null,
        country: me.address?.country ?? null,
        avatar: me.avatar,
        verified: me.kycStatus === "verified",
        kyc_status: me.kycStatus,
      };
    },
  });
}

export function isAdminQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return false;
      const me = await getMe();
      if (!me) return false;
      return me.roles.includes("admin") || me.roles.includes("super_admin");
    },
  });
}

export function dashboardSummaryQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["dashboard-summary", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DashboardSummary | null> => {
      if (!userId) return null;
      return getDashboardSummary();
    },
    staleTime: 30_000,
  });
}

// Small named alias so older imports that used DashboardSummary keep working.
export type { DashboardSummary };