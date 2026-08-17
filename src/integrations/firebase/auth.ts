// Firebase Auth adapter that mirrors the auth surface the app uses
// (getUser/getSession/onAuthStateChange/signInWithPassword/signUp/signOut/
// setSession/getClaims). Swap into src/integrations/firebase/client.ts when real
// identity is required. Auth = Firebase; data still comes from the mock layer
// until a real Firestore backend is wired up.

import type { User, Session } from "./types";

type AuthChangeEvent = "INITIAL_SESSION" | "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED" | "TOKEN_REFRESHED";
type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

let listeners: AuthListener[] = [];

function emit(event: AuthChangeEvent, session: Session | null) {
  for (const cb of listeners) cb(event, session);
}

function toUser(fbUser: {
  uid: string;
  email: string | null;
  displayName: string | null;
  metadata: { creationTime?: string; lastSignInTime?: string };
}): User {
  const email = fbUser.email ?? "";
  return {
    id: fbUser.uid,
    aud: "authenticated",
    role: "authenticated",
    email: email || null,
    email_confirmed_at: null,
    phone: null,
    confirmed_at: null,
    last_sign_in_at: fbUser.metadata.lastSignInTime ?? null,
    app_metadata: { provider: "firebase" },
    user_metadata: {
      full_name: fbUser.displayName ?? (email.split("@")[0] || "Bidder"),
    },
    identities: [],
    created_at: fbUser.metadata.creationTime ?? new Date().toISOString(),
    updated_at: fbUser.metadata.lastSignInTime ?? new Date().toISOString(),
    is_anonymous: false,
  } as unknown as User;
}

async function toSession(
  fbUser: NonNullable<Awaited<ReturnType<typeof getUserInternal>>>,
): Promise<Session> {
  const now = Math.floor(Date.now() / 1000);
  let accessToken = "firebase-access-token";
  let refreshToken = "firebase-refresh-token";
  try {
    accessToken = await fbUser.getIdToken();
  } catch {
    // token unavailable
  }
  try {
    refreshToken = (fbUser as { refreshToken?: string }).refreshToken ?? refreshToken;
  } catch {
    // refresh token unavailable
  }
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    user: toUser(fbUser),
  } as Session;
}

async function getUserInternal() {
  const { getFirebaseAuth } = await import("./index");
  const auth = await getFirebaseAuth();
  return auth.currentUser;
}

async function getSessionInternal(): Promise<Session | null> {
  const fu = await getUserInternal();
  if (!fu) return null;
  return toSession(fu);
}

// Ensure the mock data layer has rows scoped to a real Firebase user id so the
// dashboard isn't empty on first sign-in.
async function seedDataForUser(userId: string, email?: string | null) {
  try {
    const { seedFirebaseUser } = await import("./mock");
    await seedFirebaseUser(userId, email ?? undefined);
  } catch {
    // ignore
  }
}

export const firebaseAuth = {
  async getSession(): Promise<{ data: { session: Session | null }; error: null }> {
    if (typeof window === "undefined") return { data: { session: null }, error: null };
    return { data: { session: await getSessionInternal() }, error: null };
  },

  async getUser(): Promise<{ data: { user: User | null }; error: null }> {
    if (typeof window === "undefined") return { data: { user: null }, error: null };
    const fu = await getUserInternal();
    return { data: { user: fu ? toUser(fu) : null }, error: null };
  },

  onAuthStateChange(cb: AuthListener) {
    if (typeof window === "undefined") {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    import("./index").then(({ getFirebaseAuth }) =>
      getFirebaseAuth().then((auth) => {
        auth.onAuthStateChanged(async (fu) => {
          if (fu) {
            const sess = await toSession(fu);
            await seedDataForUser(fu.uid, fu.email);
            emit("SIGNED_IN", sess);
          } else {
            emit("SIGNED_OUT", null);
          }
        });
      }),
    );
    listeners.push(cb);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            listeners = listeners.filter((l) => l !== cb);
          },
        },
      },
    };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    if (typeof window === "undefined") return { data: { user: null, session: null }, error: new Error("Not available on server") };
    try {
      const { getFirebaseAuth } = await import("./index");
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const auth = await getFirebaseAuth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userId = cred.user.uid;
      await seedDataForUser(userId, cred.user.email);
      const session = await toSession(cred.user);
      emit("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    } catch (err) {
      return { data: null, error: normalizeError(err) };
    }
  },

  async signUp({ email, password }: { email: string; password: string }) {
    if (typeof window === "undefined") return { data: { user: null, session: null }, error: new Error("Not available on server") };
    try {
      const { getFirebaseAuth } = await import("./index");
      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      const auth = await getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const userId = cred.user.uid;
      await seedDataForUser(userId, cred.user.email);
      const session = await toSession(cred.user);
      emit("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    } catch (err) {
      return { data: null, error: normalizeError(err) };
    }
  },

  async signInWithGoogle() {
    if (typeof window === "undefined") return { data: { user: null, session: null }, error: new Error("Not available on server") };
    try {
      const { getFirebaseAuth } = await import("./index");
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const auth = await getFirebaseAuth();
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const userId = cred.user.uid;
      await seedDataForUser(userId, cred.user.email);
      const session = await toSession(cred.user);
      emit("SIGNED_IN", session);
      return { data: { user: session.user, session }, error: null };
    } catch (err) {
      return { data: null, error: normalizeError(err) };
    }
  },

  async signOut() {
    try {
      const { getFirebaseAuth } = await import("./index");
      const { signOut } = await import("firebase/auth");
      const auth = await getFirebaseAuth();
      await signOut(auth);
      emit("SIGNED_OUT", null);
      return { error: null };
    } catch (err) {
      return { error: normalizeError(err) };
    }
  },

  async setSession(_session?: unknown) {
    const session = await getSessionInternal();
    return { data: { session }, error: null };
  },

  async getClaims(): Promise<{ data: { claims: { sub: string; role: string } }; error: null }> {
    const fu = await getUserInternal();
    return { data: { claims: { sub: fu?.uid ?? "", role: "authenticated" } }, error: null };
  },

  async getAdminToken() {
    return { data: { token: null }, error: null };
  },

  async installAuth() {
    return {} as never;
  },
};

function normalizeError(err: unknown): { message: string; status?: string } {
  const message = err instanceof Error ? err.message : String(err);
  return { message, status: "error" };
}
