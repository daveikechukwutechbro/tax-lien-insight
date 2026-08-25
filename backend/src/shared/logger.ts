import { randomUUID } from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

let minLevel: LogLevel = process.env.LOG_LEVEL === "debug" ? "debug" : "info";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

export interface LogMeta {
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  errorCode?: string;
  [key: string]: unknown;
}

// Fields that must never be logged.
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "secret",
  "authorization",
  "cookie",
  "privateKey",
  "apiKey",
  "resendApiKey",
  "authSecret",
  "blockchainWebhookSecret",
  "objectStorageSecretKey",
  "adminBootstrapSecret",
  "cronSecret",
  "ssn",
  "documentContents",
]);

function mask(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 8 ? `${value.slice(0, 2)}***${value.slice(-2)}` : "***";
  }
  return "***";
}

function sanitize(input: unknown, depth = 0): unknown {
  if (depth > 6) return "...";
  if (input === null || input === undefined) return input;
  if (typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map((v) => sanitize(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = mask(v);
    } else if (typeof v === "object" && v !== null) {
      out[k] = sanitize(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function log(
  level: LogLevel,
  message: string,
  meta?: LogMeta,
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? (sanitize(meta) as object) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => log("debug", message, meta),
  info: (message: string, meta?: LogMeta) => log("info", message, meta),
  warn: (message: string, meta?: LogMeta) => log("warn", message, meta),
  error: (message: string, meta?: LogMeta) => log("error", message, meta),
  requestId: () => randomUUID(),
};

export function withMeta(base: LogMeta, extra: LogMeta): LogMeta {
  return { ...base, ...extra };
}
