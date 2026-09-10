import { queryOptions } from "@tanstack/react-query";
import { getAuctions, getAuctionLots, type AuctionApi, type AuctionLot } from "@/lib/backend";

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

const UPCOMING_STATUSES = ["scheduled", "registration_open", "registration_closed", "live"];

function pillStatus(s: string): ScheduledPropertyRow["auction_status"] {
  if (s === "live") return "live";
  if (s === "closed" || s === "results_processing" || s === "results_finalized" || s === "settlement") return "closed";
  if (s === "cancelled") return "canceled";
  return "scheduled";
}

function toRow(l: AuctionLot, a: AuctionApi): ScheduledPropertyRow {
  return {
    lien_id: l.id,
    property_id: l.property_id ?? l.id,
    parcel_id: l.parcel_id ?? "",
    address: l.address ?? "Property",
    city: l.city ?? "",
    state: l.state ?? "",
    zip: l.postal_code ?? "",
    property_type: (["residential", "land", "commercial"] as const).includes(l.property_type as never)
      ? (l.property_type as ScheduledPropertyRow["property_type"])
      : "residential",
    description: l.property_type ?? null,
    image_url: null,
    county: a.county?.name ?? "—",
    taxes_owed: l.taxes_owed || 0,
    min_bid: l.taxes_owed || 0,
    starting_rate: l.starting_rate || 0,
    current_rate: l.current_rate,
    status: "active",
    auction_id: a.id,
    auction_title: a.title,
    auction_starts_at: a.starts_at ?? "",
    auction_ends_at: a.ends_at ?? "",
    auction_status: pillStatus(a.status),
  };
}

async function fetchNextAuctionSummary(): Promise<AuctionSummary> {
  const auctions = await getAuctions().catch(() => []);
  const upcoming = auctions
    .filter((a) => UPCOMING_STATUSES.includes(a.status))
    .sort((a, b) => new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime());

  const counties = new Set<string>();
  const properties: ScheduledPropertyRow[] = [];
  let totalTaxesOwed = 0;

  for (const a of upcoming) {
    if (a.county) counties.add(`${a.county.name}|${a.county.state}`);
    const lots = await getAuctionLots(a.id).catch(() => [] as AuctionLot[]);
    for (const l of lots) {
      totalTaxesOwed += l.taxes_owed || 0;
      properties.push(toRow(l, a));
    }
  }

  properties.sort((x, y) => new Date(x.auction_starts_at).getTime() - new Date(y.auction_starts_at).getTime());

  const nextStartsAt =
    upcoming.find((a) => ["scheduled", "registration_open", "registration_closed"].includes(a.status))?.starts_at ??
    upcoming[0]?.starts_at ??
    null;

  return {
    totalProperties: properties.length,
    totalCounties: counties.size,
    totalTaxesOwed,
    nextStartsAt,
    properties,
  };
}

export const scheduledAuctionQuery = queryOptions({
  queryKey: ["auctions", "next-scheduled"],
  queryFn: fetchNextAuctionSummary,
  staleTime: 30_000,
});