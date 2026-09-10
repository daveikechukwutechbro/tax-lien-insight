import { getPool } from "../db/pool.js";
import { NotFoundError } from "../shared/errors.js";
import type { JurisdictionType } from "../shared/constants.js";

export interface JurisdictionRule {
  jurisdictionId: string;
  auctionType: string | null;
  bidMethod: string | null;
  interestRateMin: number;
  interestRateMax: number;
  interestIncrement: number;
  interestPrecision: number;
  openingBidRule: string | null;
  minimumBidRule: string | null;
  registrationRequired: boolean;
  kycRequired: boolean;
  depositRequired: boolean;
  depositAmount: number;
  paymentDeadlineHours: number;
  certificateIssueRule: string | null;
  redemptionEnabled: boolean;
  redemptionPeriodDays: number | null;
  redemptionCalculationMethod: string | null;
  noticeRule: string | null;
  publicationRule: string | null;
  status: string;
}

export async function listStates() {
  const { rows } = await getPool().query(
    `SELECT id, code, name, country_code, status FROM states WHERE status = 'active' ORDER BY name`,
  );
  return rows;
}

export async function listJurisdictions(stateId?: string) {
  const params = stateId ? [stateId] : [];
  const where = stateId ? `WHERE j.state_id = $1` : "";
  const { rows } = await getPool().query(
    `SELECT j.id, j.parent_id, j.jurisdiction_type, j.official_code, j.name, j.state_id, j.status,
            s.code AS state_code
     FROM jurisdictions j
     LEFT JOIN states s ON s.id = j.state_id
     ${where} ORDER BY j.name`,
    params,
  );
  return rows;
}

export async function getJurisdictionRules(jurisdictionId: string): Promise<JurisdictionRule> {
  const { rows } = await getPool().query(
    `SELECT * FROM jurisdiction_rules
     WHERE jurisdiction_id = $1 AND status = 'active'
       AND effective_from <= now() AND (effective_to IS NULL OR effective_to > now())
     ORDER BY effective_from DESC LIMIT 1`,
    [jurisdictionId],
  );
  if (!rows[0]) throw new NotFoundError("No active jurisdiction rules found");
  return mapRule(rows[0]);
}

/** Resolve the rules effective at a historical date (for snapshots/redemption calc). */
export async function getJurisdictionRulesAt(jurisdictionId: string, at: Date): Promise<JurisdictionRule> {
  const { rows } = await getPool().query(
    `SELECT * FROM jurisdiction_rules
     WHERE jurisdiction_id = $1 AND effective_from <= $2 AND (effective_to IS NULL OR effective_to > $2)
     ORDER BY effective_from DESC LIMIT 1`,
    [jurisdictionId, at.toISOString()],
  );
  if (!rows[0]) throw new NotFoundError("No jurisdiction rules effective at given date");
  return mapRule(rows[0]);
}

function mapRule(r: Record<string, unknown>): JurisdictionRule {
  return {
    jurisdictionId: r.jurisdiction_id as string,
    auctionType: (r.auction_type as string) ?? null,
    bidMethod: (r.bid_method as string) ?? null,
    interestRateMin: Number(r.interest_rate_min),
    interestRateMax: Number(r.interest_rate_max),
    interestIncrement: Number(r.interest_increment),
    interestPrecision: Number(r.interest_precision),
    openingBidRule: (r.opening_bid_rule as string) ?? null,
    minimumBidRule: (r.minimum_bid_rule as string) ?? null,
    registrationRequired: r.registration_required as boolean,
    kycRequired: r.kyc_required as boolean,
    depositRequired: r.deposit_required as boolean,
    depositAmount: Number(r.deposit_amount),
    paymentDeadlineHours: Number(r.payment_deadline_hours),
    certificateIssueRule: (r.certificate_issue_rule as string) ?? null,
    redemptionEnabled: r.redemption_enabled as boolean,
    redemptionPeriodDays: r.redemption_period_days == null ? null : Number(r.redemption_period_days),
    redemptionCalculationMethod: (r.redemption_calculation_method as string) ?? null,
    noticeRule: (r.notice_rule as string) ?? null,
    publicationRule: (r.publication_rule as string) ?? null,
    status: r.status as string,
  };
}

export async function createJurisdiction(input: {
  jurisdictionType: JurisdictionType;
  name: string;
  stateId?: string;
  parentId?: string;
  officialCode?: string;
  metadata?: Record<string, unknown>;
}) {
  const { rows } = await getPool().query(
    `INSERT INTO jurisdictions (jurisdiction_type, name, state_id, parent_id, official_code, metadata)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [
      input.jurisdictionType,
      input.name,
      input.stateId ?? null,
      input.parentId ?? null,
      input.officialCode ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return rows[0].id as string;
}
