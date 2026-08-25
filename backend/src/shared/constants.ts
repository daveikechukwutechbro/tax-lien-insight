/**
 * Central domain enumerations and constants.
 * Single source of truth shared by services, migrations, and tests.
 */

export const ENVIRONMENTS = ["development", "staging", "production"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

// ---------------------------------------------------------------------------
// Roles & permissions (RBAC)
// ---------------------------------------------------------------------------
export const ROLES = [
  "bidder",
  "verified_bidder",
  "support_agent",
  "kyc_reviewer",
  "auction_manager",
  "property_manager",
  "finance_manager",
  "compliance_officer",
  "content_manager",
  "auditor",
  "admin",
  "super_admin",
] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "auction.create",
  "auction.publish",
  "auction.pause",
  "auction.close",
  "property.create",
  "property.edit",
  "bid.view",
  "bid.review",
  "user.view",
  "user.suspend",
  "kyc.review",
  "funds.view",
  "funds.adjust",
  "certificate.issue",
  "certificate.revoke",
  "redemption.view",
  "redemption.manage",
  "audit.view",
  "system.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Default role -> permission grants
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  bidder: [],
  verified_bidder: ["bid.view"],
  support_agent: ["user.view", "bid.view"],
  kyc_reviewer: ["kyc.review", "user.view"],
  auction_manager: ["auction.create", "auction.publish", "auction.pause", "auction.close", "bid.view"],
  property_manager: ["property.create", "property.edit"],
  finance_manager: ["funds.view", "funds.adjust", "certificate.issue", "certificate.revoke", "redemption.manage"],
  compliance_officer: ["audit.view", "kyc.review", "user.view"],
  content_manager: ["property.edit"],
  auditor: ["audit.view", "user.view", "bid.view", "funds.view", "kyc.review", "redemption.view"],
  admin: [
    "auction.create",
    "auction.publish",
    "auction.pause",
    "auction.close",
    "property.create",
    "property.edit",
    "bid.view",
    "bid.review",
    "user.view",
    "user.suspend",
    "kyc.review",
    "funds.view",
    "funds.adjust",
    "certificate.issue",
    "certificate.revoke",
    "redemption.view",
    "redemption.manage",
    "audit.view",
    "system.manage",
  ],
  super_admin: [
    "auction.create",
    "auction.publish",
    "auction.pause",
    "auction.close",
    "property.create",
    "property.edit",
    "bid.view",
    "bid.review",
    "user.view",
    "user.suspend",
    "kyc.review",
    "funds.view",
    "funds.adjust",
    "certificate.issue",
    "certificate.revoke",
    "redemption.view",
    "redemption.manage",
    "audit.view",
    "system.manage",
  ],
};

export const ADMIN_ROLES: Role[] = ["admin", "super_admin"];

// ---------------------------------------------------------------------------
// Auction / lot / registration / bid state machines
// ---------------------------------------------------------------------------
export const AUCTION_STATES = [
  "draft",
  "scheduled",
  "registration_open",
  "registration_closed",
  "live",
  "paused",
  "closing",
  "results_processing",
  "results_finalized",
  "settlement",
  "closed",
  "cancelled",
  "archived",
] as const;
export type AuctionState = (typeof AUCTION_STATES)[number];

export const AUCTION_TRANSITIONS: Record<AuctionState, AuctionState[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["registration_open", "cancelled"],
  registration_open: ["registration_closed", "cancelled"],
  registration_closed: ["live", "cancelled"],
  live: ["paused", "closing", "cancelled"],
  paused: ["live", "cancelled"],
  closing: ["results_processing", "cancelled"],
  results_processing: ["results_finalized", "cancelled"],
  results_finalized: ["settlement", "cancelled"],
  settlement: ["closed", "cancelled"],
  closed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

export const LOT_STATES = [
  "draft",
  "scheduled",
  "open",
  "live",
  "paused",
  "closing",
  "closed",
  "awarded",
  "unawarded",
  "cancelled",
  "withdrawn",
  "settled",
  "archived",
] as const;
export type LotState = (typeof LOT_STATES)[number];

export const REGISTRATION_STATES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "expired",
  "withdrawn",
] as const;
export type RegistrationState = (typeof REGISTRATION_STATES)[number];

export const BID_STATES = [
  "submitted",
  "accepted",
  "winning",
  "outbid",
  "lost",
  "won",
  "withdrawn",
  "rejected",
  "voided",
  "final",
] as const;
export type BidState = (typeof BID_STATES)[number];

// ---------------------------------------------------------------------------
// Financial ledger
// ---------------------------------------------------------------------------
export const LEDGER_ENTRY_TYPES = [
  "deposit",
  "bid_hold",
  "bid_hold_release",
  "auction_settlement",
  "purchase",
  "refund",
  "withdrawal",
  "fee",
  "adjustment",
  "redemption",
  "reversal",
] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const LEDGER_DIRECTIONS = ["credit", "debit"] as const;
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];

export const FUND_HOLD_STATUSES = [
  "active",
  "released",
  "consumed",
  "expired",
  "cancelled",
] as const;
export type FundHoldStatus = (typeof FUND_HOLD_STATUSES)[number];

// ---------------------------------------------------------------------------
// USDC / crypto deposits
// ---------------------------------------------------------------------------
export const DEPOSIT_STATUSES = [
  "created",
  "awaiting_payment",
  "detected",
  "confirming",
  "confirmed",
  "rejected",
  "expired",
  "reversed",
] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Certificates / redemption
// ---------------------------------------------------------------------------
export const CERTIFICATE_STATES = [
  "pending",
  "issued",
  "verified",
  "redeemed",
  "released",
  "revoked",
  "expired",
  "archived",
] as const;
export type CertificateState = (typeof CERTIFICATE_STATES)[number];

export const REDEMPTION_STATES = [
  "not_started",
  "active",
  "payment_pending",
  "paid",
  "confirmed",
  "completed",
  "expired",
  "disputed",
  "cancelled",
] as const;
export type RedemptionState = (typeof REDEMPTION_STATES)[number];

// ---------------------------------------------------------------------------
// KYC
// ---------------------------------------------------------------------------
export const KYC_STATES = [
  "not_started",
  "submitted",
  "processing",
  "verified",
  "rejected",
  "expired",
  "manual_review",
  "suspended",
] as const;
export type KycState = (typeof KYC_STATES)[number];

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export const DOCUMENT_ACCESS_SCOPES = [
  "public",
  "owner_only",
  "auction_participants",
  "certificate_holder",
  "support_only",
  "admin_only",
  "kyc_sensitive",
  "system_internal",
] as const;
export type DocumentAccessScope = (typeof DOCUMENT_ACCESS_SCOPES)[number];

// ---------------------------------------------------------------------------
// Invoices / payments
// ---------------------------------------------------------------------------
export const INVOICE_STATES = [
  "draft",
  "issued",
  "pending",
  "paid",
  "partially_paid",
  "overdue",
  "cancelled",
  "refunded",
] as const;
export type InvoiceState = (typeof INVOICE_STATES)[number];

export const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded", "reversed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Jurisdiction types
// ---------------------------------------------------------------------------
export const JURISDICTION_TYPES = [
  "state",
  "county",
  "parish",
  "borough",
  "independent_city",
  "municipality",
  "county_equivalent",
  "other",
] as const;
export type JurisdictionType = (typeof JURISDICTION_TYPES)[number];

export const ACCOUNT_STATUSES = ["active", "suspended", "banned", "deleted"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const USDC_SYMBOL = "USDC";
export const BASE_CURRENCY = "USD";
export const LEDGER_CURRENCY = "USDC";
