import { getPool, type TxClient } from "../db/pool.js";
import type { LogMeta } from "../shared/logger.js";

export interface AuditInput {
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  requestId?: string;
  beforeJson?: Record<string, unknown>;
  afterJson?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAudit(client: TxClient | null, input: AuditInput): Promise<void> {
  const q = client ?? getPool();
  await q.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, request_id, before_json, after_json, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      input.actorUserId ?? null,
      input.action,
      input.entityType ?? null,
      input.entityId ?? null,
      input.requestId ?? null,
      input.beforeJson ? JSON.stringify(input.beforeJson) : null,
      input.afterJson ? JSON.stringify(input.afterJson) : null,
      input.ipAddress ?? null,
      input.userAgent ?? null,
    ],
  );
}

export async function recordAdminAction(opts: {
  actorUserId: string;
  action: string;
  targetUserId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO admin_actions (actor_user_id, action, target_user_id, reason, metadata) VALUES ($1,$2,$3,$4,$5)`,
    [
      opts.actorUserId,
      opts.action,
      opts.targetUserId ?? null,
      opts.reason ?? null,
      JSON.stringify(opts.metadata ?? {}),
    ],
  );
}

export async function listAudit(filters: { action?: string; entityType?: string; page?: number; pageSize?: number }) {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (filters.action) {
    where.push(`action = $${i++}`);
    params.push(filters.action);
  }
  if (filters.entityType) {
    where.push(`entity_type = $${i++}`);
    params.push(filters.entityType);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const { rows } = await getPool().query(
    `SELECT id, actor_user_id, action, entity_type, entity_id, timestamp FROM audit_logs ${whereSql} ORDER BY timestamp DESC LIMIT $${i++} OFFSET $${i++}`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return rows;
}
