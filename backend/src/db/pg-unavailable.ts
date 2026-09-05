/**
 * Bundling stub. On Cloudflare Workers the `pg` package cannot run (no raw
 * TCP without Hyperdrive), and `wrangler.jsonc` aliases "pg" to this module so
 * esbuild never bundles node-postgres into the worker. The live code path on
 * Workers uses @neondatabase/serverless instead (see db/pool.ts).
 */
export class Pool {
  constructor() {
    throw new Error(
      "[tax-lien-insight] 'pg' is unavailable on Cloudflare Workers. The Neon serverless driver is used in that runtime (db/pool.ts). If you see this error at runtime, a code path imported pg directly.",
    );
  }
}
export default { Pool };
