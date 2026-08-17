import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>);
  }
  return _app;
}

export async function getFirebaseAuth(): Promise<Auth> {
  if (!_auth) {
    const { getAuth } = await import("firebase/auth");
    _auth = getAuth(getFirebaseApp());
  }
  return _auth;
}

// Firestore accessor — foundation for wiring real data later; currently unused
// while the data layer is served by the in-memory mock.
export async function getFirestoreDb(): Promise<Firestore> {
  if (!_db) {
    const { getFirestore } = await import("firebase/firestore");
    _db = getFirestore(getFirebaseApp());
  }
  return _db;
}
