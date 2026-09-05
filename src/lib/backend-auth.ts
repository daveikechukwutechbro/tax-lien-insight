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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const envelope = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (envelope && envelope.success === false) {
    throw new AuthError(
      envelope.error?.code ?? "API_ERROR",
      envelope.error?.message ?? "Request failed",
      res.status,
      envelope.error?.details,
    );
  }
  if (!envelope || !envelope.success) {
    throw new AuthError("API_ERROR", "Unexpected server response", res.status);
  }
  return envelope.data as T;
}

export async function getMe(): Promise<BackendUser | null> {
  try {
    return await request<BackendUser>("/api/v1/me");
  } catch (err) {
    if (err instanceof AuthError && (err.status === 401 || err.status === 403)) return null;
    throw err;
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
}

export async function logout(): Promise<void> {
  await request<{ success: boolean }>("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
}

export async function verifyEmail(token: string): Promise<void> {
  await request<{ verified: boolean }>("/api/v1/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
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
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emitAuthChange(): void {
  listeners.forEach((fn) => fn());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("taxlien-auth-change"));
  }
}