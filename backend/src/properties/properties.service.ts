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
  status: string;
}

export async function listProperties(filters: {
  state?: string;
  city?: string;
  type?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: PropertyRecord[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (filters.state) {
    where.push(`state = $${i++}`);
    params.push(filters.state);
  }
  if (filters.city) {
    where.push(`city = $${i++}`);
    params.push(filters.city);
  }
  if (filters.type) {
    where.push(`property_type = $${i++}`);
    params.push(filters.type);
  }
  if (filters.search) {
    where.push(`(address ILIKE $${i} OR parcel_id ILIKE $${i} OR city ILIKE $${i})`);
    params.push(`%${filters.search}%`);
    i++;
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows: countRows } = await getPool().query(
    `SELECT count(*)::int AS c FROM properties ${whereSql}`,
    params,
  );
  const total = countRows[0].c;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const { rows } = await getPool().query(
    `SELECT * FROM properties ${whereSql} ORDER BY created_at DESC
     LIMIT $${i++} OFFSET $${i++}`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return { items: rows.map(mapProperty), total };
}

export async function getProperty(id: string): Promise<PropertyRecord> {
  const { rows } = await getPool().query(`SELECT * FROM properties WHERE id = $1`, [id]);
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
  metadata?: Record<string, unknown>;
}): Promise<string> {
  if (!input.address) throw new ValidationError("Address is required");
  const { rows } = await getPool().query(
    `INSERT INTO properties
       (jurisdiction_id, parcel_id, address, city, state, postal_code, property_type, assessed_value, legal_description, zoning, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
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
      JSON.stringify(input.metadata ?? {}),
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
    "status",
    "metadata",
  ];
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(patch)) {
    if (!allowed.includes(k)) continue;
    sets.push(`${k === "postal_code" ? "postal_code" : k} = $${i++}`);
    params.push(k === "metadata" && v ? JSON.stringify(v) : v ?? null);
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
    status: r.status as string,
  };
}
