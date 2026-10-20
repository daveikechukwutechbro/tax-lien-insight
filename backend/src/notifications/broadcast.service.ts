import { getPool } from "../db/pool.js";
import { sendEmail, isEmailConfigured } from "../providers/email/index.js";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { ValidationError } from "../shared/errors.js";

export type BroadcastAudience = "all" | "selected";

export interface BroadcastInput {
  senderUserId: string;
  title: string;
  body?: string;
  subject?: string;
  link?: string;
  sendInApp: boolean;
  sendEmail: boolean;
  audience: BroadcastAudience;
  userIds?: string[];
}

export interface BroadcastResult {
  id: string;
  recipientCount: number;
  inAppCount: number;
  emailSentCount: number;
  emailFailedCount: number;
  emailConfigured: boolean;
  createdAt: string;
}

interface Recipient {
  id: string;
  email: string;
}

// Safety cap: a single request should not try to dispatch an unbounded number
// of emails. Larger audiences are still notified in-app; emails beyond the cap
// are recorded as failures so the send is not silently misrepresented.
const MAX_EMAIL_RECIPIENTS = 300;
const EMAIL_CONCURRENCY = 8;

async function resolveRecipients(
  audience: BroadcastAudience,
  userIds?: string[],
): Promise<Recipient[]> {
  if (audience === "selected") {
    const ids = (userIds ?? []).filter((v) => typeof v === "string" && v.length > 0);
    if (ids.length === 0) throw new ValidationError("Select at least one recipient");
    const { rows } = await getPool().query<Recipient>(
      `SELECT id, email FROM users
       WHERE id = ANY($1::uuid[]) AND status <> 'deleted'
       ORDER BY created_at DESC`,
      [ids],
    );
    return rows;
  }
  const { rows } = await getPool().query<Recipient>(
    `SELECT id, email FROM users WHERE status = 'active' ORDER BY created_at DESC`,
  );
  return rows;
}

function normalize(input: BroadcastInput) {
  const title = (input.title ?? "").trim();
  if (!title) throw new ValidationError("A title is required");
  if (title.length > 150) throw new ValidationError("Title must be 150 characters or fewer");

  const body = (input.body ?? "").trim();
  if (body.length > 8000) throw new ValidationError("Message is too long (8000 characters max)");

  if (!input.sendInApp && !input.sendEmail) {
    throw new ValidationError("Choose at least one channel (in-app or email)");
  }

  let link = (input.link ?? "").trim();
  if (link && !/^https?:\/\//i.test(link) && !link.startsWith("/")) link = `/${link}`;

  const subject = (input.subject ?? "").trim() || title;
  if (input.sendEmail && subject.length > 200) {
    throw new ValidationError("Subject must be 200 characters or fewer");
  }

  return { title, body, link, subject };
}

export async function sendBroadcast(input: BroadcastInput): Promise<BroadcastResult> {
  const { title, body, link, subject } = normalize(input);
  const recipients = await resolveRecipients(input.audience, input.userIds);
  if (recipients.length === 0) throw new ValidationError("No recipients matched");

  const emailConfigured = isEmailConfigured();
  const ids = recipients.map((r) => r.id);

  const { rows } = await getPool().query<{ id: string; created_at: string }>(
    `INSERT INTO admin_broadcasts
       (sender_user_id, subject, title, body, link, send_in_app, send_email, audience,
        recipient_ids, recipient_count, email_configured)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
     RETURNING id, created_at`,
    [
      input.senderUserId,
      subject,
      title,
      body || null,
      link || null,
      input.sendInApp,
      input.sendEmail,
      input.audience,
      JSON.stringify(ids),
      recipients.length,
      emailConfigured,
    ],
  );
  const broadcastId = rows[0].id;

  let inAppCount = 0;
  if (input.sendInApp) {
    await getPool().query(
      `INSERT INTO notifications (user_id, type, title, body, payload)
       SELECT u.id, 'ADMIN_BROADCAST', $2, $3,
              jsonb_build_object('link', $4::text, 'broadcastId', $5::text)
       FROM unnest($1::uuid[]) AS u(id)`,
      [ids, title, body || null, link || null, broadcastId],
    );
    inAppCount = recipients.length;
  }

  let emailSentCount = 0;
  let emailFailedCount = 0;
  if (input.sendEmail) {
    const targets = recipients.slice(0, MAX_EMAIL_RECIPIENTS);
    const skipped = recipients.length - targets.length;
    if (skipped > 0) logger.warn("Broadcast email capped", { broadcastId, skipped });

    for (let i = 0; i < targets.length; i += EMAIL_CONCURRENCY) {
      const chunk = targets.slice(i, i + EMAIL_CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (r) => {
          try {
            await sendEmail({
              template: "broadcast",
              to: r.email,
              variables: { title, body, subject, link, appUrl: config.appUrl },
            });
            return true;
          } catch (err) {
            logger.warn("Broadcast email failed", {
              broadcastId,
              error: (err as Error).message,
            });
            return false;
          }
        }),
      );
      for (const delivered of results) {
        if (delivered) emailSentCount += 1;
        else emailFailedCount += 1;
      }
    }
    emailFailedCount += skipped;
  }

  await getPool().query(
    `UPDATE admin_broadcasts
     SET in_app_count = $1, email_sent_count = $2, email_failed_count = $3
     WHERE id = $4`,
    [inAppCount, emailSentCount, emailFailedCount, broadcastId],
  );

  return {
    id: broadcastId,
    recipientCount: recipients.length,
    inAppCount,
    emailSentCount,
    emailFailedCount,
    emailConfigured,
    createdAt: new Date(rows[0].created_at).toISOString(),
  };
}

export async function listBroadcasts(limit = 100) {
  const { rows } = await getPool().query(
    `SELECT b.id, b.subject, b.title, b.body, b.link, b.send_in_app, b.send_email, b.audience,
            b.recipient_count, b.in_app_count, b.email_sent_count, b.email_failed_count,
            b.email_configured, b.created_at, u.email AS sender_email
     FROM admin_broadcasts b
     LEFT JOIN users u ON u.id = b.sender_user_id
     ORDER BY b.created_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({ ...r, created_at: new Date(r.created_at as string).toISOString() }));
}

export async function getBroadcast(id: string) {
  const { rows } = await getPool().query(
    `SELECT b.*, u.email AS sender_email
     FROM admin_broadcasts b
     LEFT JOIN users u ON u.id = b.sender_user_id
     WHERE b.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return { ...row, created_at: new Date(row.created_at as string).toISOString() };
}
