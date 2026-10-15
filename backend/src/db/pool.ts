/**
 * Runtime-adaptive PostgreSQL access.
 *
 * - Cloudflare Workers -> @neondatabase/serverless (WebSocket pooling; fully
 *   supports interactive BEGIN/COMMIT transactions, isolation levels and
 *   SELECT ... FOR UPDATE, so the bid engine's concurrency model is preserved).
 * - Node (dev server, CLIs, tests) -> node-postgres (`pg`).
 *
 * The runtime is detected once at module load; `getPool()` stays synchronous
 * for every service thanks to top-level await.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";

// Structural interfaces so both drivers satisfy the same contract without
// leaking driver-specific types across the codebase.
export interface DbQueryResult<R = any> {
  rows: R[];
  rowCount: number | null;
}

export interface DbClient {
  query<R = any>(text: string, params?: unknown[]): Promise<DbQueryResult<R>>;
  release(): void;
}

export interface DbPool {
  query<R = any>(text: string, params?: unknown[]): Promise<DbQueryResult<R>>;
  connect(): Promise<DbClient>;
  end(): Promise<void>;
  on(event: string, listener: (err: Error) => void): void;
}

export function isCloudflareWorkers(): boolean {
  return typeof (globalThis as Record<string, unknown>).WebSocketPair !== "undefined";
}

async function createPool(quiet = false): Promise<DbPool> {
  if (isCloudflareWorkers()) {
    const neon = await import("@neondatabase/serverless");
    // Workers ship a native WebSocket global.
    neon.neonConfig.webSocketConstructor = (globalThis as { WebSocket: unknown }).WebSocket as never;
    // Serverless runtime: keep the connection ceiling low.
    const pool = new neon.Pool({
      connectionString: config.databaseUrl,
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    if (!quiet) logger.info("Database pool ready (driver=neon-serverless)");
    return pool as unknown as DbPool;
  }
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on("error", (err: Error) => {
    logger.error("Unexpected PostgreSQL pool error", { errorCode: (err as { code?: string }).code });
  });
  if (!quiet) logger.info("Database pool ready (driver=node-postgres)");
  return pool as unknown as DbPool;
}

const _pool: DbPool = await createPool();

let poolOverride: DbPool | null = null;

// On Cloudflare Workers, WebSocket connections (and other I/O objects) are bound
// to the request that created them and cannot be reused by another request.
// The Neon pool therefore must be created per-request; we scope it with
// AsyncLocalStorage so the synchronous `getPool()` everywhere keeps working.
const requestPools = new AsyncLocalStorage<DbPool>();

/** Create a fresh pool for a single request (Workers only). */
export async function createRequestPool(): Promise<DbPool> {
  return createPool(true);
}

/** Run `fn` with `pool` as the active database pool for the current async context. */
export function runWithPool<T>(pool: DbPool, fn: () => Promise<T>): Promise<T> {
  return requestPools.run(pool, fn);
}

/** Shared application pool. Safe to call synchronously anywhere after import. */
export function getPool(): DbPool {
  return requestPools.getStore() ?? poolOverride ?? _pool;
}

/** Allow tests / pg-mem to inject a custom pool. */
export function setPool(custom: DbPool): void {
  poolOverride = custom;
}

export async function query<R = any>(
  text: string,
  params: unknown[] = [],
): Promise<DbQueryResult<R>> {
  return getPool().query<R>(text, params);
}

export async function closePool(): Promise<void> {
  await _pool.end();
}

// ---------------------------------------------------------------------------
// Transaction helper with configurable isolation + row locking utility.
// Works identically over both drivers because each query in the transaction
// runs on the same dedicated client/connection.
// ---------------------------------------------------------------------------
export type TxClient = DbClient;

export async function transaction<T>(
  fn: (client: TxClient) => Promise<T>,
  isolation: "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE" = "READ COMMITTED",
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** SELECT ... FOR UPDATE — row-level lock used for financial concurrency safety. */
export function forUpdate(opts: { skipLocked?: boolean; noWait?: boolean } = {}): string {
  let s = "FOR UPDATE";
  if (opts.noWait) s += " NOWAIT";
  else if (opts.skipLocked) s += " SKIP LOCKED";
  return s;
}
