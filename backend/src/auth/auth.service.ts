import { randomBytes, createHash } from "node:crypto";
import { getPool, transaction, type TxClient } from "../db/pool.js";
import { hashPassword, verifyPassword, normalizeEmail, isValidEmail } from "./password.js";
import { createSession, revokeSession, revokeAllUserSessions } from "./session.js";
import { AppError, ConflictError, NotFoundError, ValidationError, UnauthorizedError } from "../shared/errors.js";
import { sendEmail, isEmailConfigured } from "../providers/email/index.js";
import { assignRole, getUserRoles } from "./rbac.js";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateVerifyCode(): string {
  return String(100000 + (randomBytes(4).readUInt32BE(0) % 900000));
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName?: string;
}

export async function registerUser(input: RegisterInput, meta: { ip: string; userAgent: string }) {
  if (!isValidEmail(input.email)) throw new ValidationError("Invalid email address");
  if (!input.password || input.password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  return transaction(async (client) => {
    const existing = await client.query(`SELECT id FROM users WHERE email_normalized = $1`, [email]);
    if (existing.rows.length > 0) throw new ConflictError("Email already registered");

    const userRes = await client.query(
      `INSERT INTO users (email, email_normalized, password_hash, full_name, status, email_verified)
       VALUES ($1,$2,$3,$4,'pending_verification', false) RETURNING id, email, full_name, status, created_at`,
      [input.email, email, passwordHash, input.fullName ?? null],
    );
    const user = userRes.rows[0];

    await client.query(`INSERT INTO profiles (user_id, kyc_status) VALUES ($1,'not_started')`, [user.id]);
    await client.query(
      `INSERT INTO funds_accounts (user_id, currency) VALUES ($1,'USDC')`,
      [user.id],
    );
    await client.query(
      `INSERT INTO notification_preferences (user_id) VALUES ($1)`,
      [user.id],
    );

    const token = generateToken();
    const code = generateVerifyCode();
    const expires = new Date(Date.now() + 24 * 3600 * 1000);
    await client.query(
      `INSERT INTO verification_tokens (user_id, token_hash, code_hash, purpose, expires_at)
       VALUES ($1,$2,$3,'email_verify',$4)`,
      [user.id, sha256(token), sha256(code), expires],
    );

    await sendEmail({
      template: "verification",
      to: user.email,
      variables: { verificationToken: token, verificationCode: code, appUrl: config.appUrl },
    });

    logger.info("User registered", { userId: user.id });

    // Email provider may be unconfigured (outbox mode). In that case the
    // verification token can never be delivered, so hand it to the caller so
    // the frontend can show the verification link directly. Once a real email
    // provider is configured, the token is NOT returned — it goes by email only.
    const emailConfigured = isEmailConfigured();
    if (emailConfigured) {
      return { id: user.id, email: user.email, status: user.status };
    }
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      verificationToken: token,
      verificationRequired: true,
    };
  });
}

export async function loginUser(
  email: string,
  password: string,
  meta: { ip: string; userAgent: string },
) {
  const normalized = normalizeEmail(email);
  const { rows } = await getPool().query(
    `SELECT id, email, password_hash, status, email_verified FROM users WHERE email_normalized = $1`,
    [normalized],
  );
  const ok = rows[0];
  if (!ok) {
    await recordLoginAttempt({ emailNormalized: normalized, success: false, reason: "no_user", meta });
    throw new UnauthorizedError("Invalid credentials");
  }
  if (ok.status === "suspended" || ok.status === "banned" || ok.status === "closed") {
    await recordLoginAttempt({ userId: ok.id, success: false, reason: ok.status, meta });
    throw new UnauthorizedError("Account is not active");
  }
  if (ok.status === "pending_verification") {
    await recordLoginAttempt({ userId: ok.id, success: false, reason: "pending_verification", meta });
    throw new AppError("ACCOUNT_LOCKED", "Account pending email verification", 403);
  }
  const valid = await verifyPassword(password, ok.password_hash);
  if (!valid) {
    await recordLoginAttempt({ userId: ok.id, success: false, reason: "bad_password", meta });
    throw new UnauthorizedError("Invalid credentials");
  }
  await recordLoginAttempt({ userId: ok.id, success: true, meta });
  await getPool().query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [ok.id]);
  const { token, sessionId } = await createSession(ok.id, meta);
  return { token, sessionId, userId: ok.id };
}

async function recordLoginAttempt(opts: {
  userId?: string;
  emailNormalized?: string;
  success: boolean;
  reason?: string;
  meta: { ip: string; userAgent: string };
}) {
  await getPool().query(
    `INSERT INTO login_attempts (email_normalized, user_id, ip_address, success, reason)
     VALUES ($1,$2,$3,$4,$5)`,
    [opts.emailNormalized ?? null, opts.userId ?? null, opts.meta.ip, opts.success, opts.reason ?? null],
  );
}

