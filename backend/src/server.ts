import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createApp } from "./api/index.js";
import { config } from "./shared/config.js";
import { logger } from "./shared/logger.js";
import { runMigrations } from "./db/migrate.js";

const app = createApp();

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const host = req.headers.host ?? "localhost";
  const url = `http://${host}${req.url ?? "/"}`;
  let body: Buffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    body = Buffer.concat(chunks);
  }
  const request = new Request(url, {
    method: req.method ?? "GET",
    headers: req.headers as any,
    body: body ? body : undefined,
  });
  try {
    const response = await app.fetch(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    logger.error("Server error", { errorCode: (err as Error).message });
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}

const server = createServer((req, res) => {
  handle(req, res).catch(() => {
    res.statusCode = 500;
    res.end("Internal Server Error");
  });
});

async function main() {
  logger.info("Starting Tax Lien Insight backend", { port: config.port, env: config.environment });
  server.listen(config.port, () => logger.info(`Backend listening on :${config.port}`));
}

if (process.env.RUN_MIGRATIONS === "true") {
  runMigrations()
    .then(() => main())
    .catch((err) => {
      logger.error("Migration failed", { errorCode: (err as Error).message });
      process.exit(1);
    });
} else {
  main();
}
