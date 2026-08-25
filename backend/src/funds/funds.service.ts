import { getPool, transaction, type TxClient, forUpdate } from "../db/pool.js";
import { AppError, NotFoundError } from "../shared/errors.js";
import type { Cents } from "../shared/api.js";
import type { LedgerEntryType } from "../shared/constants.js";

export interface FundsAccount {
  id: string;
  userId: string;
  currency: string;
  availableBalance: Cents;
  heldBalance: Cents;
  pendingBalance: Cents;
}

function rowToAccount(r: Record<string, unknown>): FundsAccount {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    currency: r.currency as string,
    availableBalance: Number(r.available_balance),
    heldBalance: Number(r.held_balance),
    pendingBalance: Number(r.pending_balance),
  };
}

export async function ensureAccount(userId: string, currency = "USDC"): Promise<FundsAccount> {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM funds_accounts WHERE user_id = $1 AND currency = $2`,
      [userId, currency],
    );
    if (rows[0]) return rowToAccount(rows[0]);
    const { rows: inserted } = await client.query(
      `INSERT INTO funds_accounts (user_id, currency) VALUES ($1,$2) RETURNING *`,
      [userId, currency],
    );
    return rowToAccount(inserted[0]);
  });
}

export async function getAccount(userId: string, currency = "USDC"): Promise<FundsAccount> {
  const { rows } = await getPool().query(
    `SELECT * FROM funds_accounts WHERE user_id = $1 AND currency = $2`,
    [userId, currency],
  );
  if (!rows[0]) throw new NotFoundError("Funds account not found");
  return rowToAccount(rows[0]);
}

async function ledgerEntry(
  client: TxClient,
  accountId: string,
  entryType: LedgerEntryType,
  direction: "credit" | "debit",
  amount: Cents,
  opts: { referenceType?: string; referenceId?: string; idempotencyKey?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  if (opts.idempotencyKey) {
    const dup = await client.query(`SELECT id FROM ledger_entries WHERE idempotency_key = $1`, [
      opts.idempotencyKey,
    ]);
    if (dup.rows.length > 0) return;
  }
  const { rows } = await client.query(
    `SELECT available_balance, held_balance FROM funds_accounts WHERE id = $1 ${forUpdate()}`,
    [accountId],
  );
  const acc = rows[0];
  const balanceAfter = Number(acc.available_balance) + Number(acc.held_balance);
  await client.query(
    `INSERT INTO ledger_entries
       (funds_account_id, entry_type, direction, amount, currency, reference_type, reference_id, idempotency_key, balance_after, metadata)
     VALUES ($1,$2,$3,$4,'USDC',$5,$6,$7,$8,$9)`,
    [
      accountId,
      entryType,
      direction,
      amount,
      opts.referenceType ?? null,
      opts.referenceId ?? null,
      opts.idempotencyKey ?? null,
      balanceAfter,
      JSON.stringify(opts.metadata ?? {}),
    ],
  );
}

export async function credit(
  accountId: string,
  amount: Cents,
  entryType: LedgerEntryType,
  ref: { referenceType?: string; referenceId?: string; idempotencyKey?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  await transaction(async (client) => {
    await client.query(
      `UPDATE funds_accounts SET available_balance = available_balance + $1, updated_at = now() WHERE id = $2`,
      [amount, accountId],
    );
    await ledgerEntry(client, accountId, entryType, "credit", amount, ref);
  });
}

export interface HoldResult {
  holdId: string;
  accountId: string;
  amount: Cents;
}

export async function createHold(opts: {
  accountId: string;
  userId: string;
  lotId?: string;
  bidId?: string;
  amount: Cents;
  idempotencyKey?: string;
}): Promise<HoldResult> {
  return transaction(async (client) => {
    if (opts.idempotencyKey) {
      const dup = await client.query(`SELECT id, status FROM fund_holds WHERE idempotency_key = $1`, [
        opts.idempotencyKey,
      ]);
      if (dup.rows.length > 0) {
        const h = dup.rows[0];
        if (h.status === "active" || h.status === "consumed") {
          return { holdId: h.id, accountId: opts.accountId, amount: opts.amount };
        }
      }
    }
    const { rows } = await client.query(
      `SELECT available_balance, held_balance FROM funds_accounts WHERE id = $1 ${forUpdate()}`,
      [opts.accountId],
    );
    const acc = rows[0];
    if (!acc) throw new NotFoundError("Funds account not found");
    const available = Number(acc.available_balance);
    if (available < opts.amount) {
      throw new AppError("INSUFFICIENT_FUNDS", "Insufficient available balance for hold", 409, {
        available,
        required: opts.amount,
      });
    }
    await client.query(
      `UPDATE funds_accounts SET available_balance = available_balance - $1, held_balance = held_balance + $1, updated_at = now() WHERE id = $2`,
      [opts.amount, opts.accountId],
    );
    const { rows: inserted } = await client.query(
      `INSERT INTO fund_holds (funds_account_id, user_id, auction_lot_id, bid_id, amount, status, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,'active',$6) RETURNING id`,
      [opts.accountId, opts.userId, opts.lotId ?? null, opts.bidId ?? null, opts.amount, opts.idempotencyKey ?? null],
    );
    await ledgerEntry(client, opts.accountId, "bid_hold", "debit", opts.amount, {
      referenceType: "fund_hold",
      referenceId: inserted[0].id,
      idempotencyKey: opts.idempotencyKey ? `ledger:${opts.idempotencyKey}` : undefined,
      metadata: { lotId: opts.lotId, bidId: opts.bidId },
    });
    return { holdId: inserted[0].id, accountId: opts.accountId, amount: opts.amount };
  });
}

export async function releaseHold(holdId: string): Promise<void> {
  await transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM fund_holds WHERE id = $1 ${forUpdate()}`,
      [holdId],
    );
    const hold = rows[0];
    if (!hold) throw new NotFoundError("Hold not found");
    if (hold.status !== "active") return;
    const amount = Number(hold.amount);
    await client.query(
      `UPDATE funds_accounts SET available_balance = available_balance + $1, held_balance = held_balance - $1, updated_at = now() WHERE id = $2`,
      [amount, hold.funds_account_id],
    );
    await client.query(
      `UPDATE fund_holds SET status = 'released', released_at = now() WHERE id = $1`,
      [holdId],
    );
    await ledgerEntry(client, hold.funds_account_id, "bid_hold_release", "credit", amount, {
      referenceType: "fund_hold",
      referenceId: holdId,
    });
  });
}

