import { getPool, transaction } from "../db/pool.js";
import { NotFoundError } from "../shared/errors.js";

export interface AwardRow {
  id: string;
  auctionId: string;
  auctionLotId: string;
  userId: string;
  certificateId: string | null;
  principalAmount: number;
  winningInterestRate: number | null;
  status: string;
  createdAt: string;
}

function mapAward(r: Record<string, unknown>): AwardRow {
  return {
    id: r.id as string,
    auctionId: r.auction_id as string,
    auctionLotId: r.auction_lot_id as string,
    userId: r.user_id as string,
    certificateId: (r.certificate_id as string) ?? null,
    principalAmount: Number(r.principal_amount),
    winningInterestRate: r.winning_interest_rate == null ? null : Number(r.winning_interest_rate),
    status: r.status as string,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

/**
 * Create award rows for every lot in the auction that has a winning bid.
 * Idempotent: existing awards for a lot are skipped.
 */
export async function createAwardsForAuction(auctionId: string, actorId: string): Promise<number> {
  return transaction(async (client) => {
    const lots = await client.query(
      `SELECT l.id AS lot_id, l.winning_bid_id, b.user_id, b.amount, b.rate
       FROM auction_lots l
       JOIN bids b ON b.id = l.winning_bid_id
       WHERE l.auction_id = $1 AND l.winning_bid_id IS NOT NULL`,
      [auctionId],
    );
    let count = 0;
    for (const lot of lots.rows) {
      const existing = await client.query(`SELECT id FROM awards WHERE auction_lot_id = $1`, [lot.lot_id]);
      if (existing.rows.length > 0) continue;
      const res = await client.query(
        `INSERT INTO awards (auction_id, auction_lot_id, user_id, principal_amount, winning_interest_rate, status)
         VALUES ($1,$2,$3,$4,$5,'won') RETURNING id`,
        [auctionId, lot.lot_id, lot.user_id, Number(lot.amount), Number(lot.rate)],
      );
      await client.query(
        `INSERT INTO award_events (award_id, event_type, actor_id, payload)
         VALUES ($1,'created',$2,$3)`,
        [res.rows[0].id, actorId, JSON.stringify({ lotId: lot.lot_id })],
      );
      count++;
    }
    return count;
  });
}

export async function listAwardsForAuction(auctionId: string): Promise<AwardRow[]> {
  const { rows } = await getPool().query(
    `SELECT * FROM awards WHERE auction_id = $1 ORDER BY created_at`,
    [auctionId],
  );
  return rows.map(mapAward);
}

export async function listAwardsForUser(userId: string): Promise<AwardRow[]> {
  const { rows } = await getPool().query(
    `SELECT * FROM awards WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(mapAward);
}

export async function getAward(awardId: string): Promise<AwardRow> {
  const { rows } = await getPool().query(`SELECT * FROM awards WHERE id = $1`, [awardId]);
  if (!rows[0]) throw new NotFoundError("Award not found");
  return mapAward(rows[0]);
}
