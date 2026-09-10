import { getPool } from "../db/pool.js";
import { sendEmail } from "../providers/email/index.js";
import { config } from "../shared/config.js";

export type DomainEventType =
  | "USER_REGISTERED"
  | "EMAIL_VERIFIED"
  | "KYC_SUBMITTED"
  | "KYC_APPROVED"
  | "KYC_REJECTED"
  | "PROPERTY_WATCHED"
  | "PROPERTY_UNWATCHED"
  | "USDC_DEPOSIT_CREATED"
  | "AUCTION_REGISTRATION_SUBMITTED"
  | "AUCTION_REGISTRATION_APPROVED"
  | "BID_PLACED"
  | "BID_OUTBID"
  | "AUCTION_ENDING"
  | "AUCTION_WON"
  | "AUCTION_LOST"
  | "INVOICE_CREATED"
  | "PAYMENT_CONFIRMED"
  | "CERTIFICATE_ISSUED"
  | "REDEMPTION_STARTED"
  | "REDEMPTION_APPROACHING_DEADLINE"
  | "REDEMPTION_COMPLETED"
  | "SAVED_SEARCH_MATCH"
  | "SUPPORT_MESSAGE";

interface EventSpec {
  title: string;
  body: (data: Record<string, unknown>) => string;
  emailTemplate?: string;
}

const SPECS: Record<DomainEventType, EventSpec> = {
  USER_REGISTERED: { title: "Welcome", body: () => "Your account was created." },
  EMAIL_VERIFIED: { title: "Email verified", body: () => "Your email is verified." },
  KYC_SUBMITTED: { title: "KYC submitted", body: () => "We received your KYC submission." },
  KYC_APPROVED: { title: "KYC approved", body: () => "Your identity is verified." },
  KYC_REJECTED: { title: "KYC rejected", body: (d) => `Reason: ${String(d.reason ?? "n/a")}` },
  PROPERTY_WATCHED: {
    title: "Property watched",
    body: (d) => `You just watched ${String(d.propertyAddress ?? "a property")}. We'll alert you on bid activity.`,
  },
  PROPERTY_UNWATCHED: {
    title: "Removed from watchlist",
    body: (d) => `You stopped watching ${String(d.propertyAddress ?? "a property")}.`,
  },
  USDC_DEPOSIT_CREATED: {
    title: "Deposit pending",
    body: (d) =>
      `Your USDC deposit${d.amountCents != null ? ` of ${formatAmountCents(Number(d.amountCents))}` : ""} is pending on ${String(d.networkCode ?? "the network")}.`,
  },
  AUCTION_REGISTRATION_SUBMITTED: {
    title: "Registration submitted",
    body: (d) => `Your registration for ${String(d.auctionTitle ?? "this auction")} is pending approval.`,
  },
  AUCTION_REGISTRATION_APPROVED: { title: "Registration approved", body: (d) => `Auction ${d.auctionId} approved.` },
  BID_PLACED: { title: "Bid placed", body: (d) => `Bid on lot ${d.lotId} placed.` },
  BID_OUTBID: {
    title: "You were outbid",
    body: (d) => `You were outbid on lot ${d.lotId}.`,
    emailTemplate: "outbid",
  },
  AUCTION_ENDING: { title: "Auction ending", body: (d) => `Auction ${d.auctionId} is ending soon.`, emailTemplate: "auction_reminder" },
  AUCTION_WON: { title: "You won", body: (d) => `You won lot ${d.lotId}.`, emailTemplate: "winning" },
  AUCTION_LOST: { title: "Auction result", body: (d) => `You did not win lot ${d.lotId}.`, emailTemplate: "losing" },
  INVOICE_CREATED: { title: "New invoice", body: (d) => `Invoice ${d.invoiceId} created.`, emailTemplate: "invoice" },
  PAYMENT_CONFIRMED: { title: "Payment confirmed", body: (d) => `Payment of ${d.amount} confirmed.`, emailTemplate: "payment" },
  CERTIFICATE_ISSUED: { title: "Certificate issued", body: (d) => `Certificate ${d.certificateNumber} issued.`, emailTemplate: "certificate" },
  REDEMPTION_STARTED: { title: "Redemption started", body: (d) => `Redemption for ${d.certificateNumber} started.` },
  REDEMPTION_APPROACHING_DEADLINE: {
    title: "Redemption deadline",
    body: (d) => `Redemption for ${d.certificateNumber} due ${d.deadline}.`,
    emailTemplate: "redemption",
  },
  REDEMPTION_COMPLETED: { title: "Redemption completed", body: (d) => `Redemption for ${d.certificateNumber} completed.` },
  SAVED_SEARCH_MATCH: {
    title: "New matches",
    body: (d) => `${d.matches} new matches for ${d.searchName}.`,
    emailTemplate: "saved_search",
  },
  SUPPORT_MESSAGE: { title: "Support", body: (d) => String(d.message ?? "") },
};

export async function dispatchEvent(
  type: DomainEventType,
  data: Record<string, unknown>,
  opts: { userId?: string; emailTo?: string } = {},
): Promise<void> {
  const spec = SPECS[type];
  if (opts.userId) {
    await getPool().query(
      `INSERT INTO notifications (user_id, type, title, body, payload) VALUES ($1,$2,$3,$4,$5)`,
      [opts.userId, type, spec.title, spec.body(data), JSON.stringify(data)],
    );
  }
  if (spec.emailTemplate && opts.emailTo) {
    await sendEmail({
      template: spec.emailTemplate as never,
      to: opts.emailTo,
      variables: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    }).catch(() => {});
  }
}

export async function listNotifications(userId: string, page = 1, pageSize = 20) {
  const { rows } = await getPool().query(
    `SELECT id, type, title, body, read, read_at, created_at, payload
     FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, pageSize, (page - 1) * pageSize],
  );
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    read: r.read,
    read_at: r.read === true && r.read_at ? new Date(r.read_at as string).toISOString() : null,
    created_at: new Date(r.created_at as string).toISOString(),
    link: (r.payload as Record<string, unknown> | null)?.["link"] ?? null,
  }));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { rows } = await getPool().query(
    `SELECT count(*)::int AS c FROM notifications WHERE user_id = $1 AND read = false`,
    [userId],
  );
  return rows[0]?.c ?? 0;
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  const { rowCount } = await getPool().query(
    `UPDATE notifications SET read = true, read_at = COALESCE(read_at, now())
     WHERE id = $1 AND user_id = $2`,
    [notificationId, userId],
  );
  return (rowCount ?? 0) > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const { rowCount } = await getPool().query(
    `UPDATE notifications SET read = true, read_at = COALESCE(read_at, now())
     WHERE user_id = $1 AND read = false`,
    [userId],
  );
  return rowCount ?? 0;
}

function formatAmountCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
