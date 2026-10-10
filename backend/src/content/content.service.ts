import { getPool } from "../db/pool.js";
import { NotFoundError } from "../shared/errors.js";

export interface SiteContent {
  slug: string;
  body: Record<string, unknown>;
  updatedAt: string | null;
  updatedBy: string | null;
}

export const DEFAULT_CONTENT_SLUGS = [
  "settings",
  "home",
  "how-it-works",
  "faq",
  "rates",
  "resources",
  "support",
  "about",
];

export async function getSiteContent(slug: string): Promise<SiteContent | null> {
  const { rows } = await getPool().query(
    `SELECT slug, body, updated_at, updated_by FROM site_content WHERE slug = $1`,
    [slug],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    slug: row.slug,
    body: row.body ?? {},
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    updatedBy: row.updated_by ?? null,
  };
}

export async function upsertSiteContent(
  slug: string,
  body: Record<string, unknown>,
  actorUserId: string,
): Promise<SiteContent> {
  const { rows } = await getPool().query(
    `INSERT INTO site_content (slug, body, updated_at, updated_by)
     VALUES ($1, $2, now(), $3)
     ON CONFLICT (slug)
     DO UPDATE SET body = EXCLUDED.body, updated_at = now(), updated_by = EXCLUDED.updated_by
     RETURNING slug, body, updated_at, updated_by`,
    [slug, JSON.stringify(body ?? {}), actorUserId],
  );
  const row = rows[0];
  return {
    slug: row.slug,
    body: row.body ?? {},
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    updatedBy: row.updated_by ?? null,
  };
}

export async function listSiteContent(): Promise<SiteContent[]> {
  const { rows } = await getPool().query(
    `SELECT slug, body, updated_at, updated_by FROM site_content ORDER BY slug`,
  );
  return rows.map((r) => ({
    slug: r.slug,
    body: r.body ?? {},
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
    updatedBy: r.updated_by ?? null,
  }));
}

export async function checkContentSlug(slug: string): Promise<void> {
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) throw new NotFoundError("Invalid content slug");
}