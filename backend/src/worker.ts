/**
 * Cloudflare Workers entry point for the Tax Lien Insight backend.
 *
 * Deploy: npx wrangler deploy   (from backend/, see DEPLOYMENT-cloudflare.md)
 * Secrets are injected as Workers secrets/vars — never committed here.
 */
import { createApp } from "./api/index.js";
import { createRequestPool, runWithPool } from "./db/pool.js";

const app = createApp();

interface ExecutionCtx {
  waitUntil(promise: Promise<unknown>): void;
}

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionCtx): Promise<Response> {
    // Workers forbid reusing I/O objects (Neon's WebSocket connections) across
    // requests, so every request gets its own pool, closed once it is done.
    const pool = await createRequestPool();
    return runWithPool(pool, async () => {
      try {
        const res = await app.fetch(request);
        ctx.waitUntil(pool.end().catch(() => {}));
        return res;
      } catch (err) {
        await pool.end().catch(() => {});
        throw err;
      }
    });
  },

  // Fires every minute to keep the isolate and the Neon compute warm.
  async scheduled(_event: unknown, _env: unknown, ctx: ExecutionCtx): Promise<void> {
    const pool = await createRequestPool();
    ctx.waitUntil(
      (async () => {
        try {
          await pool.query("SELECT 1");
        } catch {
          // best-effort keep-warm; never let a failure surface
        } finally {
          await pool.end().catch(() => {});
        }
      })(),
    );
  },
};
