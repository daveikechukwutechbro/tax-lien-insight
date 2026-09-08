import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { AuthContext } from "../auth/rbac.js";
import {
  ok,
  fail,
  type ApiEnvelope,
} from "../shared/api.js";
import { AppError, toAppError, ValidationError, NotFoundError, ConflictError } from "../shared/errors.js";
import { config } from "../shared/config.js";
import { logger, type LogMeta } from "../shared/logger.js";
import {
  authMiddleware,
  getAuth,
  requireUser,
  requirePermission,
  requireAdmin,
} from "./middleware.js";
import {
  registerUser,
  loginUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  resendVerification,
  bootstrapAdmin,
  getCurrentUser,
  revokeUserSessions,
  type MeUser,
} from "../auth/auth.service.js";
import { assignRole, revokeRole, isAdmin } from "../auth/rbac.js";
import { listStates, listJurisdictions, getJurisdictionRules } from "../jurisdictions/jurisdictions.service.js";
import {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
} from "../properties/properties.service.js";
import {
  listAuctions,
  getAuction,
  createAuction,
  publishAuction,
  openRegistration,
  closeRegistration,
  startAuction,
  pauseAuction,
  resumeAuction,
  closeAuction,
  finalizeResults,
  settleAuction,
  archiveAuction,
  cancelAuction,
  createLot,
  listLots,
  registerForAuction,
  reviewRegistration,
  getRegistrationEligibility,
} from "../auctions/auctions.service.js";
import { listAwardsForAuction, listAwardsForUser } from "../auctions/awards.service.js";
import { placeBid, listBidsForLot, getUserBids } from "../bids/bids.service.js";
import { getAccount, getSummary, adjustBalance } from "../funds/funds.service.js";
import { listDeposits, createDeposit, confirmDeposit } from "../usdc/usdc.service.js";
import {
  issueCertificate,
  verifyCertificate,
  revokeCertificate,
  listCertificates,
} from "../certificates/certificates.service.js";
import {
  createRedemption,
  payRedemption,
  completeRedemption,
  listRedemptions,
} from "../redemptions/redemptions.service.js";
import { submitKyc, reviewKyc, listKyc } from "../kyc/kyc.service.js";
import { listNotifications, dispatchEvent } from "../notifications/notifications.service.js";
import { getDocumentUrl } from "../documents/documents.service.js";
import { storeDocument } from "../providers/storage/index.js";
import { createHash } from "node:crypto";
import { listAudit, writeAudit, recordAdminAction } from "../audit/audit.service.js";
import { getPool, transaction } from "../db/pool.js";

function json<T>(data: T, meta: Record<string, unknown> = {}): ApiEnvelope<T> {
  return ok(data, meta);
}

// Money is stored as integer cents; dashboard metrics expose it as a fixed 2-decimal
// string ("0.00") per API contract. Never float-parse in the response path.
function centsToDollars(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return (safe / 100).toFixed(2);
}

function ip(c: any): string {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? "unknown";
}

// Simple in-memory rate limiter.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(c: any, key: string, limit: number): boolean {
  const now = Date.now();
  const bucketKey = `${ip(c)}:${key}`;
  const bucket = rateBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

