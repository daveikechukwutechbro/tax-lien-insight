// Real auth + session client for the delegated/SSR-safe surface. The app's
// server routes (/api/v1/*) proxy to the deployed backend Worker; requests
// stay same-origin, so the session cookie (tli_session) set by the backend
// flows through the proxy to the browser and back. This replaces the legacy
// Firebase/demo mock auth entirely.

export interface BackendUser {
  id: string;
  email: string;
  fullName: string | null;
  status: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  kycStatus: string;
  phone: string | null;
  address: {
    addressLine: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  } | null;
  avatar: string | null;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

export class AuthError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? AbortSignal.timeout(25_000),
  });
  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (envelope && envelope.success === false) {
    throw new AuthError(
      envelope.error?.code ?? "API_ERROR",
      envelope.error?.message ?? "Request failed",
      res.status,
      (envelope.error as { details?: Record<string, unknown> })?.details,
    );
  }
  if (!envelope || !envelope.success) {
    throw new AuthError("API_ERROR", "Unexpected server response", res.status);
  }
  return envelope.data as T;
}

export async function getMe(): Promise<BackendUser | null> {
  try {
    const me = await request<BackendUser>("/api/v1/me");
    knownAuthenticated = true;
    persistUser(me);
    return me;
  } catch (err) {
    if (err instanceof AuthError && (err.status === 401 || err.status === 403)) {
      knownAuthenticated = false;
      clearCachedUser();
      return null;
    }
    throw err;
  }
}

// Session-user cache. The header renders from this instantly (no waiting on
// the slow Worker round-trip), and only a real 401 from the backend clears it
// — a transient timeout must never flash "Log in / Create Account" at a signed
// in user.
export const USER_CACHE_KEY = "al.session-user-v1";

function persistUser(u: BackendUser): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ u, t: Date.now() }));
  } catch {
    // private mode / quota — the in-memory return value still wins
  }
}

function clearCachedUser(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // ignore
  }
}

/** Persisted user, or null when none is stored. Hard-expired after 30 days. */
export function readCachedUser(): BackendUser | null {
  const entry = readCachedUserEntry();
  return entry ? entry.u : null;
}

/** Age of the persisted user in ms, or null when nothing is stored. */
export function cachedUserAgeMs(): number | null {
  const entry = readCachedUserEntry();
  return entry ? entry.ageMs : null;
}

function readCachedUserEntry(): { u: BackendUser; ageMs: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { u?: BackendUser; t?: number };
    if (!parsed?.u) return null;
    const ageMs = Date.now() - (parsed.t ?? 0);
    if (ageMs > 30 * 24 * 60 * 60_000) return null;
    return { u: parsed.u, ageMs };
  } catch {
    return null;
  }
}

export interface RegisterResult {
  id: string;
  email: string;
  status: string;
  verificationToken?: string;
  verificationRequired?: boolean;
}

export function register(input: { email: string; password: string; fullName?: string }): Promise<RegisterResult> {
  return request<RegisterResult>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(input) });
}

export async function login(input: { email: string; password: string }): Promise<void> {
  await request<{ userId: string }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(input) });
  // The server accepted the credentials and set the session cookie. Mark the
  // client as authenticated immediately (it survives the /me round-trip) and
  // pre-warm the cached user so the header reflects the signed-in state
  // instantly instead of flashing the logged-out UI while the Worker responds.
  knownAuthenticated = true;
  try {
    const me = await getMe();
    if (me) knownAuthenticated = true;
  } catch {
    // Transient network blip — the next /me settles it. Never fail login here.
  }
}

export async function logout(): Promise<void> {
  knownAuthenticated = false;
  clearCachedUser();
  await request<{ success: boolean }>("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
}

export async function verifyEmail(input: { token?: string; code?: string }): Promise<void> {
  await request<{ verified: boolean }>("/api/v1/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function resendVerification(email: string): Promise<{
  requested: boolean;
  verificationToken?: string;
  status?: string;
  emailVerified?: boolean;
}> {
  return request("/api/v1/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function requestPasswordReset(email: string): Promise<{
  requested: boolean;
  resetToken?: string;
}> {
  return request("/api/v1/auth/request-password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await request<{ reset: boolean }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password: newPassword }),
  });
}

// Tiny auth-change bus so signing in/out anywhere refreshes session state.
const listeners = new Set<() => void>();
export function onAuthChange(fn: () => void): () => void {
  if (typeof fn !== "function") return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emitAuthChange(): void {
  listeners.forEach((fn) => {
    if (typeof fn === "function") fn();
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("taxlien-auth-change"));
  }
}

// Optimistic auth gate for the authenticated layout: once the backend has
// verified the session, dashboard navigation skips the round-trip. Cleared on
// logout() and whenever the backend answers 401.
export let knownAuthenticated = false;
export function markAuthenticated(value: boolean): void {
  knownAuthenticated = value;
}