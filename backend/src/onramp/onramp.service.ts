import { randomUUID } from "node:crypto";
import { getPool, transaction, forUpdate } from "../db/pool.js";
import { ensureAccount } from "../funds/funds.service.js";
import { config } from "../shared/config.js";
import { AppError, NotFoundError, ValidationError } from "../shared/errors.js";
import { logger } from "../shared/logger.js";
import {
  getOnRampProvider,
  isOnRampConfigured,
  onRampWalletAddress,
} from "../providers/onramp/index.js";

const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const USDC_DECIMALS = 6n;
const CENTS_PER_UNIT = 10n ** (USDC_DECIMALS - 2n); // 1 cent = 10^4 USDC base units

const PUBLIC_RPC: Record<string, string> = {
  base: "https://mainnet.base.org",
  ethereum: "https://eth.llamarpc.com",
  mainnet: "https://eth.llamarpc.com",
  polygon: "https://polygon-rpc.com",
  optimism: "https://mainnet.optimism.io",
  arbitrum: "https://arb1.arbitrum.io/rpc",
};

export interface OnRampOrder {
  id: string;
  status: string;
  provider: string;
  providerOrderId: string | null;
  fiatAmountCents: number;
  fiatCurrency: string;
  cryptoSymbol: string;
  network: string;
  quotedCryptoCents: number | null;
  deliveredCryptoCents: number | null;
  transactionHash: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  creditedAt: string | null;
}

function rowToOrder(r: Record<string, unknown>): OnRampOrder {
  return {
    id: r.id as string,
    status: r.status as string,
    provider: r.provider as string,
    providerOrderId: (r.provider_order_id as string) ?? null,
    fiatAmountCents: Number(r.fiat_amount_cents),
    fiatCurrency: r.fiat_currency as string,
    cryptoSymbol: r.crypto_symbol as string,
    network: r.network as string,
    quotedCryptoCents: r.quoted_crypto_cents == null ? null : Number(r.quoted_crypto_cents),
    deliveredCryptoCents: r.delivered_crypto_cents == null ? null : Number(r.delivered_crypto_cents),
    transactionHash: (r.transaction_hash as string) ?? null,
    failureReason: (r.failure_reason as string) ?? null,
    createdAt: (r.created_at as Date).toISOString(),
    completedAt: r.completed_at ? (r.completed_at as Date).toISOString() : null,
    creditedAt: r.credited_at ? (r.credited_at as Date).toISOString() : null,
  };
}

export function getOnRampPublicConfig() {
  return {
    configured: isOnRampConfigured(),
    provider: "transak",
    minCents: config.onrampMinCents,
    maxCents: config.onrampMaxCents,
    fiatCurrency: config.onrampFiatCurrency,
    cryptoSymbol: config.onrampCrypto,
    network: config.onrampNetwork,
    onChainVerification: Boolean(config.blockchainRpcUrl || PUBLIC_RPC[config.onrampNetwork]),
  };
}

export interface CreateOrderInput {
  fiatAmountCents: number;
  email?: string;
}

export interface CreateOrderResult {
  orderId: string;
  status: string;
  widgetUrl: string;
}

export async function createOnRampOrder(
  userId: string,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  if (!isOnRampConfigured()) {
    throw new AppError(
      "ONRAMP_NOT_CONFIGURED",
      "Card funding is not enabled yet. Please try again later.",
      503,
    );
  }
  const amount = Math.round(Number(input.fiatAmountCents));
  if (!Number.isFinite(amount) || amount < config.onrampMinCents || amount > config.onrampMaxCents) {
    throw new ValidationError(
      `Card amount must be between $${(config.onrampMinCents / 100).toFixed(0)} and $${(config.onrampMaxCents / 100).toFixed(0)}`,
    );
  }

  const account = await ensureAccount(userId);
  const partnerOrderId = randomUUID();
  const wallet = onRampWalletAddress();
  const network = config.onrampNetwork;
  const cryptoSymbol = config.onrampCrypto;
  const fiatCurrency = config.onrampFiatCurrency;
  const redirectUrl = config.appUrl
    ? `${config.appUrl.replace(/\/$/, "")}/dashboard/funds?onramp=${partnerOrderId}`
    : undefined;

  const { rows } = await getPool().query(
    `INSERT INTO onramp_orders
       (id, user_id, funds_account_id, provider, partner_order_id, status,
        fiat_amount_cents, fiat_currency, crypto_symbol, network, wallet_address, quoted_crypto_cents)
     VALUES ($1,$2,$3,'transak',$4,'created',$5,$6,$7,$8,$9,$5)
     RETURNING id`,
    [partnerOrderId, userId, account.id, partnerOrderId, amount, fiatCurrency, cryptoSymbol, network, wallet],
  );
  const orderId = rows[0].id as string;

  try {
    const widgetUrl = await getOnRampProvider().createWidgetUrl({
      fiatAmount: amount / 100,
      fiatCurrency,
      cryptoSymbol,
      network,
      walletAddress: wallet,
      partnerOrderId,
      partnerCustomerId: userId,
      email: input.email,
      redirectUrl,
    });
    await getPool().query(
      `UPDATE onramp_orders SET status='pending_payment', widget_url=$1, updated_at=now() WHERE id=$2`,
      [widgetUrl, orderId],
    );
    return { orderId, status: "pending_payment", widgetUrl };
  } catch (err) {
    await getPool().query(
      `UPDATE onramp_orders SET status='failed', failure_reason=$1, updated_at=now() WHERE id=$2`,
      [(err as Error).message.slice(0, 500), orderId],
    );
    throw err;
  }
}

