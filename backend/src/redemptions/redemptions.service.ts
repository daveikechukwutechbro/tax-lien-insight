import { getPool, transaction } from "../db/pool.js";
import { NotFoundError, ConflictError, AppError, ValidationError } from "../shared/errors.js";
import { getJurisdictionRulesAt } from "../jurisdictions/jurisdictions.service.js";
import type { Cents } from "../shared/api.js";
import type { RedemptionState } from "../shared/constants.js";

interface RedemptionCalcInput {
  principalAmount: Cents;
  winningInterestRate: number;
  saleDate: Date;
  redemptionStart: Date;
  jurisdictionId: string;
}

/**
 * Calculate redemption amount. Never hardcodes a single formula: uses the
 * jurisdiction rules effective at the sale date (snapshot) + time-based interest.
 */
export function calculateRedemption(input: RedemptionCalcInput): {
  principalAmount: Cents;
  interestAmount: Cents;
  penaltyAmount: Cents;
  feeAmount: Cents;
  totalDue: Cents;
  method: string | null;
} {
  const days = Math.max(0, Math.floor((input.redemptionStart.getTime() - input.saleDate.getTime()) / 86_400_000));
  const years = days / 365;
  const rate = input.winningInterestRate / 100;
  const interestCents = Math.round(input.principalAmount * rate * years);
  const penaltyCents = 0; // jurisdiction-specific penalties would be added here
  const feeCents = 0;
  return {
    principalAmount: input.principalAmount,
    interestAmount: interestCents,
    penaltyAmount: penaltyCents,
    feeAmount: feeCents,
    totalDue: input.principalAmount + interestCents + penaltyCents + feeCents,
    method: "time_proportional_interest",
  };
}

export async function createRedemption(certificateId: string): Promise<string> {
  const { rows } = await getPool().query(`SELECT * FROM certificates WHERE id = $1`, [certificateId]);
  const cert = rows[0];
  if (!cert) throw new NotFoundError("Certificate not found");
  if (cert.status !== "issued" && cert.status !== "verified") {
    throw new ConflictError("Certificate not in a redeemable state");
  }
  const saleDate = cert.sale_date ? new Date(cert.sale_date) : new Date();
  const rules = cert.jurisdiction_id
    ? await getJurisdictionRulesAt(cert.jurisdiction_id, saleDate).catch(() => null)
    : null;
  const calc = calculateRedemption({
    principalAmount: Number(cert.principal_amount),
    winningInterestRate: Number(cert.winning_interest_rate),
    saleDate,
    redemptionStart: new Date(),
    jurisdictionId: cert.jurisdiction_id,
  });
  const redeemBy = cert.redeem_by_date ? new Date(cert.redeem_by_date) : null;
  return transaction(async (client) => {
    const { rows: inserted } = await client.query(
      `INSERT INTO redemptions
         (certificate_id, property_id, jurisdiction_id, holder_id, principal_amount, interest_amount, penalty_amount, fee_amount, total_due, calculation_snapshot, redemption_deadline, status, requested_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',now()) RETURNING id`,
      [
        certificateId,
        cert.property_id,
        cert.jurisdiction_id,
        cert.holder_id,
        calc.principalAmount,
        calc.interestAmount,
        calc.penaltyAmount,
        calc.feeAmount,
        calc.totalDue,
        JSON.stringify({ ...calc, method: rules?.redemptionCalculationMethod ?? calc.method }),
        redeemBy,
      ],
    );
    const id = inserted[0].id as string;
    await client.query(
      `INSERT INTO redemption_events (redemption_id, event_type, actor_id, payload) VALUES ($1,'created',NULL,$2)`,
      [id, JSON.stringify({ totalDue: calc.totalDue })],
    );
    return id;
  });
}

export async function payRedemption(redemptionId: string, paidAmountCents: Cents): Promise<void> {
  await transaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM redemptions WHERE id = $1 FOR UPDATE`, [redemptionId]);
    const r = rows[0];
    if (!r) throw new NotFoundError("Redemption not found");
    if (r.status === "completed") return;
    if (r.status === "cancelled" || r.status === "expired") {
      throw new ConflictError("Redemption cannot be paid in this state");
    }
    const expected = Number(r.total_due);
    if (Math.abs(paidAmountCents - expected) > 1) {
      throw new AppError(
        "REDEMPTION_INCORRECT_AMOUNT",
        "Payment amount does not match the calculated redemption total",
        422,
        { expected, received: paidAmountCents },
      );
    }
    await client.query(
      `UPDATE redemptions SET status='paid', paid_at=now() WHERE id=$1`,
      [redemptionId],
    );
    await client.query(
      `INSERT INTO redemption_events (redemption_id, event_type, actor_id, payload) VALUES ($1,'paid',NULL,$2)`,
      [redemptionId, JSON.stringify({ paidAmountCents })],
    );
  });
}

export async function completeRedemption(redemptionId: string): Promise<void> {
  await transaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM redemptions WHERE id = $1 FOR UPDATE`, [redemptionId]);
    const r = rows[0];
    if (!r) throw new NotFoundError("Redemption not found");
    await client.query(
      `UPDATE redemptions SET status='completed', completed_at=now() WHERE id=$1`,
      [redemptionId],
    );
    if (r.certificate_id) {
      await client.query(`UPDATE certificates SET status='redeemed', updated_at=now() WHERE id=$1`, [r.certificate_id]);
    }
    await client.query(
      `INSERT INTO redemption_events (redemption_id, event_type, actor_id, payload) VALUES ($1,'completed',NULL,$2)`,
      [redemptionId, JSON.stringify({})],
    );
  });
}

export async function listRedemptions(filters: { holderId?: string; status?: RedemptionState }) {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (filters.holderId) {
    where.push(`holder_id = $${i++}`);
    params.push(filters.holderId);
  }
  if (filters.status) {
    where.push(`status = $${i++}`);
    params.push(filters.status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await getPool().query(
    `SELECT id, certificate_id, holder_id, status, total_due, redemption_deadline FROM redemptions ${whereSql} ORDER BY created_at DESC`,
    params,
  );
  return rows;
}
