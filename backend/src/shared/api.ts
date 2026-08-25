import { z } from "zod";
import type { LogMeta } from "./logger.js";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  meta: Record<string, unknown>;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
}

export function ok<T>(data: T, meta: Record<string, unknown> = {}): ApiEnvelope<T> {
  return { success: true, data, error: null, meta };
}

export function fail(
  code: string,
  message: string,
  httpStatus: number,
  details?: Record<string, unknown>,
  meta: Record<string, unknown> = {},
): { body: ApiEnvelope<null>; status: number } {
  return {
    status: httpStatus,
    body: { success: false, data: null, meta, error: { code, message, details } },
  };
}

// ---------------------------------------------------------------------------
// Money: represented as integer minor units (cents) in the database to avoid
// floating point errors. zod helper accepts number or string and converts.
// ---------------------------------------------------------------------------
export const moneySchema = z.union([z.number(), z.string()]).transform((v, ctx) => {
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Money must be a number" });
    return z.NEVER;
  }
  // Store as integer cents.
  const cents = Math.round(n * 100);
  if (!Number.isSafeInteger(cents)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Money value out of safe range" });
    return z.NEVER;
  }
  return cents;
});

export type Cents = number;

export function centsToNumber(cents: Cents): number {
  return cents / 100;
}

export const uuidSchema = z.string().uuid();
export const cursorSchema = z.string().min(1).max(256);
export const localeSchema = z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/).default("en-US");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

export function paginationMeta(p: Pagination, total: number) {
  return {
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}

export const requestMeta = {
  from(headers: Headers, requestId: string): LogMeta & { ip: string; userAgent: string } {
    return {
      requestId,
      ip: headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "unknown",
      userAgent: headers.get("user-agent") ?? "unknown",
    };
  },
};
