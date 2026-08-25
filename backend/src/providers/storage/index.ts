import { getPool } from "../../db/pool.js";
import { config } from "../../shared/config.js";
import { ConfigurationError } from "../../shared/errors.js";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../../shared/logger.js";

export interface StorageProvider {
  readonly name: string;
  putObject(key: string, body: Buffer, mimeType: string): Promise<{ key: string }>;
  getSignedUrl(key: string, expiresSeconds: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  readonly name = "local-dev";
  private root = join(process.cwd(), ".storage");
  async putObject(key: string, body: Buffer, _mime: string) {
    await mkdir(join(this.root, ...key.split("/").slice(0, -1)), { recursive: true });
    await writeFile(join(this.root, key), body);
    return { key };
  }
  async getSignedUrl(key: string) {
    // Local dev: direct file path is not a real signed URL; flagged dev-only.
    return `local://${key}`;
  }
  async deleteObject(key: string) {
    await unlink(join(this.root, key)).catch(() => {});
  }
}

// S3-compatible scaffold. Enabled only when OBJECT_STORAGE_* are present.
class S3StorageProvider implements StorageProvider {
  readonly name = "s3";
  constructor(
    private endpoint: string,
    private bucket: string,
    private accessKey: string,
    private secretKey: string,
  ) {}
  async putObject(key: string, body: Buffer, mimeType: string) {
    const url = `${this.endpoint}/${this.bucket}/${key}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body,
    });
    if (!res.ok) throw new ConfigurationError("Object storage put failed");
    return { key };
  }
  async getSignedUrl(key: string, expiresSeconds: number) {
    // A production implementation would use SigV4 signed URLs.
    return `${this.endpoint}/${this.bucket}/${key}?expires=${expiresSeconds}`;
  }
  async deleteObject(key: string) {
    const res = await fetch(`${this.endpoint}/${this.bucket}/${key}`, { method: "DELETE" });
    if (!res.ok) throw new ConfigurationError("Object storage delete failed");
  }
}

let provider: StorageProvider | null = null;
export function getStorageProvider(): StorageProvider {
  if (provider) return provider;
  if (config.objectStorageBucket && config.objectStorageAccessKey) {
    provider = new S3StorageProvider(
      config.objectStorageEndpoint,
      config.objectStorageBucket,
      config.objectStorageAccessKey,
      config.objectStorageSecretKey,
    );
  } else {
    provider = new LocalStorageProvider();
    logger.warn("Object storage NOT_CONFIGURED — using local-dev storage (NOT for production)", {
      provider: "local-dev",
    });
  }
  return provider;
}

export async function storeDocument(opts: {
  ownerId: string | null;
  resourceType: string;
  resourceId: string | null;
  accessScope: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  body: Buffer;
}): Promise<string> {
  const storageKey = `${opts.resourceType}/${opts.resourceId ?? randomUUID()}/${randomUUID()}`;
  await getStorageProvider().putObject(storageKey, opts.body, opts.mimeType);
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO documents (owner_id, resource_type, resource_id, access_scope, mime_type, size_bytes, checksum, storage_key, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active') RETURNING id`,
    [
      opts.ownerId,
      opts.resourceType,
      opts.resourceId,
      opts.accessScope,
      opts.mimeType,
      opts.sizeBytes,
      opts.checksum,
      storageKey,
    ],
  );
  return rows[0].id;
}
