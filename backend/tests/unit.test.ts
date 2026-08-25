import { describe, it, expect } from "vitest";
import { calculateRedemption } from "../src/redemptions/redemptions.service.js";
import { ok, fail, moneySchema, centsToNumber } from "../src/shared/api.js";
import { hashPassword, verifyPassword, normalizeEmail } from "../src/auth/password.js";

describe("redemption calculation", () => {
  it("computes time-proportional interest", () => {
    const sale = new Date("2025-01-01T00:00:00Z");
    const start = new Date("2026-01-01T00:00:00Z"); // exactly 365 days
    const r = calculateRedemption({
      principalAmount: 100000,
      winningInterestRate: 12,
      saleDate: sale,
      redemptionStart: start,
      jurisdictionId: "x",
    });
    expect(r.principalAmount).toBe(100000);
    // 12% of 100000 for ~1 year ≈ 12000 cents
    expect(r.interestAmount).toBe(12000);
    expect(r.totalDue).toBe(112000);
  });

  it("never produces negative totals", () => {
    const r = calculateRedemption({
      principalAmount: 5000,
      winningInterestRate: 0,
      saleDate: new Date(),
      redemptionStart: new Date(),
      jurisdictionId: "x",
    });
    expect(r.totalDue).toBeGreaterThanOrEqual(r.principalAmount);
  });
});

describe("api envelope & money", () => {
  it("ok returns envelope", () => {
    const e = ok({ a: 1 });
    expect(e.success).toBe(true);
    expect(e.data).toEqual({ a: 1 });
    expect(e.error).toBeNull();
  });
  it("fail returns error shape", () => {
    const { body, status } = fail("BID_TOO_LOW", "too low", 422, { min: 1 });
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe("BID_TOO_LOW");
    expect(status).toBe(422);
  });
  it("money converts to cents", () => {
    expect(moneySchema.parse(12.5)).toBe(1250);
    expect(centsToNumber(1250)).toBe(12.5);
  });
});

describe("password hashing", () => {
  it("hashes and verifies", async () => {
    const h = await hashPassword("Sup3rSecret!");
    expect(await verifyPassword("Sup3rSecret!", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
  it("normalizes email", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});
