import { firebaseAuth } from './auth';
import { mockSupabase, isDemoMode } from './mock';
import { isFirebaseConfigured } from './index';

// Firebase-backed data/auth client.
//  - auth: real Firebase Auth when VITE_FIREBASE_* is configured, otherwise the
//    demo mock auth so the site stays fully browsable offline.
//  - data (from / rpc) and storage: served by the in-memory mock layer for local
//    dev. Real Firestore reads/writes + Firebase Storage slot in next; nothing
//    here ever touches Supabase.
/* eslint-disable @typescript-eslint/no-explicit-any */
// `data` is array-like for list queries and object-like for single-row returns
// (maybeSingle/rpc); the intersection lets `.map` callbacks receive a contextual
// `any` (no implicit-any errors) while property access stays permissive.
type Data = any[] & Record<string, any>;

export interface DataResult {
  data: Data;
  error: Error | null;
  count?: number;
}

export interface QueryBuilder {
  select(_cols?: string, _opts?: { count?: string; head?: boolean }): QueryBuilder;
  eq(_col: string, _value: unknown): QueryBuilder;
  neq(_col: string, _value: unknown): QueryBuilder;
  in(_col: string, _values: unknown[]): QueryBuilder;
  ilike(_col: string, _pattern: string): QueryBuilder;
  or(_expr: string): QueryBuilder;
  order(_col: string, _opts?: { ascending?: boolean }): QueryBuilder;
  limit(_n: number): QueryBuilder;
  maybeSingle(): QueryBuilder;
  single(): QueryBuilder;
  insert(_rows: unknown): QueryBuilder;
  update(_patch: unknown): QueryBuilder;
  delete(): QueryBuilder;
  then(on?: (v: DataResult) => unknown, onRejected?: (e: unknown) => unknown): Promise<DataResult>;
  catch(on?: (e: unknown) => unknown): Promise<DataResult>;
}

export interface StorageBucket {
  upload(_path: string, _file: unknown, _opts?: { upsert?: boolean }): Promise<{ data: { path: string } | null; error: Error | null }>;
  createSignedUrl(_path: string, _expiresIn?: number): Promise<{ data: { signedUrl: string } | null; error: Error | null }>;
  getPublicUrl(_path: string): { data: { publicUrl: string } };
}

export interface DataClient {
  from(_table: string): QueryBuilder;
  rpc(_fn: string, _args?: Record<string, unknown>): Promise<DataResult>;
  storage: { from(_bucket: string): StorageBucket };
  auth: typeof firebaseAuth;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const signUrl = (input: string): string =>
  /^https?:\/\//i.test(input) ? input : `https://example.com/storage/${encodeURIComponent(input)}`;

const mockStorage = {
  from(_bucket: string): StorageBucket {
    return {
      upload: async (path) => ({ data: { path }, error: null }),
      createSignedUrl: async (path) => ({ data: { signedUrl: signUrl(path) }, error: null }),
      getPublicUrl: (path) => ({ data: { publicUrl: signUrl(path) } }),
    };
  },
};

export const firebase: DataClient = new Proxy({} as DataClient, {
  get(_, prop, receiver) {
    // Demo mode: everything (auth + data + storage) comes from the in-memory mock.
    if (isDemoMode() && prop in mockSupabase) {
      return Reflect.get(mockSupabase, prop, receiver);
    }

    if (prop === 'auth') {
      if (isFirebaseConfigured()) return firebaseAuth;
      return Reflect.get(mockSupabase, 'auth', receiver);
    }

    if (prop === 'from' || prop === 'rpc') {
      return Reflect.get(mockSupabase, prop, receiver);
    }

    if (prop === 'storage') {
      return mockStorage;
    }

    // Any other access falls back to the mock surface.
    return Reflect.get(mockSupabase, prop, receiver);
  },
}) as DataClient;

// Backwards-compatible alias. All former `@/integrations/supabase/client`
// imports were repointed here, so existing `supabase.*` call sites keep working
// while the underlying implementation is now Firebase-backed.
export const supabase = firebase;
