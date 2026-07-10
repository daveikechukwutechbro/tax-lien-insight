import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PropertyDetail = {
  id: string;
  parcel_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: "residential" | "land" | "commercial";
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
    tax_year: number;
    redemption_period_months: number;
    status: "active" | "redeemed" | "canceled" | "expired";
    auction: {
      id: string;
      title: string;
      starts_at: string;
      ends_at: string;
      status: "draft" | "scheduled" | "live" | "closed" | "canceled";
    } | null;
  } | null;
  documents: { id: string; kind: string; name: string; url: string }[];
};

export function propertyDetailQuery(propertyId: string) {
  return queryOptions({
    queryKey: ["property", propertyId],
    queryFn: async (): Promise<PropertyDetail> => {
      const { data: p, error } = await supabase
        .from("properties")
        .select(
          `id, parcel_id, address, city, state, zip, property_type, description, image_url, gallery_urls,
           year_built, living_area_sqft, lot_size_acres, bedrooms, bathrooms, use_type,
           assessed_value, land_value, improvement_value, owner_name, owner_mailing_address,
           county:counties!inner(name, state),
           liens(id, taxes_owed, min_bid, starting_rate, current_rate, tax_year, redemption_period_months, status,
                 auction:auctions(id, title, starts_at, ends_at, status))`,
        )
        .eq("id", propertyId)
        .maybeSingle();
      if (error) throw error;
      if (!p) throw new Error("Property not found");

      const { data: docs } = await supabase
        .from("documents")
        .select("id, kind, name, url")
        .eq("property_id", propertyId);

      const activeLien = (p.liens as unknown as PropertyDetail["lien"][])?.find(
        (l) => l?.status === "active",
      ) ?? (p.liens as unknown as PropertyDetail["lien"][])?.[0] ?? null;

      return {
        id: p.id,
        parcel_id: p.parcel_id,
        address: p.address,
        city: p.city,
        state: p.state,
        zip: p.zip,
        property_type: p.property_type,
        description: p.description,
        image_url: p.image_url,
        gallery_urls: p.gallery_urls ?? [],
        year_built: p.year_built,
        living_area_sqft: p.living_area_sqft,
        lot_size_acres: p.lot_size_acres === null ? null : Number(p.lot_size_acres),
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms === null ? null : Number(p.bathrooms),
        use_type: p.use_type,
        assessed_value: p.assessed_value === null ? null : Number(p.assessed_value),
        land_value: p.land_value === null ? null : Number(p.land_value),
        improvement_value: p.improvement_value === null ? null : Number(p.improvement_value),
        owner_name: p.owner_name,
        owner_mailing_address: p.owner_mailing_address,
        county: p.county as unknown as { name: string; state: string },
        lien: activeLien
          ? {
              ...activeLien,
              taxes_owed: Number(activeLien.taxes_owed),
              min_bid: Number(activeLien.min_bid),
              starting_rate: Number(activeLien.starting_rate),
              current_rate:
                activeLien.current_rate === null ? null : Number(activeLien.current_rate),
            }
          : null,
        documents: docs ?? [],
      };
    },
  });
}