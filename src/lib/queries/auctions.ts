import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/firebase/client";

export type ScheduledPropertyRow = {
  lien_id: string;
  property_id: string;
  parcel_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: "residential" | "land" | "commercial";
  description: string | null;
  image_url: string | null;
  county: string;
  taxes_owed: number;
  min_bid: number;
  starting_rate: number;
  current_rate: number | null;
  status: "active" | "redeemed" | "canceled" | "expired";
  auction_id: string;
  auction_title: string;
  auction_starts_at: string;
  auction_ends_at: string;
  auction_status: "draft" | "scheduled" | "live" | "closed" | "canceled";
};

export type AuctionSummary = {
  totalProperties: number;
  totalCounties: number;
  totalTaxesOwed: number;
  nextStartsAt: string | null;
  properties: ScheduledPropertyRow[];
};

async function fetchNextAuctionSummary(): Promise<AuctionSummary> {
  // Grab the next non-closed auction
  const { data: auctions, error: auctionErr } = await supabase
    .from("auctions")
    .select("id, title, starts_at, ends_at, status")
    .in("status", ["scheduled", "live"])
    .order("starts_at", { ascending: true })
    .limit(1);
  if (auctionErr) throw auctionErr;
  const auction = auctions?.[0];
  if (!auction) {
    return {
      totalProperties: 0,
      totalCounties: 0,
      totalTaxesOwed: 0,
      nextStartsAt: null,
      properties: [],
    };
  }

  const { data: liens, error: liensErr } = await supabase
    .from("liens")
    .select(
      `id, taxes_owed, min_bid, starting_rate, current_rate, status, auction_id,
       property:properties!inner (
         id, parcel_id, address, city, state, zip, property_type, description, image_url,
         county:counties!inner ( name )
       )`,
    )
    .eq("auction_id", auction.id)
    .eq("status", "active")
    .order("taxes_owed", { ascending: false });
  if (liensErr) throw liensErr;

  const properties: ScheduledPropertyRow[] = (liens ?? []).map((l) => {
    // Supabase nested inner joins return an object, not an array
    const property = l.property as unknown as {
      id: string;
      parcel_id: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      property_type: "residential" | "land" | "commercial";
      description: string | null;
      image_url: string | null;
      county: { name: string };
    };
    return {
      lien_id: l.id,
      property_id: property.id,
      parcel_id: property.parcel_id,
      address: property.address,
      city: property.city,
      state: property.state,
      zip: property.zip,
      property_type: property.property_type,
      description: property.description,
      image_url: property.image_url,
      county: property.county.name,
      taxes_owed: Number(l.taxes_owed),
      min_bid: Number(l.min_bid),
      starting_rate: Number(l.starting_rate),
      current_rate: l.current_rate === null ? null : Number(l.current_rate),
      status: l.status,
      auction_id: auction.id,
      auction_title: auction.title,
      auction_starts_at: auction.starts_at,
      auction_ends_at: auction.ends_at,
      auction_status: auction.status,
    };
  });

  const counties = new Set(properties.map((p) => p.county));
  const totalTaxesOwed = properties.reduce((sum, p) => sum + p.taxes_owed, 0);

  return {
    totalProperties: properties.length,
    totalCounties: counties.size,
    totalTaxesOwed,
    nextStartsAt: auction.starts_at,
    properties,
  };
}

export const scheduledAuctionQuery = queryOptions({
  queryKey: ["auctions", "next-scheduled"],
  queryFn: fetchNextAuctionSummary,
  staleTime: 30_000,
});