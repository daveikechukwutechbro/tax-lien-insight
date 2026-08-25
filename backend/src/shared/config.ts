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
  resendApiKey: str("RESEND_API_KEY"),
  emailFrom: str("EMAIL_FROM", "no-reply@taxlieninsight.example"),
  emailReplyTo: str("EMAIL_REPLY_TO", ""),

  usdcNetwork: str("USDC_NETWORK", "base"),
  usdcTokenContract: str(
    "USDC_TOKEN_CONTRACT",
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  ),
  usdcConfirmationThreshold: int("USDC_CONFIRMATION_THRESHOLD", 12),
  blockchainRpcUrl: str("BLOCKCHAIN_RPC_URL"),
  blockchainWebhookSecret: str("BLOCKCHAIN_WEBHOOK_SECRET"),

  objectStorageEndpoint: str("OBJECT_STORAGE_ENDPOINT"),
  objectStorageBucket: str("OBJECT_STORAGE_BUCKET"),
  objectStorageAccessKey: str("OBJECT_STORAGE_ACCESS_KEY"),
  objectStorageSecretKey: str("OBJECT_STORAGE_SECRET_KEY"),
  objectStoragePublicBaseUrl: str("OBJECT_STORAGE_PUBLIC_BASE_URL"),

  cronSecret: str("CRON_SECRET"),
  adminBootstrapSecret: str("ADMIN_BOOTSTRAP_SECRET"),
  adminBootstrapEmail: str("ADMIN_BOOTSTRAP_EMAIL", "admin@taxlieninsight.example"),

  rateLimit: {
    login: int("RATE_LIMIT_LOGIN", 10),
    register: int("RATE_LIMIT_REGISTER", 5),
    bid: int("RATE_LIMIT_BID", 30),
  },
} as const;

export type AppConfig = typeof config;