const TRANSAK_STATUS_MAP: Record<string, string> = {
  ORDER_CREATED: "pending_payment",
  ORDER_PAYMENT_VERIFYING: "pending_payment",
  ORDER_PROCESSING: "processing",
  ORDER_COMPLETED: "completed",
  ORDER_FAILED: "failed",
  ORDER_REFUNDED: "refunded",
  ORDER_CANCELLED: "cancelled",
  ORDER_EXPIRED: "expired",
};

export interface WebhookResult {
  orderId: string | null;
  eventId: string;
  status: string;
  credited: boolean;
  message: string;
}

export async function handleOnRampWebhook(headers: Headers, rawBody: string): Promise<WebhookResult> {
  const provider = getOnRampProvider();
  let payload;
  try {
    payload = provider.verifyWebhook(headers, rawBody);
  } catch (err) {
    logger.warn("Rejected on-ramp webhook", { errorCode: (err as Error).message });
    throw err;
  }
  const { eventId, data } = payload;
  const providerOrderId = data.id ? String(data.id) : null;
  const partnerOrderId = data.partnerOrderId ? String(data.partnerOrderId) : null;

  let order: Record<string, unknown> | undefined;
  if (partnerOrderId) {
    order = (
      await getPool().query(`SELECT * FROM onramp_orders WHERE partner_order_id = $1`, [partnerOrderId])
    ).rows[0];
  }
  if (!order && providerOrderId) {
    order = (
      await getPool().query(`SELECT * FROM onramp_orders WHERE provider = $1 AND provider_order_id = $2`, [
        provider.name,
        providerOrderId,
      ])
    ).rows[0];
  }
  if (!order) {
    logger.warn("On-ramp webhook for unknown order", { eventId });
    return { orderId: null, eventId, status: "ignored", credited: false, message: "unknown order" };
  }
  const orderId = order.id as string;

  const txHash = data.transactionHash ? String(data.transactionHash) : null;
  if (providerOrderId && !order.provider_order_id) {
    await getPool().query(`UPDATE onramp_orders SET provider_order_id=$1, updated_at=now() WHERE id=$2`, [
      providerOrderId,
      orderId,
    ]);
  }

  if (eventId === "ORDER_COMPLETED") {
    return finalizeCompleted(orderId, txHash, data, eventId);
  }

  if (order.credited_at) {
    return { orderId, eventId, status: "credited", credited: true, message: "already credited" };
  }

  const mapped = TRANSAK_STATUS_MAP[eventId] ?? "processing";
  await getPool().query(
    `UPDATE onramp_orders
       SET status=$1,
           transaction_hash=COALESCE($2, transaction_hash),
           raw_event=$3,
           failure_reason=CASE WHEN $1 IN ('failed','cancelled','expired') THEN COALESCE($4, failure_reason) ELSE failure_reason END,
           updated_at=now()
     WHERE id=$5`,
    [
      mapped,
      txHash,
      JSON.stringify(data),
      data.status ? String(data.status) : null,
      orderId,
    ],
  );
  return { orderId, eventId, status: mapped, credited: false, message: "status updated" };
}

async function finalizeCompleted(
  orderId: string,
  txHash: string | null,
  data: Record<string, unknown>,
  eventId: string,
): Promise<WebhookResult> {
  const existing = (await getPool().query(`SELECT credited_at FROM onramp_orders WHERE id=$1`, [orderId])).rows[0];
  if (existing?.credited_at) {
    return { orderId, eventId, status: "credited", credited: true, message: "already credited" };
  }

  const wallet = onRampWalletAddress();
  let receivedCents: number | null = null;
  if (txHash) {
    const verdict = await verifyUsdcTransfer(txHash, wallet);
    if (verdict.status === "confirmed" && verdict.receivedCents != null) {
      receivedCents = verdict.receivedCents;
    } else if (verdict.status === "pending") {
      await getPool().query(
        `UPDATE onramp_orders SET status='confirming', transaction_hash=$1, raw_event=$2, updated_at=now() WHERE id=$3`,
        [txHash, JSON.stringify(data), orderId],
      );
      return { orderId, eventId, status: "confirming", credited: false, message: "awaiting confirmations" };
    }
  }

  if (receivedCents == null || receivedCents <= 0) {
    await getPool().query(
      `UPDATE onramp_orders SET status='verification_failed', transaction_hash=COALESCE($1, transaction_hash), raw_event=$2, failure_reason='on-chain delivery not verified', updated_at=now() WHERE id=$3`,
      [txHash, JSON.stringify(data), orderId],
    );
    logger.error("On-ramp completion could not be verified on-chain", { orderId, txHash });
    return { orderId, eventId, status: "verification_failed", credited: false, message: "not verified" };
  }

  await creditOrder(orderId, receivedCents, txHash, data);
  return { orderId, eventId, status: "credited", credited: true, message: "credited" };
}

