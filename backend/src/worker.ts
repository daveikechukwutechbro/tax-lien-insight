/**
 * Cloudflare Workers entry point for the Tax Lien Insight backend.
 *
 * Deploy: npx wrangler deploy   (from backend/, see DEPLOYMENT-cloudflare.md)
 * Secrets are injected as Workers secrets/vars — never committed here.
 */
import { createApp } from "./api/index.js";

const app = createApp();

export default {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request);
  },
};
