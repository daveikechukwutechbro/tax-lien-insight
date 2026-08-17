// Local auth/session types the app depends on (Firebase-backed).

export type AuthChangeEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "USER_UPDATED"
  | "TOKEN_REFRESHED";

export interface User {
  id: string;
  aud: string;
  role: string | null;
  email: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  confirmed_at: string | null;
  last_sign_in_at: string | null;
  app_metadata: Record<string, unknown> & { provider?: string };
  user_metadata: Record<string, unknown> & { full_name?: string };
  identities: unknown[];
  created_at: string;
  updated_at: string;
  is_anonymous: boolean;
  [key: string]: unknown;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: User;
  [key: string]: unknown;
}

// Mirrors of the legacy Postgres enum columns (used by a couple of admin
// routes that previously read Database["public"]["Enums"]).
export type AuctionStatus = "draft" | "scheduled" | "live" | "closed" | "canceled";
export type LienStatus = "active" | "redeemed" | "canceled" | "expired";
