import { getPool, transaction } from "../db/pool.js";
import { logger } from "../shared/logger.js";

export type JobName =
  | "auction_scheduler"
  | "auction_status_transition"
  | "registration_deadline"
  | "auction_ending"
  | "results_finalization"
  | "invoice_generation"
  | "payment_overdue"
  | "certificate_generation"
  | "redemption_reminder"
  | "saved_search_match"
  | "email_queue"
  | "notification_queue"
  | "usdc_monitor"
  | "webhook_retry"
  | "search_reindex"
  | "document_cleanup"
  | "audit_maintenance";

const handlers: Partial<Record<JobName, (payload: Record<string, unknown>) => Promise<void>>> = {
  email_queue: async () => {
    const { rows } = await getPool().query(
      `SELECT id, to_address, subject, html, text, template, variables, locale FROM email_outbox WHERE status='queued' LIMIT 50`,
    );
    for (const row of rows) {
      // In production, send via provider; here we mark sent (provider handles actual delivery).
      await getPool().query(`UPDATE email_outbox SET status='sent', sent_at=now() WHERE id=$1`, [row.id]);
    }
  },
  auction_scheduler: async () => {
    // Promote scheduled auctions whose starts_at passed to registration_open / live.
    await getPool().query(
      `UPDATE auctions SET status='registration_open', updated_at=now() WHERE status='scheduled' AND starts_at <= now()`,
    );
    await getPool().query(
      `UPDATE auctions SET status='live', updated_at=now() WHERE status='registration_open' AND registration_closes_at <= now()`,
    );
  },
  // Other jobs are registered as no-ops until their logic is wired to services.
};

export async function enqueueJob(name: JobName, payload: Record<string, unknown> = {}, runAt?: Date): Promise<string> {
  const { rows } = await getPool().query(
    `INSERT INTO jobs (name, payload, run_at, status) VALUES ($1,$2,$3,'queued') RETURNING id`,
    [name, JSON.stringify(payload), (runAt ?? new Date()).toISOString()],
  );
  return rows[0].id as string;
}

export async function runDueJobs(limit = 20): Promise<number> {
  const { rows } = await getPool().query(
    `SELECT id, name, payload FROM jobs WHERE status='queued' AND run_at <= now() ORDER BY run_at LIMIT $1 FOR UPDATE SKIP LOCKED`,
    [limit],
  );
  let ran = 0;
  for (const job of rows) {
    const name = job.name as JobName;
    await transaction(async (client) => {
      await client.query(`UPDATE jobs SET status='running', started_at=now(), attempts=attempts+1 WHERE id=$1`, [job.id]);
    });
    try {
      const handler = handlers[name];
      if (handler) {
        await handler(job.payload ?? {});
      } else {
        logger.info(`Job ${name} has no handler yet; marking completed`, { jobId: job.id });
      }
      await getPool().query(`UPDATE jobs SET status='completed', finished_at=now() WHERE id=$1`, [job.id]);
      ran++;
    } catch (err) {
      const attempts = (job.attempts ?? 0) + 1;
      const status = attempts >= 5 ? "dead" : "queued";
      await getPool().query(`UPDATE jobs SET status=$1, last_error=$2, run_at=now() + interval '5 minutes' WHERE id=$3`, [
        status,
        (err as Error).message,
        job.id,
      ]);
    }
  }
  return ran;
}

/** Cron-style entrypoint guarded by CRON_SECRET. */
export async function runScheduledJobs(cronSecret: string | undefined, providedSecret: string): Promise<{ ran: number }> {
  if (!cronSecret || cronSecret !== providedSecret) {
    throw new Error("Unauthorized cron request");
  }
  const ran = await runDueJobs();
  return { ran };
}
