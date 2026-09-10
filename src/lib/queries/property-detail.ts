import { queryOptions } from "@tanstack/react-query";
import { getAuction, getAuctions, getAuctionDetail, getLot, getProperty, type AuctionApi, type AuctionLot } from "@/lib/backend";

export type PropertyDetail = {
  id: string;
  parcel_id: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string | null;
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
  county: { name: string; state: string };
  lien: {
    id: string;
    taxes_owed: number;
    min_bid: number;
    starting_rate: number;
    current_rate: number | null;
    tax_year: number | null;
    redemption_period_months: number;
    status: string;
    auction: {
      id: string;
      title: string;
      starts_at: string;
      ends_at: string;
      status: string;
    } | null;
  } | null;
  documents: { id: string; kind: string; name: string; url: string }[];
};

function makeLien(lot: AuctionLot, auction: AuctionApi | null): PropertyDetail["lien"] {
  return {
    id: lot.id,
    taxes_owed: lot.taxes_owed,
    min_bid: lot.taxes_owed,
    starting_rate: lot.starting_rate,
    current_rate: lot.current_rate,
    tax_year: lot.tax_year,
    redemption_period_months: lot.redemption_period_months,
    status: "active",
    auction: auction
      ? {
          id: auction.id,
          title: auction.title,
          starts_at: auction.starts_at ?? "",
          ends_at: auction.ends_at ?? "",
          status: auction.status,
        }
      : null,
  };
}

export function propertyDetailQuery(
  propertyId: string,
  opts?: { lotId?: string; auctionId?: string },
) {
  return queryOptions({
    queryKey: ["property", propertyId, opts?.lotId ?? "", opts?.auctionId ?? ""],
    queryFn: async (): Promise<PropertyDetail> => {
      const p = await getProperty(propertyId);

      let lien: PropertyDetail["lien"] = null;
      if (opts?.lotId) {
        const lot = await getLot(opts.lotId);
        const auction = opts?.auctionId ? await getAuction(opts.auctionId) : null;
        lien = makeLien(lot, auction);
      } else {
        const auctions = await getAuctions();
        for (const a of auctions) {
          try {
            const { auction, lots } = await getAuctionDetail(a.id);
            const lot = lots.find((l) => l.property_id === propertyId);
            if (lot) {
              lien = makeLien(lot, auction);
              break;
            }
          } catch {
            // try the next auction
          }
        }
      }

      return {
        id: p.id,
        parcel_id: p.parcelId,
        address: p.address,
        city: p.city ?? "",
        state: p.state ?? "",
        zip: p.postalCode ?? "",
        property_type: p.propertyType,
        description: null,
        image_url: null,
        gallery_urls: [],
        year_built: null,
        living_area_sqft: null,
        lot_size_acres: null,
        bedrooms: null,
        bathrooms: null,
        use_type: p.propertyType,
        assessed_value: p.assessedValue,
        land_value: p.landValue ?? null,
        improvement_value: p.improvementValue ?? null,
        owner_name: null,
        owner_mailing_address: null,
        county: p.countyName ? { name: p.countyName, state: p.countyState ?? p.state ?? "" } : { name: "", state: p.state ?? "" },
        lien,
        documents: [],
      };
    },
  });
}