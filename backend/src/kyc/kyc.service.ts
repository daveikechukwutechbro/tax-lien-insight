import { getPool, transaction } from "../db/pool.js";
import { NotFoundError, ValidationError } from "../shared/errors.js";
import { assertPermission, type AuthContext } from "../auth/rbac.js";
import { writeAudit } from "../audit/audit.service.js";

export async function submitKyc(
  userId: string,
  documents: { documentType: string; documentId?: string }[],
): Promise<string> {
  return transaction(async (client) => {
    let kycId: string;
    const existing = await client.query(`SELECT id FROM kyc_verifications WHERE user_id = $1`, [userId]);
    if (existing.rows[0]) {
      kycId = existing.rows[0].id as string;
      await client.query(
        `UPDATE kyc_verifications SET status='submitted', submitted_at=now(), metadata=metadata WHERE id=$1`,
        [kycId],
      );
    } else {
      const { rows } = await client.query(
        `INSERT INTO kyc_verifications (user_id, status, submitted_at) VALUES ($1,'submitted',now()) RETURNING id`,
        [userId],
      );
      kycId = rows[0].id as string;
    }
    for (const doc of documents) {
      await client.query(
        `INSERT INTO kyc_documents (kyc_verification_id, document_id, document_type) VALUES ($1,$2,$3)`,
        [kycId, doc.documentId ?? null, doc.documentType],
      );
    }
    await client.query(`UPDATE profiles SET kyc_status='submitted' WHERE user_id=$1`, [userId]);
    await client.query(
      `INSERT INTO kyc_events (kyc_verification_id, event_type, actor_id, payload) VALUES ($1,'submitted',$2,$3)`,
      [kycId, userId, JSON.stringify({ documentCount: documents.length })],
    );
    return kycId;
  });
}

export async function reviewKyc(
  kycId: string,
  approve: boolean,
  reviewer: AuthContext,
  reason?: string,
): Promise<void> {
  assertPermission(reviewer, "kyc.review");
  await transaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM kyc_verifications WHERE id = $1 FOR UPDATE`, [kycId]);
    if (!rows[0]) throw new NotFoundError("KYC verification not found");
    const kyc = rows[0];
    const status = approve ? "verified" : "rejected";
    await client.query(
      `UPDATE kyc_verifications SET status=$1, reviewed_at=now(), reviewed_by=$2, rejection_reason=$3, updated_at=now() WHERE id=$4`,
      [status, reviewer.userId, approve ? null : reason ?? null, kycId],
    );
    await client.query(`UPDATE profiles SET kyc_status=$1 WHERE user_id=$2`, [status, kyc.user_id]);
    await client.query(
      `INSERT INTO kyc_events (kyc_verification_id, event_type, actor_id, payload) VALUES ($1,$2,$3,$4)`,
      [kycId, approve ? "approved" : "rejected", reviewer.userId, JSON.stringify({ reason })],
    );
    await writeAudit(client, {
      actorUserId: reviewer.userId,
      action: approve ? "KYC_APPROVED" : "KYC_REJECTED",
      entityType: "kyc_verification",
      entityId: kycId,
      afterJson: { status },
    });
  });
}

export async function listKyc(filters: { status?: string }) {
  const where = filters.status ? `WHERE status = $1` : "";
  const params = filters.status ? [filters.status] : [];
  const { rows } = await getPool().query(
    `SELECT id, user_id, status, submitted_at, reviewed_at FROM kyc_verifications ${where} ORDER BY submitted_at DESC NULLS LAST`,
    params,
  );
  return rows;
}
