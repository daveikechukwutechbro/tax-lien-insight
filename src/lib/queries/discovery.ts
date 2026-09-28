import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";
import { getAuctions, getAuctionDetail, type AuctionApi } from "@/lib/backend";
import { readLocal, writeLocal } from "@/lib/local-cache";

export type AuctionListRow = AuctionApi & {
  status: string;
  county: { id: string; name: string; state: string } | null;
};

export const auctionsListQuery = queryOptions({
  queryKey: ["auctions", "list"],
  // Never reject: a transient upstream blip should degrade to an empty list,
  // not crash the page during SSR.
  placeholderData: (): AuctionListRow[] | undefined => readLocal<AuctionListRow[]>("auctions.list"),
  queryFn: async (): Promise<AuctionListRow[]> => {
    const data = await getAuctions().catch(() => []);
    writeLocal("auctions.list", data);
    return data;
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
  status: string;
  county: { id: string; name: string; state: string } | null;
  liens: {
    id: string;
    taxes_owed: number;
    min_bid: number;
    starting_rate: number;
    current_rate: number | null;
    status: string;
    property: {
      id: string;
      parcel_id: string | null;
      address: string;
      city: string;
      state: string;
      zip: string;
      property_type: string | null;
      image_url: string | null;
    };
  }[];
};

export function auctionDetailQuery(id: string) {
  const key = `auction.${id}`;
  return queryOptions({
    queryKey: ["auctions", "detail", id],
    placeholderData: (): AuctionDetail | null | undefined => readLocal<AuctionDetail>(key) ?? null,
    queryFn: async (): Promise<AuctionDetail | null> => {
      try {
        const { auction, lots } = await getAuctionDetail(id);
        const detail = {
          id: auction.id,
          title: auction.title,
          starts_at: auction.starts_at ?? "",
          ends_at: auction.ends_at ?? "",
          status: auction.status,
          county: auction.county,
          liens: lots
            .filter((l) => !["cancelled", "withdrawn", "archived"].includes(l.status))
            .map((l) => ({
              id: l.id,
              taxes_owed: l.taxes_owed,
              min_bid: l.taxes_owed,
              starting_rate: l.starting_rate,
              current_rate: l.current_rate,
              status: l.status,
              property: {
                id: l.property_id ?? l.id,
                parcel_id: l.parcel_id,
                address: l.address ?? "Unnamed property",
                city: l.city ?? "",
                state: l.state ?? "",
                zip: l.postal_code ?? "",
                property_type: l.property_type,
                image_url: l.image_url ?? null,
              },
            })),
        } satisfies AuctionDetail;
        writeLocal(key, detail);
        return detail;
      } catch {
        return null;
      }
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
  placeholderData: (): StateSummary[] | undefined => readLocal<StateSummary[]>("states.list"),
  queryFn: async (): Promise<StateSummary[]> => {
    const data = await fetchStateSummaries();
    writeLocal("states.list", data);
    return data;
  },
  staleTime: 60_000,
});

async function fetchStateSummaries(): Promise<StateSummary[]> {
  try {
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
  } catch {
    return [];
  }
}

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
  const key = `state.${state}`;
  return queryOptions({
    queryKey: ["states", "detail", state],
    placeholderData: (): StateDetail | null | undefined => readLocal<StateDetail>(key) ?? null,
    queryFn: async (): Promise<StateDetail | null> => {
      try {
        const { data, error } = await supabase
          .from("counties")
          .select("id, name, state, properties(id), auctions(id, starts_at, status)")
          .eq("state", state)
          .order("name");
        if (error) throw error;
        if (!data || data.length === 0) return null;
        const detail: StateDetail = {
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
        writeLocal(key, detail);
        return detail;
      } catch {
        return null;
      }
    },
  });
}