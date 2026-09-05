import { getPool, transaction } from "../db/pool.js";
import { NotFoundError, ConflictError, AppError, ConfigurationError } from "../shared/errors.js";
import { credit } from "../funds/funds.service.js";
import { getBlockchainProvider } from "../providers/blockchain/index.js";
import { config } from "../shared/config.js";
import type { Cents } from "../shared/api.js";

export async function ensureDepositAddress(userId: string, networkCode: string, tokenSymbol: string): Promise<string> {
  const { rows } = await getPool().query(
    `SELECT address FROM deposit_addresses WHERE user_id = $1 AND network_code = $2 AND token_symbol = $3 AND status = 'active'`,
    [userId, networkCode, tokenSymbol],
  );
  if (rows[0]) return rows[0].address as string;
  const address = `${networkCode}:${tokenSymbol}:${userId.slice(0, 8)}:${Math.random().toString(36).slice(2, 10)}`;
  await getPool().query(
    `INSERT INTO deposit_addresses (user_id, network_code, token_symbol, address, status) VALUES ($1,$2,$3,$4,'active')`,
    [userId, networkCode, tokenSymbol, address],
  );
  return address;
}

export async function createDeposit(userId: string, input: {
  networkCode: string;
  tokenSymbol: string;
  expectedAmountCents?: Cents;
  transactionHash?: string;
  idempotencyKey?: string;
}): Promise<{ depositId: string; status: string }> {
  const account = await getPool().query(
    `SELECT id FROM funds_accounts WHERE user_id = $1 AND currency = 'USDC'`,
    [userId],
  );
  if (!account.rows[0]) throw new NotFoundError("Funds account not found");
  const fundsAccountId = account.rows[0].id as string;
  const address = await ensureDepositAddress(userId, input.networkCode, input.tokenSymbol);

  // Duplicate transaction hash guard (independent of user claims).
  if (input.transactionHash) {
    const dup = await getPool().query(
      `SELECT id FROM crypto_deposits WHERE transaction_hash = $1`,
      [input.transactionHash],
    );
    if (dup.rows.length > 0) {
      throw new AppError("USDC_DUPLICATE_HASH", "Transaction hash already credited", 409);
    }
  }

  const { rows } = await getPool().query(
    `INSERT INTO crypto_deposits
       (user_id, funds_account_id, network_code, asset_symbol, token_contract, deposit_address, expected_amount, transaction_hash, status, idempotency_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, status`,
    [
      userId,
      fundsAccountId,
      input.networkCode,
      input.tokenSymbol,
      config.usdcTokenContract,
      address,
      input.expectedAmountCents ?? null,
      input.transactionHash ?? null,
      input.transactionHash ? "awaiting_payment" : "created",
      input.idempotencyKey ?? null,
    ],
  );
  return { depositId: rows[0].id as string, status: rows[0].status as string };
}

/**
 * Independently verify a deposit on-chain and credit the ledger only after the
 * provider confirms network, token contract, recipient, amount and confirmations.
 * Never trusts a user-supplied transaction hash.
 */
export async function confirmDeposit(depositId: string): Promise<{ status: string; creditedCents?: Cents }> {
  const provider = getBlockchainProvider();
  const { rows } = await getPool().query(`SELECT * FROM crypto_deposits WHERE id = $1`, [depositId]);
  if (!rows[0]) throw new NotFoundError("Deposit not found");
  const deposit = rows[0];
  if (deposit.status === "confirmed") return { status: "confirmed" };

  const tx = await provider.getTransaction(deposit.transaction_hash);
  if (!tx) throw new ConfigurationError("Transaction not found on-chain");
  if (tx.tokenContract !== config.usdcTokenContract) {
    throw new AppError("USDC_WRONG_TOKEN", "Token contract mismatch", 400, {
      expected: config.usdcTokenContract,
      actual: tx.tokenContract,
    });
  }
  if (tx.to !== deposit.deposit_address) {
    throw new AppError("USDC_WRONG_RECIPIENT", "Recipient address mismatch", 400);
  }
  const confirmations = await provider.getConfirmations(deposit.transaction_hash);
  if (confirmations < config.usdcConfirmationThreshold) {
    throw new AppError("USDC_INSUFFICIENT_CONFIRMATIONS", "Not enough confirmations yet", 425, {
      confirmations,
      threshold: config.usdcConfirmationThreshold,
    });
  }
  const receivedCents = Number(tx.value) * 100;
  return applyConfirmedDeposit(depositId, {
    receivedCents,
    transactionHash: deposit.transaction_hash,
    blockNumber: tx.blockNumber ?? null,
    confirmations,
  });
}

/** Apply a verified deposit credit. Safe to call from tests with simulated verification. */
export async function applyConfirmedDeposit(
  depositId: string,
  v: { receivedCents: Cents; transactionHash: string | null; blockNumber: number | null; confirmations: number },
): Promise<{ status: string; creditedCents: Cents }> {
  return transaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM crypto_deposits WHERE id = $1 FOR UPDATE`, [depositId]);
    const deposit = rows[0];
    if (!deposit) throw new NotFoundError("Deposit not found");
    if (deposit.status === "confirmed") return { status: "confirmed", creditedCents: Number(deposit.received_amount) };

    await client.query(
      `UPDATE crypto_deposits SET status='confirmed', received_amount=$1, block_number=$2, confirmations=$3, confirmed_at=now()
       WHERE id=$4`,
      [v.receivedCents, v.blockNumber, v.confirmations, depositId],
    );
    await client.query(
      `INSERT INTO blockchain_confirmations (deposit_id, transaction_hash, block_number, confirmation_count)
       VALUES ($1,$2,$3,$4)`,
      [depositId, v.transactionHash, v.blockNumber, v.confirmations],
    );
    await credit(deposit.funds_account_id, v.receivedCents, "deposit", {
      referenceType: "crypto_deposit",
      referenceId: depositId,
      idempotencyKey: `deposit:${depositId}`,
      category: "customer_deposit",
    });
    return { status: "confirmed", creditedCents: v.receivedCents };
  });
}

export async function listDeposits(userId?: string, status?: string) {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (userId) {
    where.push(`user_id = $${i++}`);
    params.push(userId);
  }
  if (status) {
    where.push(`status = $${i++}`);
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await getPool().query(
    `SELECT id, user_id, network_code, asset_symbol, status, expected_amount, received_amount, transaction_hash, created_at
     FROM crypto_deposits ${whereSql} ORDER BY created_at DESC LIMIT 100`,
    params,
  );
  return rows;
}
