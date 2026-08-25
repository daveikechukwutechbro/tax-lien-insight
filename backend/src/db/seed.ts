import { getPool } from "./pool.js";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import { hashPassword, normalizeEmail } from "../auth/password.js";
import { ensureAccount } from "../funds/funds.service.js";
import { assignRole } from "../auth/rbac.js";

/**
 * Idempotent seed. NEVER seeds production with fake auctions/properties.
 * In production this only ensures reference data (states/jurisdictions) exists.
 */
export async function seed(): Promise<void> {
  const pool = getPool();
  logger.info("Seeding (environment)", { environment: config.environment });

  // Reference data
  await pool.query(
    `INSERT INTO states (code, name, country_code, status) VALUES
       ('IL','Illinois','US','active'),
       ('CA','California','US','active'),
       ('TX','Texas','US','active'),
       ('NJ','New Jersey','US','active'),
       ('FL','Florida','US','active'),
       ('MI','Michigan','US','active')
     ON CONFLICT (code) DO NOTHING`,
  );

  await pool.query(
    `INSERT INTO jurisdictions (jurisdiction_type, name, state_id, official_code, status)
      SELECT 'county', s.name || ' County', s.id, lower(s.code) || '-cnty', 'active'
      FROM states s WHERE NOT EXISTS (
        SELECT 1 FROM jurisdictions j WHERE j.state_id = s.id
      )`,
  );

  // Default jurisdiction rules for any jurisdiction lacking them (development convenience)
  if (config.isDevelopment) {
    await pool.query(
      `INSERT INTO jurisdiction_rules
        (jurisdiction_id, effective_from, interest_rate_min, interest_rate_max, interest_increment, interest_precision, registration_required, kyc_required, deposit_required, deposit_amount, payment_deadline_hours, redemption_enabled, redemption_period_days, status, version)
       SELECT id, now(), 0, 100, 0.25, 2, true, true, true, 0, 48, true, 365, 'active', 1
       FROM jurisdictions
       WHERE NOT EXISTS (SELECT 1 FROM jurisdiction_rules jr WHERE jr.jurisdiction_id = jurisdictions.id)`,
    );
  }

  // Development-only demo admin (NEVER in production).
  if (config.isDevelopment && config.adminBootstrapEmail) {
    const email = normalizeEmail(config.adminBootstrapEmail);
    const existing = await pool.query(`SELECT id FROM users WHERE email_normalized = $1`, [email]);
    if (existing.rows.length === 0) {
      const { rows } = await pool.query(
        `INSERT INTO users (email, email_normalized, password_hash, full_name, status, email_verified)
         VALUES ($1,$2,$3,'Platform Admin','active',true) RETURNING id`,
        [email, email, await hashPassword("DevAdmin123!")],
      );
      const userId = rows[0].id as string;
      await ensureAccount(userId);
      await assignRole(userId, "super_admin", userId);
      logger.warn("Created development admin user", { email, userId });
    }
  }

  logger.info("Seed complete");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
