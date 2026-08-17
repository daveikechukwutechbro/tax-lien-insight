import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";

export type DashboardBid = {
  bid_id: string;
  interest_rate: number;
  status: "winning" | "outbid" | "won" | "lost" | "invalid";
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
      parcel_id: string;
      image_url: string | null;
    };
    auction: { starts_at: string; status: string } | null;
  };
};

export function myBidsQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["dashboard", "bids", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DashboardBid[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("bids")
        .select(
          `id, interest_rate, status, placed_at,
           lien:liens!inner(id, taxes_owed, current_rate, starting_rate,
             property:properties!inner(id, address, city, state, zip, parcel_id, image_url),
             auction:auctions(starts_at, status))`,
        )
        .eq("user_id", userId)
        .order("placed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((b) => ({
        bid_id: b.id,
        interest_rate: Number(b.interest_rate),
        status: b.status,
        placed_at: b.placed_at,
        lien: b.lien as unknown as DashboardBid["lien"],
      }));
    },
  });
}

export type WatchedProperty = {
  id: string;
  property_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  parcel_id: string;
  image_url: string | null;
  taxes_owed: number | null;
  current_rate: number | null;
  starting_rate: number | null;
  auction_starts_at: string | null;
};

export function watchlistQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["dashboard", "watchlist", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WatchedProperty[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("watchlist")
        .select(
          `id, property_id,
           property:properties!inner(
             id, address, city, state, zip, parcel_id, image_url,
             liens(taxes_owed, current_rate, starting_rate, auction:auctions(starts_at))
           )`,
        )
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((w) => {
        const p = w.property as unknown as {
          id: string;
          address: string;
          city: string;
          state: string;
          zip: string;
          parcel_id: string;
          image_url: string | null;
          liens: {
            taxes_owed: number;
            current_rate: number | null;
            starting_rate: number;
            auction: { starts_at: string } | null;
          }[];
        };
        const lien = p.liens?.[0];
        return {
          id: w.id,
          property_id: p.id,
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          parcel_id: p.parcel_id,
          image_url: p.image_url,
          taxes_owed: lien ? Number(lien.taxes_owed) : null,
          current_rate: lien?.current_rate === null || lien?.current_rate === undefined
            ? null
            : Number(lien.current_rate),
          starting_rate: lien ? Number(lien.starting_rate) : null,
          auction_starts_at: lien?.auction?.starts_at ?? null,
        };
      });
    },
  });
}

export function profileQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, account_balance, verified")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function isAdminQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (error) throw error;
      return !!data;
    },
  });
}

// Authoritative account/dashboard metrics straight from the backend (issue #16/#17).
export type DashboardSummary = {
  bids: { count: number; active: number; winning: number; outbid: number; lost: number };
  awards: { count: number; principal_value: number };
  funds: { available: number; held: number; pending: number };
  payments: { pending: number; paid: number };
  redemptions: { active: number; completed: number; realized_interest: number };
  certificates: { pending: number };
};

export function dashboardSummaryQuery(userId: string | undefined) {
  return queryOptions({
    queryKey: ["dashboard-summary", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DashboardSummary | null> => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc("get_user_dashboard_summary", {
        _user_id: userId,
      });
      if (error) throw error;
      return (data as unknown as DashboardSummary | null) ?? null;
    },
    staleTime: 30_000,
  });
}