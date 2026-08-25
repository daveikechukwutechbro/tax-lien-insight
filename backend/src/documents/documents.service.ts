import { getPool } from "../db/pool.js";
import { NotFoundError, ForbiddenError, AppError } from "../shared/errors.js";
import { isAdmin, type AuthContext } from "../auth/rbac.js";
import { getStorageProvider } from "../providers/storage/index.js";
import type { DocumentAccessScope } from "../shared/constants.js";

interface DocRow {
  id: string;
  owner_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  access_scope: DocumentAccessScope;
  storage_key: string;
}

export async function canAccessDocument(ctx: AuthContext | null, doc: DocRow): Promise<boolean> {
  switch (doc.access_scope) {
    case "public":
      return true;
    case "owner_only":
      return !!ctx && ctx.userId === doc.owner_id;
    case "admin_only":
    case "system_internal":
      return !!ctx && isAdmin(ctx);
    case "kyc_sensitive":
      return !!ctx && (isAdmin(ctx) || ctx.roles.includes("kyc_reviewer") || ctx.roles.includes("compliance_officer"));
    case "support_only":
      return (
        !!ctx &&
        (isAdmin(ctx) || ctx.roles.includes("support_agent") || ctx.roles.includes("auditor"))
      );
    case "certificate_holder": {
      if (!ctx || !doc.resource_id) return false;
      const { rows } = await getPool().query(
        `SELECT holder_id FROM certificates WHERE id = $1 AND holder_id = $2`,
        [doc.resource_id, ctx.userId],
      );
      return rows.length > 0 || (isAdmin(ctx) as boolean);
    }
    case "auction_participants": {
      if (!ctx || !doc.resource_id) return false;
      const { rows } = await getPool().query(
        `SELECT 1 FROM auction_registrations WHERE auction_id = $1 AND user_id = $2 AND status='approved'`,
        [doc.resource_id, ctx.userId],
      );
      return rows.length > 0 || (isAdmin(ctx) as boolean);
    }
    default:
      return false;
  }
}

export async function getDocumentUrl(documentId: string, ctx: AuthContext | null): Promise<string> {
  const { rows } = await getPool().query(`SELECT * FROM documents WHERE id = $1`, [documentId]);
  const doc = rows[0] as DocRow | undefined;
  if (!doc) throw new NotFoundError("Document not found");
  if (!(await canAccessDocument(ctx, doc))) {
    throw new ForbiddenError("Access denied to document", { code: "DOCUMENT_ACCESS_DENIED" });
  }
  const url = await getStorageProvider().getSignedUrl(doc.storage_key, 300);
  await getPool().query(
    `INSERT INTO document_access_logs (document_id, actor_id, action, ip_address, user_agent) VALUES ($1,$2,'signed_url','server','server')`,
    [documentId, ctx?.userId ?? null],
  );
  return url;
}

export async function logDocumentAccess(documentId: string, actorId: string | null, action: "viewed" | "downloaded") {
  await getPool().query(
    `INSERT INTO document_access_logs (document_id, actor_id, action, ip_address, user_agent) VALUES ($1,$2,$3,'server','server')`,
    [documentId, actorId ?? null, action],
  );
}
