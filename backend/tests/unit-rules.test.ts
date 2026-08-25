import { describe, it, expect } from "vitest";
import { roundToPrecision, isAligned } from "../src/bids/bids.service.js";
import { moneySchema, centsToNumber } from "../src/shared/api.js";
import { AUCTION_TRANSITIONS } from "../src/shared/constants.js";
import { ErrorCodes } from "../src/shared/errors.js";

describe("bid rate alignment (interest-rate bid-down model)", () => {
  it("rounds to the jurisdiction precision", () => {
    expect(roundToPrecision(8.333, 2)).toBe(8.33);
    expect(roundToPrecision(8.336, 2)).toBe(8.34);
  });

  it("accepts a rate exactly one increment below current", () => {
    expect(isAligned(7.75, 8, 0.25, 2)).toBe(true);
  });

  it("rejects a rate that is not a multiple of the increment", () => {
    expect(isAligned(7.8, 8, 0.25, 2)).toBe(false);
  });

  it("accepts any rate when increment is zero", () => {
    expect(isAligned(7.81, 8, 0, 2)).toBe(true);
  });
});

describe("money is integer cents end to end", () => {
  it("converts dollars to cents and back", () => {
    expect(moneySchema.parse(123.45)).toBe(12345);
    expect(centsToNumber(12345)).toBe(123.45);
  });
  it("rejects non-finite money", () => {
    expect(() => moneySchema.parse(Number.NaN)).toThrow();
  });
});

describe("auction state machine", () => {
  it("allows draft -> scheduled -> registration_open -> registration_closed -> live -> closing", () => {
    expect(AUCTION_TRANSITIONS.draft).toContain("scheduled");
    expect(AUCTION_TRANSITIONS.scheduled).toContain("registration_open");
    expect(AUCTION_TRANSITIONS.registration_open).toContain("registration_closed");
    expect(AUCTION_TRANSITIONS.registration_closed).toContain("live");
    expect(AUCTION_TRANSITIONS.live).toContain("closing");
    expect(AUCTION_TRANSITIONS.closing).toContain("results_processing");
    expect(AUCTION_TRANSITIONS.results_processing).toContain("results_finalized");
  });
  it("forbids skipping states", () => {
    expect(AUCTION_TRANSITIONS.draft).not.toContain("live");
  });
});

describe("error codes cover the API contract", () => {
  const required = [
    "BID_TOO_LOW",
    "BID_RATE_INVALID",
    "AUCTION_NOT_OPEN",
    "AUCTION_CLOSED",
    "NOT_REGISTERED",
    "KYC_REQUIRED",
    "ACCOUNT_SUSPENDED",
    "INSUFFICIENT_FUNDS",
    "INVALID_STATE_TRANSITION",
    "INVALID_TOKEN",
    "TOKEN_EXPIRED",
    "USDC_WRONG_NETWORK",
    "USDC_WRONG_TOKEN",
    "USDC_WRONG_RECIPIENT",
    "USDC_DUPLICATE_HASH",
    "USDC_INSUFFICIENT_CONFIRMATIONS",
    "CERTIFICATE_NOT_FOUND",
    "REDEMPTION_INCORRECT_AMOUNT",
    "DOCUMENT_ACCESS_DENIED",
    "ACCOUNT_LOCKED",
    "LEDGER_IMMUTABLE",
    "INVOICE_NOT_FOUND",
    "AWARD_NOT_FOUND",
  ];
  it("defines every required code", () => {
    for (const code of required) {
      expect((ErrorCodes as Record<string, string>)[code]).toBe(code);
    }
  });
});
