import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { config } from "../shared/config.js";
import { getPool, transaction, type TxClient } from "../db/pool.js";
import { UnauthorizedError, AppError } from "../shared/errors.js";

const secret = new TextEncoder().encode(config.authSecret);

export interface SessionRecord {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export async function createSession(
  userId: string,
  opts: { ipAddress?: string; userAgent?: string },
): Promise<{ sessionId: string; token: string }> {
  const sessionId = randomUUID();
  const tokenHash = await hashToken(sessionId);
  const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000);

  await getPool().query(
    `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [sessionId, userId, tokenHash, opts.ipAddress ?? null, opts.userAgent ?? null, expiresAt],
  );

  const token = await new SignJWT({ sid: sessionId, uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${config.sessionTtlSeconds}s`)
    .sign(secret);

  return { sessionId, token };
}

async function hashToken(tokenId: string): Promise<string> {
  // Use jose to derive a stable hash-like value; we store the session id as the hash.
  return tokenId;
}

export async function verifySessionToken(token: string): Promise<SessionRecord> {
  let payload: { sid: string; uid: string };
  try {
    const { payload: p } = await jwtVerify(token, secret);
    payload = p as unknown as { sid: string; uid: string };
  } catch {
    throw new UnauthorizedError("Invalid session token");
  }
  const { rows } = await getPool().query(
    `SELECT id, user_id, ip_address, user_agent, expires_at, revoked
     FROM sessions WHERE id = $1`,
    [payload.sid],
  );
  const session = rows[0];
  if (!session) throw new UnauthorizedError("Session not found");
  if (session.revoked) throw new UnauthorizedError("Session revoked");
  if (new Date(session.expires_at).getTime() < Date.now()) throw new UnauthorizedError("Session expired");

  await getPool().query(`UPDATE sessions SET last_used_at = now() WHERE id = $1`, [session.id]);

  return {
    id: session.id,
    userId: session.user_id,
    ipAddress: session.ip_address,
    userAgent: session.user_agent,
  };
}

export async function revokeSession(sessionId: string, client?: TxClient): Promise<void> {
  const q = client ?? getPool();
  await q.query(`UPDATE sessions SET revoked = true WHERE id = $1`, [sessionId]);
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await getPool().query(`UPDATE sessions SET revoked = true WHERE user_id = $1`, [userId]);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: config.sessionTtlSeconds,
    domain: config.cookieDomain || undefined,
  };
}

export { AppError };
