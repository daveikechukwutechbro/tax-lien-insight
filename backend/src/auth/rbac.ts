import { getPool, transaction, type TxClient } from "../db/pool.js";
import { ForbiddenError, NotFoundError } from "../shared/errors.js";
import type { Permission, Role } from "../shared/constants.js";

export interface AuthContext {
  userId: string;
  roles: Role[];
  permissions: Set<Permission>;
}

export async function getUserRoles(userId: string): Promise<Role[]> {
  const { rows } = await getPool().query<{ name: string }>(
    `SELECT r.name FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.name as Role);
}

export async function getUserPermissions(userId: string): Promise<Set<Permission>> {
  const { rows } = await getPool().query<{ name: string }>(
    `SELECT DISTINCT p.name FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1`,
    [userId],
  );
  return new Set(rows.map((r) => r.name as Permission));
}

export async function getAuthContext(userId: string): Promise<AuthContext> {
  const [roles, permissions] = await Promise.all([getUserRoles(userId), getUserPermissions(userId)]);
  return { userId, roles, permissions };
}

export function assertPermission(ctx: AuthContext, permission: Permission): void {
  if (!ctx.permissions.has(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}

export function assertRole(ctx: AuthContext, roles: Role[]): void {
  if (!roles.some((r) => ctx.roles.includes(r))) {
    throw new ForbiddenError(`Requires one of roles: ${roles.join(", ")}`);
  }
}

export async function assignRole(
  userId: string,
  role: Role,
  grantedBy: string,
  client?: TxClient,
): Promise<void> {
  const q = client ?? getPool();
  const { rows } = await q.query<{ id: string }>(`SELECT id FROM roles WHERE name = $1`, [role]);
  if (!rows[0]) throw new NotFoundError(`Role ${role} not found`);
  await q.query(
    `INSERT INTO user_roles (user_id, role_id, granted_by) VALUES ($1,$2,$3)
     ON CONFLICT DO NOTHING`,
    [userId, rows[0].id, grantedBy],
  );
}

export async function revokeRole(userId: string, role: Role, client?: TxClient): Promise<void> {
  const q = client ?? getPool();
  const { rows } = await q.query<{ id: string }>(`SELECT id FROM roles WHERE name = $1`, [role]);
  if (!rows[0]) return;
  await q.query(`DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`, [userId, rows[0].id]);
}

export function isAdmin(ctx: AuthContext): boolean {
  return ctx.roles.includes("admin") || ctx.roles.includes("super_admin");
}