export function createApp(): Hono {
  const app = new Hono();
  app.use("*", authMiddleware);

  app.onError((err, c) => {
    const e = toAppError(err);
    logger.error("API error", { errorCode: e.code, route: c.req.path, method: c.req.method, userId: getAuth(c)?.userId });
    const status = e.httpStatus ?? 500;
    const body = fail(e.code, e.message, status, e.details, {});
    return c.json(body.body, status as 400);
  });

  // ---- Health ----
  app.get("/api/v1/health", async (c) => {
    let database = "ok";
    try {
      await getPool().query("SELECT 1");
    } catch {
      database = "error";
    }
    const emailConfigured = Boolean(config.resendApiKey && config.emailProvider === "resend");
    const blockchainConfigured = Boolean(config.blockchainRpcUrl);
    const storageConfigured = Boolean(config.objectStorageBucket && config.objectStorageAccessKey);
    const degraded = database === "error";
    return c.json(
      ok({
        status: degraded ? "degraded" : "ok",
        database,
        auth: "ok",
        email: emailConfigured ? "configured" : "not_configured",
        blockchain: blockchainConfigured ? "configured" : "not_configured",
        storage: storageConfigured ? "configured" : "not_configured",
        jobs: "ok",
        timestamp: new Date().toISOString(),
      }),
    );
  });

  // ---- Auth ----
  app.post("/api/v1/auth/register", async (c) => {
    if (!rateLimit(c, "register", config.rateLimit.register)) {
      const f = fail("RATE_LIMITED", "Too many registration attempts", 429);
      return c.json(f.body, 429);
    }
    const body = await c.req.json().catch(() => ({}));
    const res = await registerUser(body, { ip: ip(c), userAgent: c.req.header("user-agent") ?? "" });
    return c.json(json(res), 201);
  });

  app.post("/api/v1/auth/login", async (c) => {
    if (!rateLimit(c, "login", config.rateLimit.login)) {
      const f = fail("RATE_LIMITED", "Too many login attempts", 429);
      return c.json(f.body, 429);
    }
    const body = await c.req.json().catch(() => ({}));
    const res = await loginUser(body.email, body.password, { ip: ip(c), userAgent: c.req.header("user-agent") ?? "" });
    setCookie(c, config.sessionCookieName, res.token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: config.sessionTtlSeconds,
    });
    return c.json(json({ userId: res.userId }));
  });

  app.post("/api/v1/auth/logout", async (c) => {
    const token = c.req.header("cookie");
    // best-effort; rely on cookie from context
    const ctx = getAuth(c);
    if (ctx) await revokeUserSessions(ctx.userId).catch(() => {});
    setCookie(c, config.sessionCookieName, "", { maxAge: 0, path: "/" });
    return c.json(json({ success: true }));
  });

  app.post("/api/v1/auth/verify-email", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    await verifyEmail({ token: body.token, code: body.code });
    return c.json(json({ verified: true }));
  });

  app.post("/api/v1/auth/resend-verification", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.email) throw new ValidationError("Email is required");
    const res = await resendVerification(body.email);
    return c.json(json(res));
  });

  app.post("/api/v1/auth/request-password-reset", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.email) throw new ValidationError("Email is required");
    const res = await requestPasswordReset(body.email);
    return c.json(json(res));
  });

  app.post("/api/v1/auth/reset-password", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    await resetPassword(body.token, body.password);
    return c.json(json({ reset: true }));
  });

  app.post("/api/v1/admin/bootstrap", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const res = await bootstrapAdmin(body.secret, body.email);
    return c.json(json(res), 201);
  });

  // ---- Me ----
  app.get("/api/v1/me", async (c) => {
    const ctx = requireUser(c);
    const user = await getCurrentUser(ctx.userId);
    return c.json(json(user as MeUser));
  });

  app.get("/api/v1/me/dashboard", async (c) => {
    const ctx = requireUser(c);
    const summary = await getSummary(ctx.userId).catch(() => null);
    const funds = summary
      ? {
          available: centsToDollars(summary.available),
          held: centsToDollars(summary.held),
          pending: centsToDollars(summary.pending),
        }
      : { available: "0.00", held: "0.00", pending: "0.00" };
    const bids = await getUserBids(ctx.userId, 1, 1000);
    const count = bids.length;
    const active = bids.filter((b: any) => b.status === "accepted" || b.status === "winning").length;
    const winning = bids.filter((b: any) => b.status === "winning").length;
    const outbid = bids.filter((b: any) => b.status === "outbid").length;
    const lost = bids.filter((b: any) => b.status === "lost").length;
    const certs = await listCertificates({ holderId: ctx.userId });
    const reds = await listRedemptions({ holderId: ctx.userId });
    const awards = await listAwardsForUser(ctx.userId);
    const principalValue = awards.reduce((acc: number, a: any) => acc + Number(a.principalAmount ?? 0), 0);
    const invoices = await getPool().query(
      `SELECT COALESCE(SUM(total) FILTER (WHERE status='paid'),0)::bigint AS paid,
              COALESCE(SUM(total) FILTER (WHERE status<>'paid' AND status<>'cancelled'),0)::bigint AS pending
       FROM invoices WHERE user_id=$1`,
      [ctx.userId],
    );
    const paid = Number(invoices.rows[0]?.paid ?? 0);
    const pending = Number(invoices.rows[0]?.pending ?? 0);
    return c.json(
      json({
        bids: { count, active, winning, outbid, lost },
        awards: { count: awards.length, principalValue: centsToDollars(principalValue) },
        funds,
        payments: { pending: centsToDollars(pending), paid: centsToDollars(paid) },
        certificates: {
          issued: certs.length,
          active: certs.filter((x: any) => x.status === "issued" || x.status === "verified").length,
          redeemed: certs.filter((x: any) => x.status === "redeemed").length,
        },
        redemptions: {
          active: reds.filter((x: any) => x.status === "active" || x.status === "payment_pending").length,
          completed: reds.filter((x: any) => x.status === "completed").length,
          realizedInterest: "0.00",
        },
      }),
    );
  });

  // ---- Reference data ----
  app.get("/api/v1/states", async (c) => c.json(json(await listStates())));
  app.get("/api/v1/jurisdictions", async (c) => {
    const stateId = c.req.query("stateId");
    c.json(json(await listJurisdictions(stateId)));
  });
  app.get("/api/v1/jurisdictions/:id/rules", async (c) => {
    const rules = await getJurisdictionRules(c.req.param("id"));
    return c.json(json(rules));
  });

  // ---- Properties ----
  app.get("/api/v1/properties", async (c) => {
    const items = await listProperties({
      state: c.req.query("state") ?? undefined,
      city: c.req.query("city") ?? undefined,
      type: c.req.query("type") ?? undefined,
      search: c.req.query("search") ?? undefined,
    });
    return c.json(json(items.items, { total: items.total }));
  });
  app.get("/api/v1/properties/:id", async (c) => c.json(json(await getProperty(c.req.param("id")))));
  app.post("/api/v1/admin/properties", async (c) => {
    const ctx = requirePermission(c, "property.create");
    const body = await c.req.json().catch(() => ({}));
    const id = await createProperty(body);
    return c.json(json({ id }), 201);
  });
  app.patch("/api/v1/admin/properties/:id", async (c) => {
    requirePermission(c, "property.edit");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    await updateProperty(id, body);
    return c.json(json({ id }));
  });
  app.get("/api/v1/admin/properties", async (c) => {
    requirePermission(c, "property.edit");
    const items = await listProperties({});
    return c.json(json(items.items, { total: items.total }));
  });

  // ---- Auctions ----
  app.get("/api/v1/auctions", async (c) => {
    const items = await listAuctions({
      state: (c.req.query("state") as any) ?? undefined,
      jurisdictionId: c.req.query("jurisdictionId") ?? undefined,
    });
    return c.json(json(items.items, { total: items.total }));
  });
  app.get("/api/v1/auctions/:id", async (c) => c.json(json(await getAuction(c.req.param("id")))));
  app.get("/api/v1/auctions/:id/lots", async (c) => c.json(json(await listLots(c.req.param("id")))));
  app.post("/api/v1/auctions/:id/register", async (c) => {
    const ctx = requireUser(c);
    const res = await registerForAuction(c.req.param("id"), ctx);
    return c.json(json(res), 201);
  });
  app.get("/api/v1/auctions/:id/eligibility", async (c) => {
    const ctx = requireUser(c);
    const res = await getRegistrationEligibility(c.req.param("id"), ctx);
    return c.json(json(res));
  });
  app.post("/api/v1/admin/auctions", async (c) => {
    const ctx = requirePermission(c, "auction.create");
    const body = await c.req.json().catch(() => ({}));
    const id = await createAuction(body, ctx.userId);
    return c.json(json({ id }), 201);
  });
  app.patch("/api/v1/admin/auctions/:id", async (c) => {
    requirePermission(c, "auction.publish");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    if (body.title) await getPool().query(`UPDATE auctions SET title=$1, updated_at=now() WHERE id=$2`, [body.title, id]);
    return c.json(json({ id }));
  });
  const transition = (fn: (id: string, actor: string) => Promise<any>, perm: string) =>
    app.post(`/api/v1/admin/auctions/:id/${fn.name.replace(/Auction$/, "")}`, async (c) => {
      const ctx = requirePermission(c, perm as any);
      const res = await fn(c.req.param("id"), ctx.userId);
      return c.json(json(res));
    });
  transition(publishAuction, "auction.publish");
  transition(openRegistration, "auction.publish");
  transition(closeRegistration, "auction.publish");
  transition(startAuction, "auction.close");
  transition(pauseAuction, "auction.pause");
  transition(resumeAuction, "auction.pause");
  transition(closeAuction, "auction.close");
  transition(finalizeResults, "auction.close");
  transition(settleAuction, "auction.close");
  transition(archiveAuction, "auction.close");
  transition(cancelAuction, "auction.close");

  // ---- Lots & bids ----
  app.get("/api/v1/auction-lots/:id", async (c) => {
    const { rows } = await getPool().query(`SELECT * FROM auction_lots WHERE id=$1`, [c.req.param("id")]);
    if (!rows[0]) throw new NotFoundError("Lot not found");
    return c.json(json(rows[0]));
  });
  app.get("/api/v1/auction-lots/:id/eligibility", async (c) => {
    const ctx = requireUser(c);
    const { rows } = await getPool().query(`SELECT auction_id FROM auction_lots WHERE id=$1`, [c.req.param("id")]);
    if (!rows[0]) throw new NotFoundError("Lot not found");
    const res = await getRegistrationEligibility(rows[0].auction_id, ctx);
    return c.json(json(res));
  });
  app.post("/api/v1/auction-lots/:id/bids", async (c) => {
    const ctx = requireUser(c);
    if (!rateLimit(c, "bid", config.rateLimit.bid)) {
      return c.json(fail("RATE_LIMITED", "Too many bid attempts", 429).body, 429);
    }
    const body = await c.req.json().catch(() => ({}));
    const res = await placeBid(ctx, c.req.param("id"), {
      rate: Number(body.rate),
      amount: Math.round(Number(body.amount) * 100),
      idempotencyKey: body.idempotencyKey,
    });
    return c.json(json(res), 201);
  });
  app.get("/api/v1/auction-lots/:id/bids", async (c) => c.json(json(await listBidsForLot(c.req.param("id")))));

  // ---- My ----
  app.get("/api/v1/my/bids", async (c) => {
    const ctx = requireUser(c);
    return c.json(json(await getUserBids(ctx.userId)));
  });
  app.get("/api/v1/my/funds", async (c) => {
    const ctx = requireUser(c);
    return c.json(json(await getSummary(ctx.userId)));
  });
  app.get("/api/v1/my/notifications", async (c) => {
    const ctx = requireUser(c);
    return c.json(json(await listNotifications(ctx.userId)));
  });
  app.get("/api/v1/my/certificates", async (c) => {
    const ctx = requireUser(c);
    return c.json(json(await listCertificates({ holderId: ctx.userId })));
  });
  app.get("/api/v1/my/redemptions", async (c) => {
    const ctx = requireUser(c);
    return c.json(json(await listRedemptions({ holderId: ctx.userId })));
  });
  app.get("/api/v1/my/documents", async (c) => {
    const ctx = requireUser(c);
    const { rows } = await getPool().query(
      `SELECT id, resource_type, access_scope, created_at FROM documents WHERE owner_id=$1 ORDER BY created_at DESC`,
      [ctx.userId],
    );
    return c.json(json(rows));
  });
  app.get("/api/v1/my/watchlist", async (c) => {
    const ctx = requireUser(c);
    const { rows } = await getPool().query(`SELECT * FROM watchlist WHERE user_id=$1`, [ctx.userId]);
    return c.json(json(rows));
  });
  app.get("/api/v1/my/saved-searches", async (c) => {
    const ctx = requireUser(c);
    const { rows } = await getPool().query(`SELECT * FROM saved_searches WHERE user_id=$1`, [ctx.userId]);
    return c.json(json(rows));
  });
  app.get("/api/v1/my/messages", async (c) => {
    const ctx = requireUser(c);
    const { rows } = await getPool().query(
      `SELECT m.* FROM messages m JOIN message_threads t ON t.id=m.thread_id WHERE $1 = ANY(t.participant_ids) ORDER BY m.created_at DESC LIMIT 50`,
      [ctx.userId],
    );
    return c.json(json(rows));
  });
  app.get("/api/v1/my/invoices", async (c) => {
    const ctx = requireUser(c);
    const { rows } = await getPool().query(`SELECT * FROM invoices WHERE user_id=$1 ORDER BY created_at DESC`, [ctx.userId]);
    return c.json(json(rows));
  });

  // ---- Watchlist ----
  app.post("/api/v1/watchlist", async (c) => {
    const ctx = requireUser(c);
    const body = await c.req.json().catch(() => ({}));
    if (!body.auctionId && !body.lotId) {
      throw new ValidationError("auctionId or lotId required");
    }
    const inserted = await getPool().query(
      `INSERT INTO watchlist (user_id, auction_id, lot_id)
       VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [ctx.userId, body.auctionId ?? null, body.lotId ?? null],
    );
    if (inserted.rows[0]) {
      return c.json(json({ id: inserted.rows[0].id }), 201);
    }
    const existing = await getPool().query(
      `SELECT id FROM watchlist WHERE user_id=$1 AND auction_id IS NOT DISTINCT FROM $2 AND lot_id IS NOT DISTINCT FROM $3`,
      [ctx.userId, body.auctionId ?? null, body.lotId ?? null],
    );
    return c.json(json({ id: existing.rows[0]?.id ?? null }));
  });
  app.delete("/api/v1/watchlist/:id", async (c) => {
    const ctx = requireUser(c);
    await getPool().query(`DELETE FROM watchlist WHERE id=$1 AND user_id=$2`, [c.req.param("id"), ctx.userId]);
    return c.json(json({ deleted: true }));
  });

  // ---- Saved searches ----
  app.post("/api/v1/saved-searches", async (c) => {
    const ctx = requireUser(c);
    const body = await c.req.json().catch(() => ({}));
    if (!body.name) throw new ValidationError("name is required");
    const { rows } = await getPool().query(
      `INSERT INTO saved_searches (user_id, name, filters_json, alerts_enabled)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [ctx.userId, body.name, JSON.stringify(body.filters ?? body.query ?? {}), Boolean(body.alertsEnabled ?? false)],
    );
    return c.json(json({ id: rows[0].id }), 201);
  });
  app.patch("/api/v1/saved-searches/:id", async (c) => {
    const ctx = requireUser(c);
    const body = await c.req.json().catch(() => ({}));
    await getPool().query(
      `UPDATE saved_searches
       SET name = COALESCE($1, name),
           filters_json = COALESCE($2::jsonb, filters_json),
           alerts_enabled = COALESCE($3::boolean, alerts_enabled),
           status = CASE
             WHEN $4::boolean IS TRUE THEN 'active'
             WHEN $4::boolean IS FALSE THEN 'paused'
             ELSE status END
       WHERE id=$5 AND user_id=$6`,
      [
        body.name ?? null,
        body.filters || body.query ? JSON.stringify(body.filters ?? body.query) : null,
        typeof body.alertsEnabled === "boolean" ? body.alertsEnabled : null,
        typeof body.paused === "boolean" ? !body.paused : null,
        c.req.param("id"),
        ctx.userId,
      ],
    );
    return c.json(json({ id: c.req.param("id") }));
  });
  app.delete("/api/v1/saved-searches/:id", async (c) => {
    const ctx = requireUser(c);
    await getPool().query(`DELETE FROM saved_searches WHERE id=$1 AND user_id=$2`, [c.req.param("id"), ctx.userId]);
    return c.json(json({ deleted: true }));
  });

  // ---- Messages ----
  app.post("/api/v1/messages", async (c) => {
    const ctx = requireUser(c);
    const body = await c.req.json().catch(() => ({}));
    if (!body.body) throw new ValidationError("body is required");
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      let threadId = body.threadId;
      if (!threadId) {
        const t = await client.query(
          `INSERT INTO message_threads (subject, participant_ids) VALUES ($1,$2) RETURNING id`,
          [body.subject ?? "Support", [ctx.userId, ...(body.toUserId ? [body.toUserId] : [])]],
        );
        threadId = t.rows[0].id;
      }
      const m = await client.query(
        `INSERT INTO messages (thread_id, sender_id, body) VALUES ($1,$2,$3) RETURNING id`,
        [threadId, ctx.userId, body.body],
      );
      await client.query("COMMIT");
      return c.json(json({ threadId, messageId: m.rows[0].id }), 201);
    } finally {
      await client.release();
    }
  });

  // ---- Support ----
  app.post("/api/v1/support", async (c) => {
    const ctx = requireUser(c);
    const body = await c.req.json().catch(() => ({}));
    if (!body.subject || !body.message) throw new ValidationError("subject and message required");
    return transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO support_tickets (user_id, subject, status, priority) VALUES ($1,$2,'open','normal') RETURNING id`,
        [ctx.userId, body.subject],
      );
      const ticketId = rows[0].id as string;
      await client.query(
        `INSERT INTO support_ticket_events (ticket_id, event_type, actor_id, payload)
         VALUES ($1,'created',$2,$3)`,
        [ticketId, ctx.userId, JSON.stringify({ message: body.message })],
      );
      return c.json(json({ id: ticketId }), 201);
    });
  });

  // ---- Registrations ----
  app.get("/api/v1/registrations", async (c) => {
    const ctx = requireUser(c);
    const { rows } = await getPool().query(
      `SELECT * FROM auction_registrations WHERE user_id=$1 ORDER BY created_at DESC`,
      [ctx.userId],
    );
    return c.json(json(rows));
  });
  app.get("/api/v1/admin/registrations", async (c) => {
    requirePermission(c, "auction.close");
    const auctionId = c.req.query("auctionId");
    const where = auctionId ? `WHERE auction_id=$1` : "";
    const { rows } = await getPool().query(
      `SELECT * FROM auction_registrations ${where} ORDER BY created_at DESC LIMIT 200`,
      auctionId ? [auctionId] : [],
    );
    return c.json(json(rows));
  });

  // ---- Documents ----
  app.post("/api/v1/documents", async (c) => {
    const ctx = requireUser(c);
    const body = await c.req.json().catch(() => ({}));
    if (!body.bodyBase64) throw new ValidationError("bodyBase64 required");
    const buffer = Buffer.from(String(body.bodyBase64), "base64");
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const id = await storeDocument({
      ownerId: ctx.userId,
      resourceType: body.resourceType ?? "user_upload",
      resourceId: body.resourceId ?? null,
      accessScope: body.accessScope ?? "owner_only",
      mimeType: body.mimeType ?? "application/octet-stream",
      sizeBytes: buffer.length,
      checksum,
      body: buffer,
    });
    return c.json(json({ id }), 201);
  });
  app.get("/api/v1/documents/:id/url", async (c) => {
    const ctx = requireUser(c);
    const url = await getDocumentUrl(c.req.param("id"), ctx);
    return c.json(json({ url }));
  });

  // ---- KYC ----
  app.post("/api/v1/kyc/submit", async (c) => {
    const ctx = requireUser(c);
    const body = await c.req.json().catch(() => ({}));
    const kycId = await submitKyc(ctx.userId, Array.isArray(body.documents) ? body.documents : []);
    return c.json(json({ id: kycId }), 201);
  });
  app.get("/api/v1/kyc/status", async (c) => {
    const ctx = requireUser(c);
    const { rows } = await getPool().query(`SELECT * FROM kyc_verifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, [ctx.userId]);
    return c.json(json(rows[0] ?? null));
  });

  // ---- USDC deposits (user-initiated) ----
  app.post("/api/v1/usdc/deposits", async (c) => {
    const ctx = requireUser(c);
    const body = await c.req.json().catch(() => ({}));
    const network = body.networkCode ?? config.usdcNetwork;
    const token = body.tokenSymbol ?? "USDC";
    const res = await createDeposit(ctx.userId, {
      networkCode: network,
      tokenSymbol: token,
      expectedAmountCents: body.expectedAmountCents != null ? Math.round(Number(body.expectedAmountCents)) : undefined,
      transactionHash: body.transactionHash,
      idempotencyKey: body.idempotencyKey,
    });
    return c.json(json(res), 201);
  });
  app.get("/api/v1/my/usdc/deposits", async (c) => {
    const ctx = requireUser(c);
    return c.json(json(await listDeposits(ctx.userId)));
  });

  // ---- Payments / invoices ----
  app.get("/api/v1/payments", async (c) => {
    const ctx = requireUser(c);
    const { rows } = await getPool().query(`SELECT * FROM payments WHERE user_id=$1 ORDER BY created_at DESC`, [ctx.userId]);
    return c.json(json(rows));
  });
  app.get("/api/v1/invoices/:id", async (c) => {
    const ctx = requireUser(c);
    const { rows } = await getPool().query(`SELECT * FROM invoices WHERE id=$1`, [c.req.param("id")]);
    if (!rows[0] || rows[0].user_id !== ctx.userId) throw new NotFoundError("Invoice not found");
    return c.json(json(rows[0]));
  });
  app.post("/api/v1/invoices/:id/pay", async (c) => {
    const ctx = requireUser(c);
    const id = c.req.param("id");
    await transaction(async (client) => {
      const inv = await client.query(`SELECT * FROM invoices WHERE id=$1 FOR UPDATE`, [id]);
      if (!inv.rows[0] || inv.rows[0].user_id !== ctx.userId) throw new NotFoundError("Invoice not found");
      if (inv.rows[0].status === "paid") throw new ConflictError("Invoice already paid");
      const acct = await client.query(
        `SELECT * FROM funds_accounts WHERE user_id=$1 AND currency='USDC' FOR UPDATE`,
        [ctx.userId],
      );
      if (!acct.rows[0]) throw new NotFoundError("Funds account not found");
      const amount = Number(inv.rows[0].total);
      if (amount <= 0) throw new AppError("PAYMENT_MISMATCH", "Invoice total is invalid", 422);
      const available = Number(acct.rows[0].available_balance);
      if (available < amount) {
        throw new AppError("INSUFFICIENT_FUNDS", "Insufficient available balance to pay invoice", 409, {
          available,
          required: amount,
        });
      }
      await client.query(
        `UPDATE funds_accounts SET available_balance = available_balance - $1, updated_at=now() WHERE id=$2`,
        [amount, acct.rows[0].id],
      );
      await client.query(
        `INSERT INTO ledger_entries
           (funds_account_id, entry_type, direction, amount, currency, reference_type, reference_id, balance_after, metadata, category)
         VALUES ($1,'purchase','debit',$2,'USDC','invoice',$3,$4,$5,'auction_proceeds')`,
        [acct.rows[0].id, amount, id, available - amount, JSON.stringify({ invoiceId: id })],
      );
      await client.query(`UPDATE invoices SET status='paid', paid_at=now() WHERE id=$1`, [id]);
    });
    return c.json(json({ id, status: "paid" }));
  });
  app.get("/api/v1/admin/payments", async (c) => {
    requirePermission(c, "funds.view");
    const { rows } = await getPool().query(`SELECT * FROM payments ORDER BY created_at DESC LIMIT 200`);
    return c.json(json(rows));
  });

  // ---- Awards ----
  app.get("/api/v1/me/awards", async (c) => {
    const ctx = requireUser(c);
    return c.json(json(await listAwardsForUser(ctx.userId)));
  });
  app.get("/api/v1/admin/auctions/:id/awards", async (c) => {
    requireAdmin(c);
    return c.json(json(await listAwardsForAuction(c.req.param("id"))));
  });

  // ---- Certificate verification (public) ----
  app.get("/api/v1/certificates/:certificateNumber/verify", async (c) => {
    const token = c.req.query("token") ?? undefined;
    const res = await verifyCertificate(c.req.param("certificateNumber"), token);
    return c.json(json(res));
  });

  // ---- Admin ----
  app.get("/api/v1/admin/dashboard", async (c) => {
    requireAdmin(c);
    const { rows: users } = await getPool().query(`SELECT count(*)::int AS c FROM users`);
    const { rows: auctions } = await getPool().query(`SELECT count(*)::int AS c FROM auctions`);
    const { rows: deposits } = await getPool().query(`SELECT count(*)::int AS c FROM crypto_deposits WHERE status='confirmed'`);
    return c.json(
      json({
        users: users[0].c,
        auctions: auctions[0].c,
        confirmedDeposits: deposits[0].c,
      }),
    );
  });
  app.get("/api/v1/admin/users", async (c) => {
    requireAdmin(c);
    const { rows } = await getPool().query(
      `SELECT u.id, u.email, u.status, u.email_verified, u.created_at,
              COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') AS roles
       FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id
       GROUP BY u.id ORDER BY u.created_at DESC LIMIT 200`,
    );
    return c.json(json(rows));
  });
  app.patch("/api/v1/admin/users/:id/status", async (c) => {
    const ctx = requirePermission(c, "user.suspend");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    await getPool().query(`UPDATE users SET status=$1 WHERE id=$2`, [body.status, id]);
    await recordAdminAction({ actorUserId: ctx.userId, action: "USER_SUSPENDED", targetUserId: id, reason: body.reason });
    await writeAudit(null, { actorUserId: ctx.userId, action: "USER_SUSPENDED", entityType: "user", entityId: id, afterJson: { status: body.status } });
    return c.json(json({ id, status: body.status }));
  });
  app.patch("/api/v1/admin/users/:id/role", async (c) => {
    const ctx = requirePermission(c, "user.suspend");
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    if (body.action === "add") await assignRole(id, body.role, ctx.userId);
    else if (body.action === "remove") await revokeRole(id, body.role);
    else throw new ValidationError("action must be add or remove");
    return c.json(json({ id, role: body.role, action: body.action }));
  });
  app.get("/api/v1/admin/auctions", async (c) => {
    requireAdmin(c);
    const items = await listAuctions({});
    return c.json(json(items.items, { total: items.total }));
  });
  app.get("/api/v1/admin/kyc", async (c) => {
    requirePermission(c, "kyc.review");
    return c.json(json(await listKyc({ status: c.req.query("status") ?? undefined })));
  });
  app.post("/api/v1/admin/kyc/:id/review", async (c) => {
    const ctx = requirePermission(c, "kyc.review");
    const body = await c.req.json().catch(() => ({}));
    await reviewKyc(c.req.param("id"), Boolean(body.approve), ctx, body.reason);
    return c.json(json({ id: c.req.param("id"), approved: Boolean(body.approve) }));
  });
  app.get("/api/v1/admin/funds", async (c) => {
    requirePermission(c, "funds.view");
    const { rows } = await getPool().query(`SELECT * FROM funds_accounts ORDER BY created_at DESC LIMIT 200`);
    return c.json(json(rows));
  });
  app.get("/api/v1/admin/ledger", async (c) => {
    requirePermission(c, "funds.view");
    const { rows } = await getPool().query(`SELECT * FROM ledger_entries ORDER BY created_at DESC LIMIT 200`);
    return c.json(json(rows));
  });
  app.get("/api/v1/admin/deposits", async (c) => {
    requirePermission(c, "funds.view");
    return c.json(json(await listDeposits()));
  });
  app.post("/api/v1/admin/deposits/:id/confirm", async (c) => {
    requirePermission(c, "funds.view");
    const res = await confirmDeposit(c.req.param("id"));
    return c.json(json(res));
  });
  app.get("/api/v1/admin/certificates", async (c) => {
    requireAdmin(c);
    return c.json(json(await listCertificates({ status: (c.req.query("status") as any) ?? undefined })));
  });
  app.post("/api/v1/admin/certificates/:id/revoke", async (c) => {
    const ctx = requirePermission(c, "certificate.revoke");
    const body = await c.req.json().catch(() => ({}));
    await revokeCertificate(c.req.param("id"), ctx.userId, body.reason ?? "admin revoke");
    return c.json(json({ id: c.req.param("id"), revoked: true }));
  });
  app.get("/api/v1/admin/redemptions", async (c) => {
    requirePermission(c, "redemption.view");
    return c.json(json(await listRedemptions({ status: (c.req.query("status") as any) ?? undefined })));
  });
  app.post("/api/v1/admin/redemptions/:id/complete", async (c) => {
    requirePermission(c, "redemption.manage");
    await completeRedemption(c.req.param("id"));
    return c.json(json({ id: c.req.param("id"), completed: true }));
  });
  app.get("/api/v1/admin/audit", async (c) => {
    requirePermission(c, "audit.view");
    return c.json(json(await listAudit({ action: c.req.query("action") ?? undefined, entityType: c.req.query("entityType") ?? undefined })));
  });

  return app;
}

export type { AuthContext };
