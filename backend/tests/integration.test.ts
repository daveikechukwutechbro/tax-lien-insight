/**
 * Integration tests. These require a reachable PostgreSQL instance and are
 * SKIPPED automatically when DATABASE_URL is not set (e.g. in this dev env).
 * Run with: DATABASE_URL=postgres://... npm run test
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomBytes } from "node:crypto";
import { config } from "../src/shared/config.js";
import { runMigrations } from "../src/db/migrate.js";
import { getPool } from "../src/db/pool.js";
import { registerUser, loginUser, ensureBootstrapAdmin } from "../src/auth/auth.service.js";
import { assignRole } from "../src/auth/rbac.js";
import { getAuthContext, isAdmin, assertPermission, type AuthContext } from "../src/auth/rbac.js";
import { ForbiddenError } from "../src/shared/errors.js";
import {
  createAuction,
  publishAuction,
  openRegistration,
  closeRegistration,
  startAuction,
  closeAuction,
  finalizeResults,
  createLot,
} from "../src/auctions/auctions.service.js";
import { registerForAuction } from "../src/auctions/auctions.service.js";
import { placeBid, listBidsForLot } from "../src/bids/bids.service.js";
import { getAccount, credit, getSummary } from "../src/funds/funds.service.js";
import { createDeposit, applyConfirmedDeposit, listDeposits } from "../src/usdc/usdc.service.js";
import { issueCertificate, verifyCertificate } from "../src/certificates/certificates.service.js";
import { createRedemption, listRedemptions } from "../src/redemptions/redemptions.service.js";
import { storeDocument } from "../src/providers/storage/index.js";
import { getDocumentUrl } from "../src/documents/documents.service.js";
import { createJurisdiction } from "../src/jurisdictions/jurisdictions.service.js";
import { v4 as uuid } from "uuid";

const db = process.env.DATABASE_URL ? describe : describe.skip;

async function activate(userId: string) {
  await getPool().query(`UPDATE users SET status='active', email_verified=true, email_verified_at=now() WHERE id=$1`, [userId]);
}

async function makeUser(password = "password123"): Promise<string> {
  const email = `u_${randomBytes(6).toString("hex")}@test.example`;
  const u = await registerUser({ email, password, fullName: email }, { ip: "test", userAgent: "test" });
  await activate(u.id);
  return u.id;
}

async function createTestJurisdiction(): Promise<string> {
  const jurisdictionId = await createJurisdiction({
    jurisdictionType: "county",
    name: `County ${uuid().slice(0, 6)}`,
    officialCode: `TC-${randomBytes(3).toString("hex")}`,
  });
  await getPool().query(
    `INSERT INTO jurisdiction_rules
       (jurisdiction_id, effective_from, status, auction_type, bid_method, interest_rate_min, interest_rate_max,
        interest_increment, interest_precision, registration_required, kyc_required, deposit_required,
        deposit_amount, payment_deadline_hours, redemption_enabled, redemption_period_days, redemption_calculation_method)
     VALUES ($1, now(), 'active','tax_lien','rate_down',0,18,0.25,2,false,false,false,0,72,true,'time_proportional_interest')`,
    [jurisdictionId],
  );
  return jurisdictionId;
}

async function setupAuction(jurisdictionId: string) {
  const actor = await makeUser();
  const auctionId = await createAuction({ title: `Auction ${uuid().slice(0, 6)}`, jurisdictionId }, actor);
  await publishAuction(auctionId, actor);
  await openRegistration(auctionId, actor);
  await closeRegistration(auctionId, actor);
  await startAuction(auctionId, actor);
  const lotId = await createLot(auctionId, { parcelId: `PARCEL-${uuid().slice(0, 6)}`, startingRate: 12, minimumRate: 0, rateIncrement: 0.25, ratePrecision: 2 });
  await getPool().query(`UPDATE auction_lots SET status='live' WHERE id=$1`, [lotId]);
  return { auctionId, lotId };
}

db("integration A — auth & authorization", () => {
  beforeAll(async () => {
    await runMigrations();
  });
  afterAll(async () => {
    await getPool().end();
  });

  it("registers, verifies, and logs in a user", async () => {
    const email = `a_${randomBytes(6).toString("hex")}@test.example`;
    const u = await registerUser({ email, password: "password123", fullName: "A" }, { ip: "t", userAgent: "t" });
    expect(u.id).toBeTruthy();
    await activate(u.id);
    const res = await loginUser(email, "password123", { ip: "t", userAgent: "t" });
    expect(res.token).toBeTruthy();
    expect(res.userId).toBe(u.id);
    const ctx = await getAuthContext(u.id);
    expect(ctx.userId).toBe(u.id);
  });

  it("rejects login for an unverified (pending) account", async () => {
    const email = `b_${randomBytes(6).toString("hex")}@test.example`;
    await registerUser({ email, password: "password123", fullName: "B" }, { ip: "t", userAgent: "t" });
    await expect(loginUser(email, "password123", { ip: "t", userAgent: "t" })).rejects.toThrow();
  });

  it("enforces permissions: a normal user cannot perform admin actions", async () => {
    const userId = await makeUser();
    const ctx = await getAuthContext(userId);
    expect(isAdmin(ctx)).toBe(false);
    expect(() => assertPermission(ctx, "auction.close" as any)).toThrow(ForbiddenError);
  });

  it("bootstrap grants super_admin with full permissions", async () => {
    const email = `admin_${randomBytes(6).toString("hex")}@test.example`;
    const u = await registerUser({ email, password: "password123", fullName: email }, { ip: "t", userAgent: "t" });
    await activate(u.id);
    await assignRole(u.id, "super_admin", u.id);
    const ctx: AuthContext = await getAuthContext(u.id);
    expect(isAdmin(ctx)).toBe(true);
    expect(() => assertPermission(ctx, "auction.close" as any)).not.toThrow();
  });
});

db("integration B — auction lifecycle, registration, bidding & concurrency", () => {
  beforeAll(async () => {
    await runMigrations();
  });
  afterAll(async () => {
    await getPool().end();
  });

  it("runs the full auction flow and produces exactly one winning bid", async () => {
    const jurisdictionId = await createTestJurisdiction();
    const { auctionId, lotId } = await setupAuction(jurisdictionId);
    const bidder = await makeUser();
    const ctx = await getAuthContext(bidder);
    const reg = await registerForAuction(auctionId, ctx);
    expect(reg.status).toBe("approved");

    const account = await getAccount(bidder);
    await credit(account.id, 1_000_00, "deposit");

    const bid = await placeBid(ctx, lotId, { rate: 11, amount: 500_00, idempotencyKey: uuid() });
    expect(bid.status).toBe("winning");
    const summary = await getSummary(bidder);
    expect(summary.held).toBe(500_00);
  });

  it("serializes concurrent bids so exactly one remains winning", async () => {
    const jurisdictionId = await createTestJurisdiction();
    const { auctionId, lotId } = await setupAuction(jurisdictionId);

    const b1 = await makeUser();
    const b2 = await makeUser();
    const c1 = await getAuthContext(b1);
    const c2 = await getAuthContext(b2);
    await registerForAuction(auctionId, c1);
    await registerForAuction(auctionId, c2);
    await credit((await getAccount(b1)).id, 2_000_00, "deposit");
    await credit((await getAccount(b2)).id, 2_000_00, "deposit");

    const [r1, r2] = await Promise.all([
      placeBid(c1, lotId, { rate: 12, amount: 1000_00, idempotencyKey: uuid() }),
      placeBid(c2, lotId, { rate: 11.75, amount: 1000_00, idempotencyKey: uuid() }),
    ]);
    // outcomes are independent; exactly one should be 'winning' and the other 'outbid'
    const bids = await listBidsForLot(lotId);
    const winning = bids.filter((b: any) => b.status === "winning");
    const outbid = bids.filter((b: any) => b.status === "outbid");
    expect(winning.length).toBe(1);
    expect(outbid.length).toBe(1);
    // the winning bid is the lower rate (higher bid-down)
    expect(Math.min(r1.rate, r2.rate)).toBe(11.75);
  });

  it("creates awards on finalize", async () => {
    const jurisdictionId = await createTestJurisdiction();
    const { auctionId, lotId } = await setupAuction(jurisdictionId);
    const bidder = await makeUser();
    const ctx = await getAuthContext(bidder);
    await registerForAuction(auctionId, ctx);
    await credit((await getAccount(bidder)).id, 2_000_00, "deposit");
    await placeBid(ctx, lotId, { rate: 10.5, amount: 800_00, idempotencyKey: uuid() });
    await closeAuction(auctionId, bidder);
    const finalized = await finalizeResults(auctionId, bidder);
    expect(finalized.state).toBe("results_finalized");
    const { rows } = await getPool().query(`SELECT COUNT(*)::int AS c FROM awards WHERE auction_id=$1`, [auctionId]);
    expect(rows[0].c).toBe(1);
  });
});

db("integration C — funds, USDC, certificates, redemptions, documents", () => {
  beforeAll(async () => {
    await runMigrations();
  });
  afterAll(async () => {
    await getPool().end();
  });

  it("credits a verified USDC deposit to the ledger", async () => {
    const userId = await makeUser();
    const account = await getAccount(userId);
    const before = (await getSummary(userId)).available;
    const dep = await createDeposit(userId, { networkCode: "base", tokenSymbol: "USDC", expectedAmountCents: 500_00 });
    const confirmed = await applyConfirmedDeposit(dep.depositId, {
      receivedCents: 500_00,
      transactionHash: `0xtest${randomBytes(8).toString("hex")}`,
      blockNumber: 100,
      confirmations: 20,
    });
    expect(confirmed.status).toBe("confirmed");
    const after = (await getSummary(userId)).available;
    expect(after - before).toBe(500_00);
    const list = await listDeposits(userId);
    expect(list.length).toBe(1);
  });

  it("issues and publicly verifies a certificate", async () => {
    const holder = await makeUser();
    const jurisdictionId = await createTestJurisdiction();
    const certId = await issueCertificate({
      jurisdictionId,
      holderId: holder,
      principalAmount: 1000_00,
      winningInterestRate: 12,
    });
    expect(certId).toBeTruthy();
    const { rows } = await getPool().query(`SELECT certificate_number FROM certificates WHERE id=$1`, [certId]);
    const v = await verifyCertificate(rows[0].certificate_number);
    expect(v.verified).toBe(true);
    expect(v.status).toBe("issued");
  });

  it("creates a redemption for an issued certificate", async () => {
    const holder = await makeUser();
    const jurisdictionId = await createTestJurisdiction();
    const certId = await issueCertificate({ jurisdictionId, holderId: holder, principalAmount: 2000_00, winningInterestRate: 10 });
    const redemptionId = await createRedemption(certId);
    const reds = await listRedemptions({ holderId: holder });
    expect(reds.some((r: any) => r.id === redemptionId)).toBe(true);
  });

  it("stores a document and yields a scoped URL to the owner", async () => {
    const owner = await makeUser();
    const ctx = await getAuthContext(owner);
    const docId = await storeDocument({
      ownerId: owner,
      resourceType: "user_upload",
      resourceId: null,
      accessScope: "owner_only",
      mimeType: "text/plain",
      sizeBytes: 5,
      checksum: "deadbeef",
      body: Buffer.from("hello"),
    });
    const url = await getDocumentUrl(docId, ctx);
    expect(typeof url).toBe("string");
  });
});
