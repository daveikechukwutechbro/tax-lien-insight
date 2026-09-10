import { getPool, transaction } from "../db/pool.js";
import { NotFoundError, ConflictError, AppError } from "../shared/errors.js";
import {
  AUCTION_TRANSITIONS,
  type AuctionState,
  type LotState,
  type RegistrationState,
} from "../shared/constants.js";
import { getJurisdictionRules } from "../jurisdictions/jurisdictions.service.js";
import { assertPermission, type AuthContext } from "../auth/rbac.js";
import { createAwardsForAuction } from "./awards.service.js";

export interface AuctionRecord {
  id: string;
  title: string;
  jurisdictionId: string | null;
  state: AuctionState;
  startsAt: string | null;
  endsAt: string | null;
  published: boolean;
}

export async function listAuctions(filters: {
  state?: AuctionState;
  jurisdictionId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: AuctionRecord[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (filters.state) {
    where.push(`status = $${i++}`);
    params.push(filters.state);
  }
  if (filters.jurisdictionId) {
    where.push(`jurisdiction_id = $${i++}`);
    params.push(filters.jurisdictionId);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows: countRows } = await getPool().query(
    `SELECT count(*)::int AS c FROM auctions ${whereSql}`,
    params,
  );
  const total = countRows[0].c;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const { rows } = await getPool().query(
    `SELECT id, title, jurisdiction_id, status, starts_at, ends_at, published
     FROM auctions ${whereSql} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return { items: rows.map(mapAuction), total };
}

export interface PublicCounty {
  id: string;
  name: string;
  state: string;
}

export interface PublicAuction {
  id: string;
  title: string;
  status: AuctionState;
  startsAt: string | null;
  endsAt: string | null;
  county: PublicCounty | null;
  lienCount: number;
  totalTaxesOwed: number;
}

const PUBLIC_AUCTION_SQL = `
  SELECT a.id, a.title, a.status, a.starts_at, a.ends_at,
         j.id AS j_id, j.name AS j_name, s.code AS j_state,
         COUNT(al.id) FILTER (WHERE al.status NOT IN ('cancelled','withdrawn','archived'))::int AS lien_count,
         COALESCE(SUM(al.taxes_owed) FILTER (WHERE al.status NOT IN ('cancelled','withdrawn','archived')), 0)::bigint AS total_taxes
  FROM auctions a
  LEFT JOIN jurisdictions j ON j.id = a.jurisdiction_id
  LEFT JOIN states s ON s.id = j.state_id
  LEFT JOIN auction_lots al ON al.auction_id = a.id
`;

function mapPublicAuction(r: Record<string, unknown>): PublicAuction {
  return {
    id: r.id as string,
    title: r.title as string,
    status: r.status as AuctionState,
    startsAt: r.starts_at ? new Date(r.starts_at as string).toISOString() : null,
    endsAt: r.ends_at ? new Date(r.ends_at as string).toISOString() : null,
    county: r.j_id ? { id: r.j_id as string, name: r.j_name as string, state: r.j_state as string } : null,
    lienCount: Number(r.lien_count) || 0,
    totalTaxesOwed: Number(r.total_taxes) || 0,
  };
}

export async function listPublicAuctions(): Promise<PublicAuction[]> {
  const { rows } = await getPool().query(
    `${PUBLIC_AUCTION_SQL}
     WHERE a.status NOT IN ('draft','archived','cancelled')
     GROUP BY a.id, j.id, s.code
     ORDER BY a.starts_at ASC NULLS LAST, a.created_at DESC`,
  );
  return rows.map(mapPublicAuction);
}

export async function getPublicAuction(id: string): Promise<PublicAuction> {
  const { rows } = await getPool().query(
    `${PUBLIC_AUCTION_SQL}
     WHERE a.id = $1
     GROUP BY a.id, j.id, s.code`,
    [id],
  );
  if (!rows[0]) throw new NotFoundError("Auction not found");
  return mapPublicAuction(rows[0]);
}

export async function getAuction(id: string): Promise<AuctionRecord> {
  const { rows } = await getPool().query(
    `SELECT id, title, jurisdiction_id, status, starts_at, ends_at, published FROM auctions WHERE id = $1`,
    [id],
  );
  if (!rows[0]) throw new NotFoundError("Auction not found");
  return mapAuction(rows[0]);
}

function mapAuction(r: Record<string, unknown>): AuctionRecord {
  return {
    id: r.id as string,
    title: r.title as string,
    jurisdictionId: (r.jurisdiction_id as string) ?? null,
    state: r.status as AuctionState,
    startsAt: r.starts_at ? new Date(r.starts_at as string).toISOString() : null,
    endsAt: r.ends_at ? new Date(r.ends_at as string).toISOString() : null,
    published: r.published as boolean,
  };
}

export async function createAuction(
  input: { title: string; jurisdictionId?: string; startsAt?: string; endsAt?: string },
  actorId: string,
): Promise<string> {
  if (!input.title) throw new AppError("VALIDATION_ERROR", "Title is required", 422);
  return transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO auctions (title, jurisdiction_id, starts_at, ends_at, created_by, status)
       VALUES ($1,$2,$3,$4,$5,'draft') RETURNING id`,
      [
        input.title,
        input.jurisdictionId ?? null,
        input.startsAt ?? null,
        input.endsAt ?? null,
        actorId,
      ],
    );
    const auctionId = rows[0].id as string;
    if (input.jurisdictionId) {
      try {
        const rules = await getJurisdictionRules(input.jurisdictionId);
        await client.query(
          `INSERT INTO auction_rule_snapshots (auction_id, jurisdiction_id, rules_json)
           VALUES ($1,$2,$3)`,
          [auctionId, input.jurisdictionId, JSON.stringify(rules)],
        );
      } catch {
        // rules optional; snapshot best-effort
      }
    }
    await client.query(
      `INSERT INTO auction_events (auction_id, event_type, actor_id, payload)
       VALUES ($1,'created',$2,$3)`,
      [auctionId, actorId, JSON.stringify({ title: input.title })],
    );
    return auctionId;
  });
}

