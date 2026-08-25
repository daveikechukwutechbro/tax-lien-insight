import type { Context } from "hono";
import { verifySessionToken } from "../auth/session.js";
import { getAuthContext, type AuthContext } from "../auth/rbac.js";
import { config } from "../shared/config.js";
import { UnauthorizedError, ForbiddenError } from "../shared/errors.js";

function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export async function resolveAuth(req: Request): Promise<AuthContext | null> {
  const token = getCookie(req, config.sessionCookieName);
  if (!token) return null;
  try {
    const session = await verifySessionToken(token);
    return await getAuthContext(session.userId);
  } catch {
    return null;
  }
}

export async function authMiddleware(c: Context, next: () => Promise<void>): Promise<void> {
  const ctx = await resolveAuth(c.req.raw);
  c.set("auth", ctx);
  await next();
}

export function getAuth(c: Context): AuthContext | null {
  return c.get("auth") as AuthContext | null;
}

export function requireUser(c: Context): AuthContext {
  const ctx = getAuth(c);
  if (!ctx) throw new UnauthorizedError();
  return ctx;
}

export function requirePermission(c: Context, permission: string): AuthContext {
  const ctx = requireUser(c);
  if (!(ctx.permissions as Set<string>).has(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return ctx;
}

export function requireAdmin(c: Context) {
  const ctx = requireUser(c);
  if (!ctx.roles.includes("admin") && !ctx.roles.includes("super_admin")) {
    throw new ForbiddenError("Admin role required");
  }
  return ctx;
}