export async function consumeHold(
  holdId: string,
  ref: { referenceType: string; referenceId: string; metadata?: Record<string, unknown> },
): Promise<void> {
  await transaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM fund_holds WHERE id = $1 ${forUpdate()}`, [holdId]);
    const hold = rows[0];
    if (!hold) throw new NotFoundError("Hold not found");
    if (hold.status !== "active") return;
    const amount = Number(hold.amount);
    await client.query(
      `UPDATE funds_accounts SET held_balance = held_balance - $1, updated_at = now() WHERE id = $2`,
      [amount, hold.funds_account_id],
    );
    await client.query(
      `UPDATE fund_holds SET status = 'consumed', consumed_at = now() WHERE id = $1`,
      [holdId],
    );
    await ledgerEntry(client, hold.funds_account_id, "auction_settlement", "debit", amount, {
      referenceType: ref.referenceType,
      referenceId: ref.referenceId,
      metadata: ref.metadata,
    });
  });
}

export async function adjustBalance(opts: {
  accountId: string;
  amount: Cents;
  reason: string;
  actorId: string;
  requiresSecondApproval?: boolean;
}): Promise<void> {
  if (opts.amount >= 0) {
    await credit(opts.accountId, opts.amount, "adjustment", {
      referenceType: "admin_adjustment",
      metadata: { reason: opts.reason, actorId: opts.actorId },
    });
  } else {
    await transaction(async (client) => {
      const { rows } = await client.query(
        `SELECT available_balance FROM funds_accounts WHERE id = $1 ${forUpdate()}`,
        [opts.accountId],
      );
      if (Number(rows[0].available_balance) < -opts.amount) {
        throw new AppError("INSUFFICIENT_FUNDS", "Cannot debit more than available", 409);
      }
      await client.query(
        `UPDATE funds_accounts SET available_balance = available_balance + $1, updated_at = now() WHERE id = $2`,
        [opts.amount, opts.accountId],
      );
      await ledgerEntry(client, opts.accountId, "adjustment", "debit", -opts.amount, {
        referenceType: "admin_adjustment",
        metadata: { reason: opts.reason, actorId: opts.actorId },
      });
    });
  }
  await getPool().query(
    `INSERT INTO financial_adjustments (funds_account_id, actor_id, amount, reason, requires_second_approval)
     VALUES ($1,$2,$3,$4,$5)`,
    [opts.accountId, opts.actorId, opts.amount, opts.reason, opts.requiresSecondApproval ?? false],
  );
}

export async function getSummary(userId: string): Promise<{
  accountId: string;
  available: number;
  held: number;
  pending: number;
  total: number;
}> {
  const acc = await getAccount(userId);
  return {
    accountId: acc.id,
    available: acc.availableBalance,
    held: acc.heldBalance,
    pending: acc.pendingBalance,
    total: acc.availableBalance + acc.heldBalance + acc.pendingBalance,
  };
}
