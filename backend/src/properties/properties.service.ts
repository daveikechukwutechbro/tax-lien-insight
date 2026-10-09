import { getPool, transaction } from "../db/pool.js";
import { NotFoundError, ValidationError } from "../shared/errors.js";
import type { Cents } from "../shared/api.js";

export interface PropertyRecord {
  id: string;
  jurisdictionId: string | null;
  parcelId: string | null;
  address: string;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  propertyType: string | null;
  assessedValue: Cents | null;
  countyName: string | null;
  countyState: string | null;
  imageUrl: string | null;
  legalDescription: string | null;
  status: string;
  lotId: string | null;
  lotStatus: string | null;
  startingRate: number | null;
  currentRate: number | null;
  taxesOwed: Cents | null;
  auctionId: string | null;
  auctionStatus: string | null;
  auctionStartsAt: string | null;
  gallery: string[];
  videoUrl: string | null;
  yearBuilt: number | null;
  livingAreaSqft: number | null;
  lotSizeAcres: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  useType: string | null;
  ownerName: string | null;
  ownerMailingAddress: string | null;
  propertyTaxesOwed: Cents | null;
  propertyInterestRate: number | null;
  propertyTaxYear: number | null;
  propertyRedemptionMonths: number | null;
}

const PROPERTY_JOINS = `
  LEFT JOIN jurisdictions j ON j.id = p.jurisdiction_id
  LEFT JOIN states s ON s.id = j.state_id
  LEFT JOIN LATERAL (
    SELECT al.id AS lot_id, al.status AS lot_status, al.starting_rate, al.current_rate, al.taxes_owed,
           a.id AS auction_id, a.status AS auction_status, a.starts_at AS auction_starts_at
    FROM auction_lots al
    JOIN auctions a ON a.id = al.auction_id
    WHERE al.property_id = p.id
      AND al.status NOT IN ('cancelled','withdrawn','archived')
      AND a.status NOT IN ('cancelled','archived')
    ORDER BY a.starts_at DESC NULLS LAST
    LIMIT 1
  ) lot ON true`;

const PROPERTY_DETAIL_COLS = `
            p.taxes_owed AS property_taxes_owed,
            p.interest_rate AS property_interest_rate,
            p.tax_year AS property_tax_year,
            p.redemption_period_months AS property_redemption_months`;

