import { getPool } from "../db/pool.js";

export interface ActivityItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  at: string;
}

// Unified, time-sorted feed of everything important a user did.
// Each branch returns { id, kind, title, body, link, ts }.
const ACTIVITY_SQL = `
  WITH feed AS (
    SELECT n.id::text AS id, n.type AS kind, n.title,
           n.body AS body,
           n.payload->>'link' AS link,
           n.created_at AS ts
    FROM notifications n
    WHERE n.user_id = $1

    UNION ALL

    SELECT 'bid:' || b.id, 'BID_PLACED',
           CASE WHEN b.status = 'won' THEN 'Won an auction lot'
                WHEN b.status = 'outbid' THEN 'You were outbid'
                ELSE 'You placed a bid' END,
           COALESCE(p.address, 'a property', b.lot_id::text),
           CASE WHEN p.id IS NOT NULL THEN '/properties/' || p.id ELSE '/dashboard/bids' END,
           b.created_at
    FROM bids b
    LEFT JOIN auction_lots al ON al.id = b.lot_id
    LEFT JOIN properties p ON p.id = al.property_id
    WHERE b.user_id = $1

    UNION ALL

    SELECT 'watch:' || w.id, 'PROPERTY_WATCHED',
           'Added to watchlist',
           COALESCE(p.address, 'a property'),
           CASE WHEN p.id IS NOT NULL THEN '/properties/' || p.id || '?lot=' || w.lot_id ELSE '/dashboard/watched' END,
           w.created_at
    FROM watchlist w
    LEFT JOIN auction_lots al ON al.id = w.lot_id
    LEFT JOIN properties p ON p.id = al.property_id
    WHERE w.user_id = $1

    UNION ALL

    SELECT 'deposit:' || d.id, 'USDC_DEPOSIT_CREATED',
           'USDC deposit request',
           CASE WHEN d.expected_amount IS NOT NULL
                THEN '$' || round(d.expected_amount::numeric / 100)::bigint::text || ' pending on ' || COALESCE(d.network_code, 'the network')
                ELSE 'Pending on ' || COALESCE(d.network_code, 'the network') END,
           '/dashboard/funds',
           d.created_at
    FROM crypto_deposits d
    WHERE d.user_id = $1

    UNION ALL

    SELECT 'reg:' || r.id, 'AUCTION_REGISTRATION_SUBMITTED',
           CASE WHEN r.status = 'approved' THEN 'Auction registration approved'
                ELSE 'Auction registration submitted' END,
           a.title,
           '/auctions/' || r.auction_id,
           r.created_at
    FROM auction_registrations r
    LEFT JOIN auctions a ON a.id = r.auction_id
    WHERE r.user_id = $1

    UNION ALL

    SELECT 'kyc:' || k.id,
           CASE WHEN k.status = 'verified' THEN 'KYC_APPROVED' ELSE 'KYC_SUBMITTED' END,
           'Identity verification',
           k.status,
           '/dashboard/verify',
           k.created_at
    FROM kyc_verifications k
    WHERE k.user_id = $1

    UNION ALL

    SELECT 'inv:' || i.id, 'INVOICE_CREATED',
           'Invoice issued',
           '$' || round(i.total::numeric / 100)::bigint::text,
           '/dashboard/payments',
           i.created_at
    FROM invoices i
    WHERE i.user_id = $1

    UNION ALL

    SELECT 'cert:' || c.id, 'CERTIFICATE_ISSUED',
           'Certificate issued',
           COALESCE(c.certificate_number, c.id::text),
           '/dashboard/won',
           COALESCE(c.issue_date, c.created_at) AS ts
    FROM certificates c
    WHERE c.holder_id = $1

    UNION ALL

    SELECT 'red:' || r.id,
           CASE WHEN r.status = 'completed' THEN 'REDEMPTION_COMPLETED' ELSE 'REDEMPTION_STARTED' END,
           CASE WHEN r.status = 'completed' THEN 'Redemption completed' ELSE 'Redemption started' END,
           COALESCE(p.address, 'a certificate'),
           '/dashboard/history',
           COALESCE(r.completed_at, r.paid_at, r.requested_at, r.created_at) AS ts
    FROM redemptions r
    LEFT JOIN properties p ON p.id = r.property_id
    WHERE r.holder_id = $1
  )
  SELECT * FROM feed
  ORDER BY ts DESC, id
  LIMIT $2
`;

export async function getUserActivity(userId: string, limit = 30): Promise<ActivityItem[]> {
  const { rows } = await getPool().query(ACTIVITY_SQL, [userId, Math.max(1, Math.min(limit, 100))]);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body ?? null,
    link: r.link ?? null,
    at: new Date(r.ts as string).toISOString(),
  }));
}