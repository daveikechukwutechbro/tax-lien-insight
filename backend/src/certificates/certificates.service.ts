import { getPool, transaction } from "../db/pool.js";
import { NotFoundError, ConflictError, AppError, ForbiddenError } from "../shared/errors.js";
import { randomBytes, createHash } from "node:crypto";
import { getStorageProvider } from "../providers/storage/index.js";
import { sendEmail } from "../providers/email/index.js";
import type { Cents } from "../shared/api.js";
import type { CertificateState } from "../shared/constants.js";

function token(): string {
  return randomBytes(24).toString("hex");
}
function hash(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export async function issueCertificate(input: {
  auctionLotId?: string;
  propertyId?: string;
  jurisdictionId?: string;
  holderId: string;
  principalAmount: Cents;
  winningInterestRate: number;
  saleDate?: string;
  redeemByDate?: string;
}): Promise<string> {
  const certificateNumber = `TLI-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const verificationToken = token();
  const verificationHash = hash(`${certificateNumber}:${verificationToken}`);
  return transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO certificates
         (certificate_number, auction_lot_id, property_id, jurisdiction_id, holder_id, principal_amount, winning_interest_rate, sale_date, redeem_by_date, status, verification_hash, verification_token, issue_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'issued',$10,$11,now()) RETURNING id`,
      [
        certificateNumber,
        input.auctionLotId ?? null,
        input.propertyId ?? null,
        input.jurisdictionId ?? null,
        input.holderId,
        input.principalAmount,
        input.winningInterestRate,
        input.saleDate ?? null,
        input.redeemByDate ?? null,
        verificationHash,
        verificationToken,
      ],
    );
    const certId = rows[0].id as string;
    await client.query(
      `INSERT INTO certificate_events (certificate_id, event_type, actor_id, payload) VALUES ($1,'issued',NULL,$2)`,
      [certId, JSON.stringify({ certificateNumber })],
    );
    await sendEmail({
      template: "certificate",
      to: input.holderId,
      variables: { certificateNumber },
    }).catch(() => {});
    return certId;
  });
}

/** Public, safe verification — only returns non-sensitive fields. */
export async function verifyCertificate(certificateNumber: string, verificationToken?: string) {
  const { rows } = await getPool().query(
    `SELECT id, certificate_number, status, jurisdiction_id, principal_amount, winning_interest_rate, sale_date, issue_date, redeem_by_date, holder_id
     FROM certificates WHERE certificate_number = $1`,
    [certificateNumber],
  );
  const cert = rows[0];
  if (!cert) throw new NotFoundError("Certificate not found", { code: "CERTIFICATE_NOT_FOUND" });
  if (verificationToken && cert.verification_token !== verificationToken) {
    throw new ForbiddenError("Invalid verification token");
  }
  if (cert.status === "revoked") throw new AppError("CERTIFICATE_REVOKED", "Certificate revoked", 410);
  return {
    certificateNumber: cert.certificate_number,
    status: cert.status,
    jurisdictionId: cert.jurisdiction_id,
    principalAmount: Number(cert.principal_amount),
    winningInterestRate: Number(cert.winning_interest_rate),
    saleDate: cert.sale_date,
    issueDate: cert.issue_date,
    redeemByDate: cert.redeem_by_date,
    verified: true,
  };
}

export async function revokeCertificate(certificateId: string, actorId: string, reason: string): Promise<void> {
  await transaction(async (client) => {
    const { rows } = await client.query(`SELECT id, status FROM certificates WHERE id = $1 FOR UPDATE`, [certificateId]);
    if (!rows[0]) throw new NotFoundError("Certificate not found");
    if (rows[0].status === "redeemed") throw new ConflictError("Cannot revoke a redeemed certificate");
    await client.query(`UPDATE certificates SET status='revoked', updated_at=now() WHERE id=$1`, [certificateId]);
    await client.query(
      `INSERT INTO certificate_events (certificate_id, event_type, actor_id, payload) VALUES ($1,'revoked',$2,$3)`,
      [certificateId, actorId, JSON.stringify({ reason })],
    );
  });
}

/** Server-side certificate document (HTML; production converts to PDF via a PDF library). */
export async function generateCertificateDocument(certificateId: string): Promise<string> {
  const { rows } = await getPool().query(`SELECT * FROM certificates WHERE id = $1`, [certificateId]);
  const cert = rows[0];
  if (!cert) throw new NotFoundError("Certificate not found");
  const html = `
    <html><body style="font-family:sans-serif">
      <h1>Tax Lien Certificate</h1>
      <p>Certificate #: ${cert.certificate_number}</p>
      <p>Principal: $${Number(cert.principal_amount) / 100}</p>
      <p>Interest Rate: ${cert.winning_interest_rate}%</p>
      <p>Sale Date: ${cert.sale_date ?? "n/a"}</p>
      <p>Redeem By: ${cert.redeem_by_date ?? "n/a"}</p>
      <p>Verify: ${process.env.APP_URL ?? ""}/verify/certificate?number=${cert.certificate_number}&token=${cert.verification_token}</p>
    </body></html>`;
  const storageKey = `certificates/${cert.certificate_number}.html`;
  await getStorageProvider().putObject(storageKey, Buffer.from(html), "text/html");
  await getPool().query(`UPDATE certificates SET pdf_storage_path=$1 WHERE id=$2`, [storageKey, certificateId]);
  return storageKey;
}

export async function listCertificates(filters: { holderId?: string; jurisdictionId?: string; status?: CertificateState }) {
  const where: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (filters.holderId) {
    where.push(`holder_id = $${i++}`);
    params.push(filters.holderId);
  }
  if (filters.jurisdictionId) {
    where.push(`jurisdiction_id = $${i++}`);
    params.push(filters.jurisdictionId);
  }
  if (filters.status) {
    where.push(`status = $${i++}`);
    params.push(filters.status);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await getPool().query(
    `SELECT id, certificate_number, holder_id, jurisdiction_id, principal_amount, winning_interest_rate, status, issue_date FROM certificates ${whereSql} ORDER BY created_at DESC`,
    params,
  );
  return rows;
}