export async function logoutUser(sessionId: string): Promise<void> {
  await revokeSession(sessionId);
}

export async function getCurrentUser(userId: string) {
  const { rows } = await getPool().query(
    `SELECT id, email, full_name, status, email_verified, created_at, last_login_at
     FROM users WHERE id = $1`,
    [userId],
  );
  const user = rows[0];
  if (!user) throw new NotFoundError("User not found");
  const profile = await getPool().query(
    `SELECT kyc_status, phone, address_line, city, state, postal_code, country, avatar_data
     FROM profiles WHERE user_id = $1`,
    [userId],
  );
  const p = profile.rows[0];
  const roles = await getUserRoles(userId);
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name ?? null,
    status: user.status,
    emailVerified: user.email_verified,
    emailVerifiedAt: user.email_verified_at ?? null,
    kycStatus: p?.kyc_status ?? "not_started",
    phone: p?.phone ?? null,
    address: p
      ? {
          addressLine: p.address_line ?? null,
          city: p.city ?? null,
          state: p.state ?? null,
          postalCode: p.postal_code ?? null,
          country: p.country ?? null,
        }
      : null,
    avatar: p?.avatar_data ?? null,
    roles,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
  };
}

export async function revokeUserSessions(userId: string): Promise<void> {
  await revokeAllUserSessions(userId);
}

export type MeUser = Awaited<ReturnType<typeof getCurrentUser>>;

export async function verifyEmail(opts: { token?: string; code?: string }): Promise<void> {
  if (!opts.token && !opts.code) {
    throw new ValidationError("Verification token or code is required");
  }
  const tokenHash = opts.token ? sha256(opts.token) : null;
  const codeHash = opts.code ? sha256(opts.code) : null;
  let where: string;
  let params: string[];
  if (tokenHash && codeHash) {
    where = `(token_hash = $1 OR code_hash = $2)`;
    params = [tokenHash, codeHash];
  } else if (tokenHash) {
    where = `token_hash = $1`;
    params = [tokenHash];
  } else {
    where = `code_hash = $1`;
    params = [codeHash as string];
  }
  const { rows } = await getPool().query(
    `SELECT id, user_id, expires_at, consumed FROM verification_tokens
     WHERE ${where} AND purpose = 'email_verify'`,
    params,
  );
  const rec = rows[0];
  if (!rec) throw new NotFoundError("Verification token not found");
  if (rec.consumed) throw new AppError("TOKEN_USED", "Code already used", 400);
  if (new Date(rec.expires_at).getTime() < Date.now()) throw new AppError("TOKEN_EXPIRED", "Code expired", 400);

  await transaction(async (client) => {
    await client.query(`UPDATE verification_tokens SET consumed = true WHERE id = $1`, [rec.id]);
    await client.query(`UPDATE users SET email_verified = true, email_verified_at = now(), status = CASE WHEN status='pending_verification' THEN 'active' ELSE status END WHERE id = $1`, [rec.user_id]);
  });
}

export async function requestPasswordReset(email: string): Promise<{ requested: boolean; resetToken?: string }> {
  const normalized = normalizeEmail(email);
  const { rows } = await getPool().query(`SELECT id, email FROM users WHERE email_normalized = $1`, [normalized]);
  if (rows.length === 0) return { requested: true }; // do not leak existence
  const user = rows[0];
  const token = generateToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await getPool().query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
    [user.id, sha256(token), expires],
  );
  await sendEmail({
    template: "password_reset",
    to: user.email,
    variables: { resetToken: token, appUrl: config.appUrl },
  });
  // Outbox mode (no email provider configured): expose the token so the
  // frontend can build the reset link directly, else it is undeliverable.
  const emailConfigured = isEmailConfigured();
  if (emailConfigured) return { requested: true };
  return { requested: true, resetToken: token };
}

