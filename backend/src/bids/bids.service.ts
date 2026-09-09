import { getPool, transaction, type TxClient, forUpdate } from "../db/pool.js";
import { AppError, ConflictError, NotFoundError, ValidationError, IdempotencyError } from "../shared/errors.js";
import { assertPermission, type AuthContext } from "../auth/rbac.js";
import { getJurisdictionRules } from "../jurisdictions/jurisdictions.service.js";
import { getAuction } from "../auctions/auctions.service.js";
import { sendEmail } from "../providers/email/index.js";
import { config } from "../shared/config.js";
import type { Cents } from "../shared/api.js";
import type { BidState } from "../shared/constants.js";

export function roundToPrecision(value: number, precision: number): number {
  const f = Math.pow(10, precision);
  return Math.round(value * f) / f;
}

export function isAligned(value: number, base: number, increment: number, precision: number): boolean {
  if (increment <= 0) return true;
  const diff = roundToPrecision(base - value, precision);
  if (diff < 0) return false;
  const steps = roundToPrecision(diff / increment, precision + 2);
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

export interface PlaceBidInput {
  rate: number;
  amount: Cents;
  idempotencyKey?: string;
}

export async function placeBid(
  ctx: AuthContext,
  lotId: string,
  input: PlaceBidInput,
): Promise<{ bidId: string; status: BidState; rate: number; amount: Cents }> {
  assertPermission(ctx, "bid.view"); // bidder baseline; auctions allow bidding
  if (input.amount <= 0) throw new ValidationError("Bid amount must be positive");

  return transaction(
    async (client) => {
      // 1. Lock lot + auction
      const lotRes = await client.query(`SELECT * FROM auction_lots WHERE id = $1 ${forUpdate()}`, [lotId]);
      if (!lotRes.rows[0]) throw new NotFoundError("Lot not found");
      const lot = lotRes.rows[0];
      const auctionRes = await client.query(`SELECT * FROM auctions WHERE id = $1 ${forUpdate()}`, [lot.auction_id]);
      const auction = auctionRes.rows[0];
      if (!auction) throw new NotFoundError("Auction not found");

      // 2. Auction + lot state
      if (auction.status !== "live") {
        throw new ConflictError("Auction is not live", { auctionState: auction.status });
      }
      if (!["live", "open"].includes(lot.status)) {
        throw new ConflictError("Lot is not open for bidding", { lotState: lot.status });
      }

      // 3. Registration
      const reg = await client.query(
        `SELECT status FROM auction_registrations WHERE auction_id = $1 AND user_id = $2`,
        [auction.id, ctx.userId],
      );
      if (!reg.rows[0] || reg.rows[0].status !== "approved") {
        throw new ConflictError("Not registered/approved for this auction", { code: "NOT_REGISTERED" });
      }

      // 4. Account active
      const userRes = await client.query(`SELECT status, email FROM users WHERE id = $1`, [ctx.userId]);
      if (!userRes.rows[0] || userRes.rows[0].status !== "active") {
        throw new AppError("ACCOUNT_SUSPENDED", "Account is not active", 409);
      }

      // 5. Jurisdiction rules
      let minRate = Number(lot.minimum_rate);
      let increment = Number(lot.rate_increment);
      let precision = Number(lot.rate_precision);
      let kycRequired = false;
      if (auction.jurisdiction_id) {
        const rules = await getJurisdictionRules(auction.jurisdiction_id).catch(() => null);
        if (rules) {
          minRate = rules.interestRateMin;
          increment = rules.interestIncrement;
          precision = rules.interestPrecision;
          kycRequired = rules.kycRequired;
        }
      }
      if (kycRequired) {
        const kyc = await client.query(`SELECT status FROM kyc_verifications WHERE user_id = $1`, [ctx.userId]);
        if (!kyc.rows[0] || kyc.rows[0].status !== "verified") {
          throw new AppError("KYC_REQUIRED", "KYC verification required to bid", 409);
        }
      }

      // 6. Validate rate (interest-rate bid-down model)
      const currentRate = lot.current_rate == null ? null : Number(lot.current_rate);
      const baseRate = currentRate == null ? Number(lot.starting_rate) : currentRate;
      const floored = roundToPrecision(minRate, precision);
      const ceiling = roundToPrecision(baseRate, precision);
      const submitted = roundToPrecision(input.rate, precision);
      if (submitted > ceiling) {
        throw new AppError(
          "BID_RATE_INVALID",
          "Bid rate must be at or below the current rate",
          422,
          { submittedRate: submitted, currentRate: ceiling },
        );
      }
      if (submitted < floored) {
        throw new AppError(
          "BID_TOO_LOW",
          "Bid rate is below the jurisdiction minimum",
          422,
          { minimumAllowedRate: floored, submittedRate: submitted },
        );
      }
      if (currentRate != null && !isAligned(submitted, baseRate, increment, precision)) {
        throw new AppError(
          "BID_RATE_INVALID",
          "Bid rate must step down by the jurisdiction increment",
          422,
          { increment, minimumAllowedRate: roundToPrecision(baseRate - increment, precision) },
        );
      }

      // 7. Funds: lock account, check availability
      const acctRes = await client.query(
        `SELECT * FROM funds_accounts WHERE user_id = $1 AND currency = 'USDC' ${forUpdate()}`,
        [ctx.userId],
      );
      if (!acctRes.rows[0]) throw new NotFoundError("Funds account not found");
      const account = acctRes.rows[0];
      const available = Number(account.available_balance);
      if (available < input.amount) {
        throw new AppError(
          "INSUFFICIENT_FUNDS",
          "Insufficient available balance for bid hold",
          409,
          { available, required: input.amount },
        );
      }

      // 8. Idempotency
      if (input.idempotencyKey) {
        const dup = await client.query(
          `SELECT id, status FROM bids WHERE idempotency_key = $1`,
          [input.idempotencyKey],
        );
        if (dup.rows.length > 0) {
          const b = dup.rows[0];
          if (b.status === "winning" || b.status === "accepted") {
            return { bidId: b.id, status: b.status as BidState, rate: submitted, amount: input.amount };
          }
          throw new IdempotencyError("Duplicate bid request");
        }
      }

      // 9. Insert bid
      const bidRes = await client.query(
        `INSERT INTO bids (lot_id, auction_id, user_id, status, rate, amount, idempotency_key, is_current_winner)
         VALUES ($1,$2,$3,'accepted',$4,$5,$6,false) RETURNING id`,
        [lotId, auction.id, ctx.userId, submitted, input.amount, input.idempotencyKey ?? null],
      );
      const bidId = bidRes.rows[0].id as string;

      // 10. Create hold (available -> held)
      await client.query(
        `UPDATE funds_accounts SET available_balance = available_balance - $1, held_balance = held_balance + $1, updated_at = now() WHERE id = $2`,
        [input.amount, account.id],
      );
      const holdRes = await client.query(
        `INSERT INTO fund_holds (funds_account_id, user_id, auction_lot_id, bid_id, amount, status)
         VALUES ($1,$2,$3,$4,$5,'active') RETURNING id`,
        [account.id, ctx.userId, lotId, bidId, input.amount],
      );
      const holdId = holdRes.rows[0].id as string;
      const balanceAfter = available - input.amount + Number(account.held_balance);
      await client.query(
        `INSERT INTO ledger_entries (funds_account_id, entry_type, direction, amount, currency, reference_type, reference_id, balance_after, metadata)
         VALUES ($1,'bid_hold','debit',$2,'USDC','fund_hold',$3,$4,$5)`,
        [account.id, input.amount, holdId, balanceAfter, JSON.stringify({ bidId, lotId })],
      );

      // 11. Handle previous winner
      if (lot.winning_bid_id) {
        const prev = await client.query(`SELECT * FROM bids WHERE id = $1 ${forUpdate()}`, [lot.winning_bid_id]);
        if (prev.rows[0] && prev.rows[0].user_id !== ctx.userId) {
          const prevBid = prev.rows[0];
          await client.query(`UPDATE bids SET status = 'outbid', is_current_winner = false WHERE id = $1`, [prevBid.id]);
          await client.query(`INSERT INTO bid_events (bid_id, event_type, actor_id, payload) VALUES ($1,'outbid',$2,$3)`, [
            prevBid.id,
            ctx.userId,
            JSON.stringify({ byBidId: bidId }),
          ]);
          // Release previous hold
          const prevHold = await client.query(
            `SELECT * FROM fund_holds WHERE bid_id = $1 AND status = 'active' ${forUpdate()}`,
            [prevBid.id],
          );
          if (prevHold.rows[0]) {
            const h = prevHold.rows[0];
            await client.query(
              `UPDATE funds_accounts SET available_balance = available_balance + $1, held_balance = held_balance - $1, updated_at = now() WHERE id = $2`,
              [Number(h.amount), account.id],
            );
            await client.query(`UPDATE fund_holds SET status = 'released', released_at = now() WHERE id = $1`, [h.id]);
            await client.query(
              `INSERT INTO ledger_entries (funds_account_id, entry_type, direction, amount, currency, reference_type, reference_id, balance_after, metadata)
               VALUES ($1,'bid_hold_release','credit',$2,'USDC','fund_hold',$3,$4,$5)`,
              [account.id, Number(h.amount), h.id, available - input.amount + Number(account.held_balance) - Number(h.amount), JSON.stringify({ releasedBidId: prevBid.id })],
            );
            // Notify previous bidder
            await client.query(
              `INSERT INTO notifications (user_id, type, title, body, payload) VALUES ($1,'BID_OUTBID','You were outbid','Your bid on a lot was outbid', $2)`,
              [prevBid.user_id, JSON.stringify({ lotId, bidId })],
            );
            await sendEmail({
              template: "outbid",
              to: prevBid.user_id,
              variables: { lotId },
            }).catch(() => {});
          }
        }
      }

      // 12. Promote new bid to winning
      await client.query(`UPDATE bids SET status = 'winning', is_current_winner = true WHERE id = $1`, [bidId]);
      await client.query(`INSERT INTO bid_events (bid_id, event_type, actor_id, payload) VALUES ($1,'winning',$2,$3)`, [
        bidId,
        ctx.userId,
        JSON.stringify({ rate: submitted }),
      ]);
      await client.query(
        `UPDATE auction_lots SET current_rate = $1, winning_bid_id = $2, status = 'live' WHERE id = $3`,
        [submitted, bidId, lotId],
      );

      // 13. Audit
      await client.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, request_id, ip_address, user_agent)
         VALUES ($1,'BID_PLACED','bid',$2,$3,$4,$5)`,
        [ctx.userId, bidId, ctx.userId, "server", "server"],
      );

      return { bidId, status: "winning" as BidState, rate: submitted, amount: input.amount };
    },
    "SERIALIZABLE",
  );
}

export async function listBidsForLot(lotId: string) {
  const { rows } = await getPool().query(
    `SELECT id, lot_id, user_id, status, rate, amount, created_at FROM bids WHERE lot_id = $1 ORDER BY created_at DESC`,
    [lotId],
  );
  return rows;
}

export async function getUserBids(userId: string, page = 1, pageSize = 20) {
  const { rows } = await getPool().query(
    `SELECT b.id, b.lot_id, b.auction_id, b.status, b.rate, b.amount, b.created_at,
            p.id AS property_id, p.address, p.city, p.state, p.postal_code
     FROM bids b
     LEFT JOIN auction_lots al ON al.id = b.lot_id
     LEFT JOIN properties p ON p.id = al.property_id
     WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
    [userId, pageSize, (page - 1) * pageSize],
  );
  return rows;
}
