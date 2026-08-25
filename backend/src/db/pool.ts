import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { config } from "../shared/config.js";
import { logger } from "../shared/logger.js";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => {
      logger.error("Unexpected PostgreSQL pool error", { errorCode: (err as { code?: string }).code });
    });
  }
  return pool;
}

/** Allow tests / pg-mem to inject a custom pool. */
export function setPool(custom: Pool): void {
  pool = custom;
}

export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<R>> {
  return getPool().query<R>(text, params as unknown[]);
}

export async function closePool(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
}

// ---------------------------------------------------------------------------
// Transaction helper with configurable isolation + row locking utility.
// ---------------------------------------------------------------------------
export type TxClient = PoolClient;

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
