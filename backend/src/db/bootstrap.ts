/**
 * CLI: bootstrap the first super_admin account.
 * Usage: npm run admin:bootstrap
 * Requires ADMIN_BOOTSTRAP_SECRET and ADMIN_EMAIL in the environment.
 * ADMIN_PASSWORD is optional (a secure one is generated and printed when omitted).
 */
import { randomBytes } from "node:crypto";
import { config } from "../shared/config.js";
import { ensureBootstrapAdmin } from "../auth/auth.service.js";
import { logger } from "../shared/logger.js";

async function main() {
  const secret = config.adminBootstrapSecret;
  const email = process.env.ADMIN_EMAIL || config.adminBootstrapEmail;
  if (!secret) {
    logger.error("ADMIN_BOOTSTRAP_SECRET is not set; refusing to bootstrap");
    process.exit(1);
  }
  const password = process.env.ADMIN_PASSWORD || randomBytes(12).toString("base64url");
  try {
    const res = await ensureBootstrapAdmin(email, password, secret);
    logger.info("Bootstrap complete", { userId: res.userId, created: res.created });
    if (res.created) {
      // Only print the generated password when we created the account; never log secrets otherwise.
      logger.warn("Generated admin password (save this): " + password);
    }
    process.exit(0);
  } catch (err) {
    logger.error("Bootstrap failed", { errorCode: (err as Error).message });
    process.exit(1);
  }
}

main();