export async function resendVerification(email: string): Promise<{
  requested: boolean;
  verificationToken?: string;
  status?: string;
  emailVerified?: boolean;
}> {
  const normalized = normalizeEmail(email);
  const { rows } = await getPool().query(
    `SELECT id, email, status, email_verified FROM users WHERE email_normalized = $1`,
    [normalized],
  );
  if (rows.length === 0) return { requested: true }; // do not leak existence
  const user = rows[0];
  if (user.status !== "pending_verification" || user.email_verified) {
    return { requested: true, status: user.status, emailVerified: user.email_verified };
  }
  // Invalidate previous unused tokens for this user to keep it one-time.
  await getPool().query(
    `UPDATE verification_tokens SET consumed = true
     WHERE user_id = $1 AND purpose = 'email_verify' AND consumed = false`,
    [user.id],
  );
  const token = generateToken();
  const code = generateVerifyCode();
  const expires = new Date(Date.now() + 24 * 3600 * 1000);
  await getPool().query(
    `INSERT INTO verification_tokens (user_id, token_hash, code_hash, purpose, expires_at)
     VALUES ($1,$2,$3,'email_verify',$4)`,
    [user.id, sha256(token), sha256(code), expires],
  );
  await sendEmail({
    template: "verification",
    to: user.email,
    variables: { verificationToken: token, verificationCode: code, appUrl: config.appUrl },
  });
  const emailConfigured = isEmailConfigured();
  if (emailConfigured) return { requested: true, status: user.status };
  return { requested: true, status: user.status, verificationToken: token };
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 8) throw new ValidationError("Password too short");
  const hash = sha256(token);
  const { rows } = await getPool().query(
    `SELECT id, user_id, expires_at, consumed FROM password_reset_tokens WHERE token_hash = $1`,
    [hash],
  );
  const rec = rows[0];
  if (!rec) throw new NotFoundError("Reset token not found");
  if (rec.consumed) throw new AppError("TOKEN_USED", "Token already used", 400);
  if (new Date(rec.expires_at).getTime() < Date.now()) throw new AppError("TOKEN_EXPIRED", "Token expired", 400);

  const passwordHash = await hashPassword(newPassword);
  await transaction(async (client) => {
    await client.query(`UPDATE password_reset_tokens SET consumed = true WHERE id = $1`, [rec.id]);
    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, rec.user_id]);
    await revokeAllUserSessions(rec.user_id);
  });
}

/**
 * Secure one-time admin bootstrap. Disabled after first use (bootstrap secret cleared).
 * Never auto-grants admin to the first registered user.
 */
export async function bootstrapAdmin(secret: string, email: string): Promise<{ userId: string }> {
  if (!config.adminBootstrapSecret || secret !== config.adminBootstrapSecret) {
    throw new AppError("FORBIDDEN", "Invalid bootstrap secret", 403);
  }
  const normalized = normalizeEmail(email);
  const { rows } = await getPool().query(`SELECT id FROM users WHERE email_normalized = $1`, [normalized]);
  if (rows.length === 0) throw new NotFoundError("Target user not found");
  const userId = rows[0].id;
  await transaction(async (client) => {
    await assignRole(userId, "super_admin", userId, client);
    await client.query(
      `INSERT INTO admin_actions (actor_user_id, action, target_user_id, reason)
       VALUES ($1,'admin_bootstrap',$1,'secure bootstrap')`,
      [userId],
    );
    // Disable further bootstrap use by clearing the matching secret row if stored.
    await client.query(
      `UPDATE system_settings SET value = '{"disabled":true}'::jsonb WHERE key = 'admin_bootstrap_enabled'`,
    );
  });
  logger.warn("Admin bootstrap performed", { userId });
  return { userId };
}

/**
 * Idempotent bootstrap used by the `npm run admin:bootstrap` CLI. Creates the
 * user if it does not yet exist, then grants super_admin — but only while no
 * super_admin already exists. Never silently promotes an arbitrary first user.
 */
export async function ensureBootstrapAdmin(email: string, password: string, secret: string): Promise<{ userId: string; created: boolean }> {
  if (!config.adminBootstrapSecret || secret !== config.adminBootstrapSecret) {
    throw new AppError("FORBIDDEN", "Invalid bootstrap secret", 403);
  }
  const { rows: existingAdmin } = await getPool().query(
    `SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.name = 'super_admin' LIMIT 1`,
  );
  if (existingAdmin.length > 0) {
    throw new AppError("FORBIDDEN", "Bootstrap already completed; a super_admin exists", 403);
  }
  const normalized = normalizeEmail(email);
  const existing = await getPool().query(`SELECT id, status FROM users WHERE email_normalized = $1`, [normalized]);
  let userId: string;
  let created = false;
  if (existing.rows.length === 0) {
    const u = await registerUser({ email, password, fullName: email.split("@")[0] }, { ip: "bootstrap", userAgent: "bootstrap" });
    userId = u.id;
    created = true;
  } else {
    userId = existing.rows[0].id;
  }
  await transaction(async (client) => {
    await assignRole(userId, "super_admin", userId, client);
    await client.query(
      `INSERT INTO admin_actions (actor_user_id, action, target_user_id, reason)
       VALUES ($1,'admin_bootstrap',$1,'cli bootstrap')`,
      [userId],
    );
    await client.query(
      `UPDATE system_settings SET value = '{"disabled":true}'::jsonb WHERE key = 'admin_bootstrap_enabled'`,
    );
  });
  return { userId, created };
}
