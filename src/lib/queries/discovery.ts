import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuctionListRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "draft" | "scheduled" | "live" | "closed" | "canceled";
  county: { id: string; name: string; state: string };
  lien_count: number;
  total_taxes_owed: number;
};

export const auctionsListQuery = queryOptions({
  queryKey: ["auctions", "list"],
  queryFn: async (): Promise<AuctionListRow[]> => {
    const { data, error } = await supabase
      .from("auctions")
      .select(
        `id, title, starts_at, ends_at, status,
         county:counties!inner(id, name, state),
         liens(taxes_owed, status)`,
      )
      .in("status", ["scheduled", "live", "closed"])
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((a) => {
      const liens = (a.liens ?? []) as { taxes_owed: number; status: string }[];
      const active = liens.filter((l) => l.status === "active");
      return {
        id: a.id,
        title: a.title,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        status: a.status,
        county: a.county as unknown as AuctionListRow["county"],
        lien_count: active.length,
        total_taxes_owed: active.reduce((s, l) => s + Number(l.taxes_owed), 0),
      };
    });
  },
  staleTime: 30_000,
  retry: 2,
  retryDelay: 500,
});

export type AuctionDetail = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "draft" | "scheduled" | "live" | "closed" | "canceled";
  county: { id: string; name: string; state: string };
  liens: {
    id: string;
    taxes_owed: number;
    min_bid: number;
    starting_rate: number;
    current_rate: number | null;
    status: string;
    property: {
      id: string;
      parcel_id: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      property_type: string;
      image_url: string | null;
    };
  }[];
};

export function auctionDetailQuery(id: string) {
  return queryOptions({
    queryKey: ["auctions", "detail", id],
    queryFn: async (): Promise<AuctionDetail> => {
      const { data, error } = await supabase
        .from("auctions")
        .select(
          `id, title, starts_at, ends_at, status,
           county:counties!inner(id, name, state),
           liens(id, taxes_owed, min_bid, starting_rate, current_rate, status,
             property:properties!inner(id, parcel_id, address, city, state, zip, property_type, image_url))`,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Auction not found");
      return {
        ...data,
        county: data.county as unknown as AuctionDetail["county"],
        liens: ((data.liens ?? []) as unknown as AuctionDetail["liens"]).map((l) => ({
          ...l,
          taxes_owed: Number(l.taxes_owed),
          min_bid: Number(l.min_bid),
          starting_rate: Number(l.starting_rate),
          current_rate: l.current_rate === null ? null : Number(l.current_rate),
        })),
      } as AuctionDetail;
    },
  });
}

export type StateSummary = {
  state: string;
  county_count: number;
  property_count: number;
  upcoming_auctions: number;
};

export const statesListQuery = queryOptions({
  queryKey: ["states", "list"],
  queryFn: async (): Promise<StateSummary[]> => {
    const { data: counties, error } = await supabase
      .from("counties")
      .select("id, state, properties(id), auctions(id, status)");
    if (error) throw error;
    const map = new Map<string, StateSummary>();
    for (const c of counties ?? []) {
      const s = map.get(c.state) ?? {
        state: c.state,
        county_count: 0,
        property_count: 0,
        upcoming_auctions: 0,
      };
      s.county_count += 1;
      s.property_count += ((c.properties ?? []) as unknown[]).length;
      s.upcoming_auctions += ((c.auctions ?? []) as { status: string }[]).filter(
        (a) => a.status === "scheduled" || a.status === "live",
      ).length;
      map.set(c.state, s);
    }
    return Array.from(map.values()).sort((a, b) => a.state.localeCompare(b.state));
  },
  staleTime: 60_000,
});

export type StateDetail = {
  state: string;
  counties: {
    id: string;
    name: string;
    property_count: number;
    next_auction: { id: string; starts_at: string; status: string } | null;
  }[];
};

export function stateDetailQuery(state: string) {
  return queryOptions({
    queryKey: ["states", "detail", state],
    queryFn: async (): Promise<StateDetail> => {
      const { data, error } = await supabase
        .from("counties")
        .select("id, name, state, properties(id), auctions(id, starts_at, status)")
        .eq("state", state)
        .order("name");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("State not found");
      return {
        state,
        counties: data.map((c) => {
          const auctions = ((c.auctions ?? []) as { id: string; starts_at: string; status: string }[])
            .filter((a) => a.status === "scheduled" || a.status === "live")
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          return {
            id: c.id,
            name: c.name,
            property_count: ((c.properties ?? []) as unknown[]).length,
            next_auction: auctions[0] ?? null,
          };
        }),
      };
    },
  });
}