export async function transitionAuction(
  auctionId: string,
  to: AuctionState,
  actorId: string,
): Promise<AuctionRecord> {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT status FROM auctions WHERE id = $1 ${"FOR UPDATE"}`,
      [auctionId],
    );
    if (!rows[0]) throw new NotFoundError("Auction not found");
    const from = rows[0].status as AuctionState;
    if (from === to) return mapAuction(rows[0]);
    const allowed = AUCTION_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new ConflictError(`Invalid auction state transition: ${from} -> ${to}`, {
        from,
        to,
        allowed,
      });
    }
    await client.query(`UPDATE auctions SET status = $1, updated_at = now() WHERE id = $2`, [to, auctionId]);
    await client.query(
      `INSERT INTO auction_events (auction_id, event_type, actor_id, payload)
       VALUES ($1,$2,$3,$4)`,
      [auctionId, `transition:${to}`, actorId, JSON.stringify({ from, to })],
    );
    return getAuction(auctionId);
  });
}

// Convenience wrappers
export const publishAuction = (id: string, actor: string) => transitionAuction(id, "scheduled", actor);
export const openRegistration = (id: string, actor: string) => transitionAuction(id, "registration_open", actor);
export const closeRegistration = (id: string, actor: string) => transitionAuction(id, "registration_closed", actor);
export const startAuction = (id: string, actor: string) => transitionAuction(id, "live", actor);
export const pauseAuction = (id: string, actor: string) => transitionAuction(id, "paused", actor);
export const resumeAuction = (id: string, actor: string) => transitionAuction(id, "live", actor);
export const closeAuction = (id: string, actor: string) => transitionAuction(id, "closing", actor);
export async function finalizeResults(auctionId: string, actor: string): Promise<AuctionRecord> {
  const auction = await getAuction(auctionId);
  let state = auction.state;
  if (state === "closing") {
    await transitionAuction(auctionId, "results_processing", actor);
    state = "results_processing";
  }
  const finalized = await transitionAuction(auctionId, "results_finalized", actor);
  await createAwardsForAuction(auctionId, actor);
  return finalized;
}
export const settleAuction = (id: string, actor: string) => transitionAuction(id, "settlement", actor);
export const archiveAuction = (id: string, actor: string) => transitionAuction(id, "archived", actor);
export const cancelAuction = (id: string, actor: string) => transitionAuction(id, "cancelled", actor);

const LOT_TRANSITIONS: Record<LotState, LotState[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["open", "cancelled"],
  open: ["live", "cancelled", "withdrawn"],
  live: ["paused", "closing", "cancelled", "withdrawn"],
  paused: ["live", "cancelled"],
  closing: ["closed", "cancelled"],
  closed: ["awarded", "unawarded", "cancelled"],
  awarded: ["settled", "cancelled"],
  unawarded: ["archived"],
  cancelled: ["archived"],
  withdrawn: ["archived"],
  settled: ["archived"],
  archived: [],
};

export async function createLot(
  auctionId: string,
  input: {
    propertyId?: string;
    parcelId?: string;
    lotNumber?: string;
    startingRate: number;
    minimumRate?: number;
    rateIncrement?: number;
    ratePrecision?: number;
  },
): Promise<string> {
  const { rows } = await getPool().query(
    `INSERT INTO auction_lots
       (auction_id, property_id, parcel_id, lot_number, status, starting_rate, current_rate, minimum_rate, rate_increment, rate_precision)
     VALUES ($1,$2,$3,$4,'draft',$5,$5,$6,$7,$8) RETURNING id`,
    [
      auctionId,
      input.propertyId ?? null,
      input.parcelId ?? null,
      input.lotNumber ?? null,
      input.startingRate,
      input.minimumRate ?? 0,
      input.rateIncrement ?? 0.25,
      input.ratePrecision ?? 2,
    ],
  );
  return rows[0].id as string;
}

export async function listLots(auctionId: string) {
  const { rows } = await getPool().query(
    `SELECT al.id, al.auction_id, al.property_id, al.parcel_id, al.lot_number,
            al.status, al.starting_rate, al.current_rate, al.minimum_rate,
            al.taxes_owed, al.tax_year, al.redemption_period_months,
            p.address, p.city, p.state, p.postal_code, p.property_type, p.assessed_value
     FROM auction_lots al
     LEFT JOIN properties p ON p.id = al.property_id
     WHERE al.auction_id = $1
     ORDER BY al.lot_number NULLS LAST, al.created_at`,
    [auctionId],
  );
  return rows;
}

export async function getLot(id: string) {
  const { rows } = await getPool().query(`SELECT * FROM auction_lots WHERE id = $1`, [id]);
  if (!rows[0]) throw new NotFoundError("Lot not found");
  return rows[0];
}

export async function transitionLot(lotId: string, to: LotState, actorId: string) {
  return transaction(async (client) => {
    const { rows } = await client.query(`SELECT status FROM auction_lots WHERE id = $1 FOR UPDATE`, [lotId]);
    if (!rows[0]) throw new NotFoundError("Lot not found");
    const from = rows[0].status as LotState;
    if (!LOT_TRANSITIONS[from].includes(to)) {
      throw new ConflictError(`Invalid lot state transition: ${from} -> ${to}`);
    }
    await client.query(`UPDATE auction_lots SET status = $1, updated_at = now() WHERE id = $2`, [to, lotId]);
  });
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
export async function registerForAuction(
  auctionId: string,
  ctx: AuthContext,
): Promise<{ registrationId: string; status: RegistrationState }> {
  const auction = await getAuction(auctionId);
  if (auction.state !== "registration_open") {
    throw new ConflictError("Registration is not open for this auction", { auctionState: auction.state });
  }
  const rules = auction.jurisdictionId ? await getJurisdictionRules(auction.jurisdictionId).catch(() => null) : null;
  if (rules?.kycRequired) {
    const { rows } = await getPool().query(`SELECT status FROM kyc_verifications WHERE user_id = $1`, [ctx.userId]);
    if (!rows[0] || rows[0].status !== "verified") {
      throw new AppError("KYC_REQUIRED", "KYC verification required to register", 409);
    }
  }
  return transaction(async (client) => {
    const existing = await client.query(
      `SELECT id, status FROM auction_registrations WHERE auction_id = $1 AND user_id = $2`,
      [auctionId, ctx.userId],
    );
    if (existing.rows.length > 0 && existing.rows[0].status !== "cancelled" && existing.rows[0].status !== "rejected") {
      throw new ConflictError("Already registered for this auction");
    }
    const status: RegistrationState = rules?.registrationRequired === false ? "approved" : "pending";
    const { rows } = await client.query(
      `INSERT INTO auction_registrations (auction_id, user_id, status)
       VALUES ($1,$2,$3)
       ON CONFLICT (auction_id, user_id) DO UPDATE SET status = $3, reviewed_at = NULL
       RETURNING id, status`,
      [auctionId, ctx.userId, status],
    );
    return { registrationId: rows[0].id as string, status: rows[0].status as RegistrationState };
  });
}

export async function reviewRegistration(
  registrationId: string,
  approve: boolean,
  reviewerId: string,
): Promise<void> {
  await transaction(async (client) => {
    const { rows } = await client.query(`SELECT id FROM auction_registrations WHERE id = $1 FOR UPDATE`, [
      registrationId,
    ]);
    if (!rows[0]) throw new NotFoundError("Registration not found");
    await client.query(
      `UPDATE auction_registrations SET status = $1, reviewed_by = $2, reviewed_at = now() WHERE id = $3`,
      [approve ? "approved" : "rejected", reviewerId, registrationId],
    );
  });
}

export async function getRegistrationEligibility(auctionId: string, ctx: AuthContext) {
  const auction = await getAuction(auctionId);
  const reasons: string[] = [];
  if (auction.state !== "registration_open") reasons.push("registration_closed");
  const rules = auction.jurisdictionId ? await getJurisdictionRules(auction.jurisdictionId).catch(() => null) : null;
  if (rules?.kycRequired) {
    const { rows } = await getPool().query(`SELECT status FROM kyc_verifications WHERE user_id = $1`, [ctx.userId]);
    if (!rows[0] || rows[0].status !== "verified") reasons.push("kyc_required");
  }
  return { eligible: reasons.length === 0, reasons };
}