export async function listProperties(filters: {
  state?: string;
  city?: string;
  type?: string;
  search?: string;
  jurisdictionId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: PropertyRecord[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (filters.state) {
    where.push(`p.state = $${i++}`);
    params.push(filters.state);
  }
  if (filters.city) {
    where.push(`p.city = $${i++}`);
    params.push(filters.city);
  }
  if (filters.type) {
    where.push(`p.property_type = $${i++}`);
    params.push(filters.type);
  }
  if (filters.jurisdictionId) {
    where.push(`p.jurisdiction_id = $${i++}`);
    params.push(filters.jurisdictionId);
  }
  if (filters.search) {
    where.push(`(p.address ILIKE $${i} OR p.parcel_id ILIKE $${i} OR p.city ILIKE $${i})`);
    params.push(`%${filters.search}%`);
    i++;
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows: countRows } = await getPool().query(
    `SELECT count(*)::int AS c FROM properties p ${whereSql}`,
    params,
  );
  const total = countRows[0].c;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const { rows } = await getPool().query(
    `SELECT p.*, j.name AS county_name, s.code AS county_state,
            lot.lot_id, lot.lot_status, lot.starting_rate, lot.current_rate, lot.taxes_owed,
            lot.auction_id, lot.auction_status, lot.auction_starts_at,
            ${PROPERTY_DETAIL_COLS}
     FROM properties p
     ${PROPERTY_JOINS}
     ${whereSql}
     ORDER BY j.name NULLS LAST, p.created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return { items: rows.map(mapProperty), total };
}

export async function getProperty(id: string): Promise<PropertyRecord> {
  const { rows } = await getPool().query(
    `SELECT p.*, j.name AS county_name, s.code AS county_state,
            lot.lot_id, lot.lot_status, lot.starting_rate, lot.current_rate, lot.taxes_owed,
            lot.auction_id, lot.auction_status, lot.auction_starts_at,
            ${PROPERTY_DETAIL_COLS}
     FROM properties p
     ${PROPERTY_JOINS}
     WHERE p.id = $1`,
    [id],
  );
  if (!rows[0]) throw new NotFoundError("Property not found");
  return mapProperty(rows[0]);
}

export async function createProperty(input: {
  jurisdictionId?: string;
  parcelId?: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  propertyType?: string;
  assessedValue?: Cents;
  legalDescription?: string;
  zoning?: string;
  imageData?: string;
  metadata?: Record<string, unknown>;
  gallery?: string[];
  videoUrl?: string;
  yearBuilt?: number;
  livingAreaSqft?: number;
  lotSizeAcres?: number;
  bedrooms?: number;
  bathrooms?: number;
  useType?: string;
  ownerName?: string;
  ownerMailingAddress?: string;
  taxesOwed?: Cents;
  interestRate?: number;
  taxYear?: number;
  redemptionPeriodMonths?: number;
}): Promise<string> {
  if (!input.address) throw new ValidationError("Address is required");
  const { rows } = await getPool().query(
    `INSERT INTO properties
       (jurisdiction_id, parcel_id, address, city, state, postal_code, property_type, assessed_value, legal_description, zoning, image_data, metadata,
        gallery, video_url, year_built, living_area_sqft, lot_size_acres, bedrooms, bathrooms, use_type, owner_name, owner_mailing_address, taxes_owed, interest_rate, tax_year, redemption_period_months)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING id`,
    [
      input.jurisdictionId ?? null,
      input.parcelId ?? null,
      input.address,
      input.city ?? null,
      input.state ?? null,
      input.postalCode ?? null,
      input.propertyType ?? null,
      input.assessedValue ?? null,
      input.legalDescription ?? null,
      input.zoning ?? null,
      input.imageData ?? null,
      JSON.stringify(input.metadata ?? {}),
      JSON.stringify(input.gallery ?? []),
      input.videoUrl ?? null,
      input.yearBuilt ?? null,
      input.livingAreaSqft ?? null,
      input.lotSizeAcres ?? null,
      input.bedrooms ?? null,
      input.bathrooms ?? null,
      input.useType ?? null,
      input.ownerName ?? null,
      input.ownerMailingAddress ?? null,
      input.taxesOwed ?? null,
      input.interestRate ?? null,
      input.taxYear ?? null,
      input.redemptionPeriodMonths ?? null,
    ],
  );
  return rows[0].id as string;
}

export async function updateProperty(id: string, patch: Partial<Record<string, unknown>>): Promise<void> {
  const allowed = [
    "address",
    "city",
    "state",
    "postal_code",
    "property_type",
    "assessed_value",
    "legal_description",
    "zoning",
    "image_data",
    "status",
    "metadata",
    "gallery",
    "video_url",
    "year_built",
    "living_area_sqft",
    "lot_size_acres",
    "bedrooms",
    "bathrooms",
    "use_type",
    "owner_name",
    "owner_mailing_address",
    "taxes_owed",
    "interest_rate",
    "tax_year",
    "redemption_period_months",
  ];
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(patch)) {
    if (!allowed.includes(k)) continue;
    sets.push(`${k === "postal_code" ? "postal_code" : k} = $${i++}`);
    if (k === "metadata" || (k === "gallery" && v != null)) {
      params.push(JSON.stringify(v));
    } else {
      params.push(v ?? null);
    }
  }
  if (!sets.length) return;
  params.push(id);
  await getPool().query(`UPDATE properties SET ${sets.join(", ")}, updated_at = now() WHERE id = $${i}`, params);
}

function mapProperty(r: Record<string, unknown>): PropertyRecord {
  return {
    id: r.id as string,
    jurisdictionId: (r.jurisdiction_id as string) ?? null,
    parcelId: (r.parcel_id as string) ?? null,
    address: r.address as string,
    city: (r.city as string) ?? null,
    state: (r.state as string) ?? null,
    postalCode: (r.postal_code as string) ?? null,
    propertyType: (r.property_type as string) ?? null,
    assessedValue: r.assessed_value == null ? null : Number(r.assessed_value),
    countyName: (r.county_name as string) ?? null,
    countyState: (r.county_state as string) ?? null,
    imageUrl: (r.image_data as string) ?? null,
    legalDescription: (r.legal_description as string) ?? null,
    status: r.status as string,
    lotId: (r.lot_id as string) ?? null,
    lotStatus: (r.lot_status as string) ?? null,
    startingRate: r.starting_rate == null ? null : Number(r.starting_rate),
    currentRate: r.current_rate == null ? null : Number(r.current_rate),
    taxesOwed: r.taxes_owed == null ? null : Number(r.taxes_owed),
    auctionId: (r.auction_id as string) ?? null,
    auctionStatus: (r.auction_status as string) ?? null,
    auctionStartsAt: (r.auction_starts_at as string | Date) == null ? null : new Date(r.auction_starts_at as string).toISOString(),
    gallery: Array.isArray(r.gallery) ? r.gallery.map((u) => String(u)) : [],
    videoUrl: (r.video_url as string) ?? null,
    yearBuilt: r.year_built == null ? null : Number(r.year_built),
    livingAreaSqft: r.living_area_sqft == null ? null : Number(r.living_area_sqft),
    lotSizeAcres: r.lot_size_acres == null ? null : Number(r.lot_size_acres),
    bedrooms: r.bedrooms == null ? null : Number(r.bedrooms),
    bathrooms: r.bathrooms == null ? null : Number(r.bathrooms),
    useType: (r.use_type as string) ?? null,
    ownerName: (r.owner_name as string) ?? null,
    ownerMailingAddress: (r.owner_mailing_address as string) ?? null,
    propertyTaxesOwed: r.property_taxes_owed == null ? null : Number(r.property_taxes_owed),
    propertyInterestRate: r.property_interest_rate == null ? null : Number(r.property_interest_rate),
    propertyTaxYear: r.property_tax_year == null ? null : Number(r.property_tax_year),
    propertyRedemptionMonths: r.property_redemption_months == null ? null : Number(r.property_redemption_months),
  };
}