async function creditOrder(
  orderId: string,
  amountCents: number,
  txHash: string | null,
  data: Record<string, unknown>,
): Promise<void> {
  await transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM onramp_orders WHERE id=$1 ${forUpdate()}`,
      [orderId],
    );
    const order = rows[0];
    if (!order || order.credited_at) return;

    await client.query(
      `UPDATE funds_accounts SET available_balance = available_balance + $1, updated_at=now() WHERE id=$2`,
      [amountCents, order.funds_account_id],
    );
    const acct = (
      await client.query(
        `SELECT available_balance, held_balance FROM funds_accounts WHERE id=$1 ${forUpdate()}`,
        [order.funds_account_id],
      )
    ).rows[0];
    const balanceAfter = Number(acct.available_balance) + Number(acct.held_balance);
    await client.query(
      `INSERT INTO ledger_entries
         (funds_account_id, entry_type, direction, amount, currency, reference_type, reference_id, idempotency_key, balance_after, metadata, category)
       VALUES ($1,'deposit','credit',$2,'USDC','onramp_order',$3,$4,$5,$6,'onramp')`,
      [
        order.funds_account_id,
        amountCents,
        orderId,
        `onramp:${orderId}`,
        balanceAfter,
        JSON.stringify({ provider: "transak", txHash }),
      ],
    );
    await client.query(
      `UPDATE onramp_orders
         SET status='credited', delivered_crypto_cents=$1, transaction_hash=COALESCE($2, transaction_hash),
             raw_event=$3, credited_at=now(), completed_at=COALESCE(completed_at, now()), failure_reason=NULL, updated_at=now()
       WHERE id=$4`,
      [amountCents, txHash, JSON.stringify(data), orderId],
    );
  });
  logger.info("On-ramp order credited", { orderId, amountCents });
}

interface TransferVerdict {
  status: "confirmed" | "pending" | "not_found";
  receivedCents: number | null;
}

export async function verifyUsdcTransfer(txHash: string, toWallet: string): Promise<TransferVerdict> {
  const rpcUrl = config.blockchainRpcUrl || PUBLIC_RPC[config.onrampNetwork];
  if (!rpcUrl) return { status: "not_found", receivedCents: null };
  const token = config.usdcTokenContract.toLowerCase();

  let receipt: Record<string, unknown> | null;
  try {
    receipt = (await rpcCall(rpcUrl, "eth_getTransactionReceipt", [txHash])) as Record<string, unknown> | null;
  } catch (err) {
    logger.error("On-ramp RPC lookup failed", { errorCode: (err as Error).message });
    return { status: "pending", receivedCents: null };
  }
  if (!receipt) return { status: "pending", receivedCents: null };
  if (receipt.status !== "0x1") return { status: "not_found", receivedCents: null };

  const blockNumber = parseInt(String(receipt.blockNumber), 16);
  const confirmations = config.usdcConfirmationThreshold;
  if (confirmations > 0) {
    const head = parseInt(String(await rpcCall(rpcUrl, "eth_blockNumber", [])), 16);
    if (Number.isFinite(head) && head - blockNumber + 1 < confirmations) {
      return { status: "pending", receivedCents: null };
    }
  }

  const logs = (receipt.logs ?? []) as Array<Record<string, unknown>>;
  const target = toWallet.toLowerCase();
  for (const log of logs) {
    const topics = (log.topics ?? []) as string[];
    if (String(log.address).toLowerCase() !== token) continue;
    if ((topics[0] ?? "").toLowerCase() !== ERC20_TRANSFER_TOPIC) continue;
    if (topics.length < 3) continue;
    const to = "0x" + topics[2].slice(26).toLowerCase();
    if (to !== target) continue;
    const raw = BigInt(String(log.data));
    const receivedCents = Number(raw / CENTS_PER_UNIT);
    return { status: "confirmed", receivedCents };
  }
  return { status: "not_found", receivedCents: null };
}

async function rpcCall(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (body.error) throw new AppError("BLOCKCHAIN_RPC_ERROR", body.error.message ?? "RPC error", 502);
  return body.result;
}

export async function listOnRampOrders(userId: string, limit = 50): Promise<OnRampOrder[]> {
  const { rows } = await getPool().query(
    `SELECT * FROM onramp_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [userId, Math.min(Math.max(limit, 1), 200)],
  );
  return rows.map(rowToOrder);
}

export async function getOnRampOrder(userId: string, orderId: string): Promise<OnRampOrder> {
  const { rows } = await getPool().query(
    `SELECT * FROM onramp_orders WHERE id=$1 AND user_id=$2`,
    [orderId, userId],
  );
  if (!rows[0]) throw new NotFoundError("On-ramp order not found");
  return rowToOrder(rows[0]);
}
