import { queryOptions } from "@tanstack/react-query";
import { getUpcomingAuctions, getAuctionLots } from "@/lib/backend";

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
  const auctions = await getUpcomingAuctions();
  const auction = auctions[0];
  if (!auction) {
    return {
      totalProperties: 0,
      totalCounties: 0,
      totalTaxesOwed: 0,
      nextStartsAt: null,
      properties: [],
    };
  }
  const lots = await getAuctionLots(auction.id).catch(() => []);
  return {
    totalProperties: lots.length,
    totalCounties: auctions.length,
    totalTaxesOwed: 0,
    nextStartsAt: auction.starts_at,
    properties: [],
  };
}

export const scheduledAuctionQuery = queryOptions({
  queryKey: ["auctions", "next-scheduled"],
  queryFn: fetchNextAuctionSummary,
  staleTime: 30_000,
});