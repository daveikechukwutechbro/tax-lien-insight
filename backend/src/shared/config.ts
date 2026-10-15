import "dotenv/config";
import {
  ENVIRONMENTS,
  type Environment,
} from "./constants.js";

function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === null ? fallback : String(v);
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === "1" || v === "true" || v === "yes";
}

const environmentRaw = str("ENVIRONMENT", "development");
const environment: Environment = (ENVIRONMENTS as readonly string[]).includes(environmentRaw)
  ? (environmentRaw as Environment)
  : "development";

export const config = {
  environment,
  isProduction: environment === "production",
  isDevelopment: environment === "development",
  port: int("PORT", 8787),
  appUrl: str("APP_URL", "http://localhost:5173"),
  apiUrl: str("API_URL", "http://localhost:8787"),

  databaseUrl: str("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/taxlien"),
  databaseDirectUrl: str(
    "DATABASE_DIRECT_URL",
    "postgres://postgres:postgres@localhost:5432/taxlien",
  ),

  authSecret: str("AUTH_SECRET", "insecure-dev-secret-change-me-please-32chars"),
  sessionCookieName: str("SESSION_COOKIE_NAME", "tli_session"),
  sessionTtlSeconds: int("SESSION_TTL_SECONDS", 86400),
  cookieDomain: str("COOKIE_DOMAIN", ""),

  emailProvider: str("EMAIL_PROVIDER", "resend"),
  providerConfigured: (() => {
    const p = str("EMAIL_PROVIDER", "resend").toLowerCase();
    return p === "resend" || p === "smtp" || p === "outbox" ? p : "resend";
  })(),
  resendApiKey: str("RESEND_API_KEY"),
  emailFrom: str("EMAIL_FROM", "no-reply@auctionledger.com"),
  emailFromName: str("EMAIL_FROM_NAME", "Auction Ledger"),
  emailReplyTo: str("EMAIL_REPLY_TO", ""),
  smtpHost: str("SMTP_HOST", "smtp.gmail.com"),
  smtpPort: int("SMTP_PORT", 465),
  smtpSecure: bool("SMTP_SECURE", true),
  smtpUser: str("SMTP_USER"),
  smtpPass: str("SMTP_PASS"),

  usdcNetwork: str("USDC_NETWORK", "base"),
  usdcTokenContract: str(
    "USDC_TOKEN_CONTRACT",
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  ),
  usdcConfirmationThreshold: int("USDC_CONFIRMATION_THRESHOLD", 12),
  blockchainRpcUrl: str("BLOCKCHAIN_RPC_URL"),
  blockchainWebhookSecret: str("BLOCKCHAIN_WEBHOOK_SECRET"),

  // Settlement destinations. NEVER hardcode wallets in source. The platform
  // must not assume one address receives all money: platform revenue and
  // auction/tax-sale proceeds are distinct financial categories with
  // distinct legal owners (see migration 0006 categories).
  usdcSettlementAddressPlatform: str("USDC_SETTLEMENT_ADDRESS_PLATFORM"),
  usdcSettlementAddressProceeds: str("USDC_SETTLEMENT_ADDRESS_PROCEEDS"),

  objectStorageEndpoint: str("OBJECT_STORAGE_ENDPOINT"),
  objectStorageBucket: str("OBJECT_STORAGE_BUCKET"),
  objectStorageAccessKey: str("OBJECT_STORAGE_ACCESS_KEY"),
  objectStorageSecretKey: str("OBJECT_STORAGE_SECRET_KEY"),
  objectStoragePublicBaseUrl: str("OBJECT_STORAGE_PUBLIC_BASE_URL"),

  // Card / fiat on-ramp (Transak). Buyer pays with a card; Transak buys USDC and
  // delivers it to `onrampUsdcWallet`. We verify the delivery on-chain before
  // crediting the internal ledger, so provider config is required but not trusted.
  transakApiKey: str("TRANSAK_API_KEY"),
  // Short-lived (7-day) JWT. Optional: if unset, it is derived from the API
  // secret below and refreshed automatically.
  transakAccessToken: str("TRANSAK_ACCESS_TOKEN"),
  transakApiSecret: str("TRANSAK_API_SECRET"),
  transakWebhookSecret: str("TRANSAK_WEBHOOK_SECRET"),
  transakEnv: str("TRANSAK_ENV", "PRODUCTION"),
  transakReferrerDomain: str("TRANSAK_REFERRER_DOMAIN"),
  onrampUsdcWallet: str("ONRAMP_USDC_WALLET"),
  onrampNetwork: str("ONRAMP_NETWORK", "base"),
  onrampCrypto: str("ONRAMP_CRYPTO", "USDC"),
  onrampFiatCurrency: str("ONRAMP_FIAT_CURRENCY", "USD"),
  onrampMinCents: int("ONRAMP_MIN_CENTS", 2000),
  onrampMaxCents: int("ONRAMP_MAX_CENTS", 1000000),
  // When true, unsigned webhooks are accepted (local/dev only). Never enable in production.
  onrampAllowUnsignedWebhook: bool("ONRAMP_ALLOW_UNSIGNED_WEBHOOK", false),

  cronSecret: str("CRON_SECRET"),
  adminBootstrapSecret: str("ADMIN_BOOTSTRAP_SECRET"),
  adminBootstrapEmail: str("ADMIN_BOOTSTRAP_EMAIL", "admin@auctionledger.com"),

  rateLimit: {
    login: int("RATE_LIMIT_LOGIN", 10),
    register: int("RATE_LIMIT_REGISTER", 5),
    bid: int("RATE_LIMIT_BID", 30),
  },
} as const;

export type AppConfig = typeof config;
