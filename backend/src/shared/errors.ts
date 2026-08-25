/**
 * Application error hierarchy with stable machine-readable codes.
 * Never return raw exception strings to clients.
 */

export class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;
  readonly isOperational = true;

  constructor(
    code: string,
    message: string,
    httpStatus = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, 422, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", details?: Record<string, unknown>) {
    super("UNAUTHORIZED", message, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action", details?: Record<string, unknown>) {
    super("FORBIDDEN", message, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: Record<string, unknown>) {
    super("NOT_FOUND", message, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict with current state", details?: Record<string, unknown>) {
    super("CONFLICT", message, 409, details);
  }
}

export class IdempotencyError extends AppError {
  constructor(message = "Duplicate request", details?: Record<string, unknown>) {
    super("IDEMPOTENT_DUPLICATE", message, 409, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests", details?: Record<string, unknown>) {
    super("RATE_LIMITED", message, 429, details);
  }
}

export class ConfigurationError extends AppError {
  constructor(message = "Service not configured", details?: Record<string, unknown>) {
    super("NOT_CONFIGURED", message, 503, details);
  }
}

// Domain-specific codes (used in `details` / client handling)
export const ErrorCodes = {
  BID_TOO_LOW: "BID_TOO_LOW",
  BID_RATE_INVALID: "BID_RATE_INVALID",
  AUCTION_NOT_OPEN: "AUCTION_NOT_OPEN",
  AUCTION_CLOSED: "AUCTION_CLOSED",
  NOT_REGISTERED: "NOT_REGISTERED",
  KYC_REQUIRED: "KYC_REQUIRED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  DUPLICATE_HOLD: "DUPLICATE_HOLD",
  INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  USDC_WRONG_NETWORK: "USDC_WRONG_NETWORK",
  USDC_WRONG_TOKEN: "USDC_WRONG_TOKEN",
  USDC_WRONG_RECIPIENT: "USDC_WRONG_RECIPIENT",
  USDC_DUPLICATE_HASH: "USDC_DUPLICATE_HASH",
  USDC_INSUFFICIENT_CONFIRMATIONS: "USDC_INSUFFICIENT_CONFIRMATIONS",
  CERTIFICATE_NOT_FOUND: "CERTIFICATE_NOT_FOUND",
  REDEMPTION_INCORRECT_AMOUNT: "REDEMPTION_INCORRECT_AMOUNT",
  DOCUMENT_ACCESS_DENIED: "DOCUMENT_ACCESS_DENIED",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  CURRENCY_UNSUPPORTED: "CURRENCY_UNSUPPORTED",
  LEDGER_IMMUTABLE: "LEDGER_IMMUTABLE",
  WITHDRAWAL_INSUFFICIENT: "WITHDRAWAL_INSUFFICIENT",
  INVOICE_NOT_FOUND: "INVOICE_NOT_FOUND",
  PAYMENT_MISMATCH: "PAYMENT_MISMATCH",
  PAYMENT_NOT_FOUND: "PAYMENT_NOT_FOUND",
  PROPERTY_NOT_FOUND: "PROPERTY_NOT_FOUND",
  AWARD_NOT_FOUND: "AWARD_NOT_FOUND",
  REGISTRATION_NOT_FOUND: "REGISTRATION_NOT_FOUND",
  MESSAGE_THREAD_NOT_FOUND: "MESSAGE_THREAD_NOT_FOUND",
  SUPPORT_TICKET_NOT_FOUND: "SUPPORT_TICKET_NOT_FOUND",
  KYC_ALREADY_SUBMITTED: "KYC_ALREADY_SUBMITTED",
  DEPOSIT_NOT_FOUND: "DEPOSIT_NOT_FOUND",
  DUPLICATE_WATCHLIST: "DUPLICATE_WATCHLIST",
  DUPLICATE_SAVED_SEARCH: "DUPLICATE_SAVED_SEARCH",
  ALREADY_VERIFIED: "ALREADY_VERIFIED",
} as const;

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const message = err instanceof Error ? err.message : "Unexpected error";
  return new AppError("INTERNAL_ERROR", message, 500);
}
