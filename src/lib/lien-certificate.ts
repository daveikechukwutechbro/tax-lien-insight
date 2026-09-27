// Generates AuctionLedger lien certificates for auction winners. The document
// is a genuine record generated from the platform's own auction data — it is
// clearly branded as AuctionLedger and explicitly states it is not a
// substitute for any instrument issued by the applicable taxing authority.

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/** Small deterministic hash so a bid always maps to the same certificate id. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Deterministic PRNG so each certificate gets a stable, distinct wax blob. */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Organic, slightly lopsided wax-seal outline (hand-stamped, not perfect). */
function sealBlobPath(seed: number, spikes = 22, base = 59, amp = 3.2): string {
  const rand = mulberry32(seed);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < spikes; i++) {
    const theta = (i / spikes) * Math.PI * 2;
    const wobble = (rand() * 2 - 1) * amp;
    const r = base + wobble + Math.sin(i * 3.7) * 1.4;
    pts.push({ x: 60 + Math.cos(theta) * r, y: 60 + Math.sin(theta) * r });
  }
  const mids: { x: number; y: number }[] = [];
  for (let i = 0; i < spikes; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % spikes];
    mids.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  }
  let d = `M ${mids[0].x.toFixed(2)} ${mids[0].y.toFixed(2)}`;
  for (let i = 1; i <= spikes; i++) {
    const p = pts[i % spikes];
    const m = mids[i % spikes];
    d += ` Q ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${m.x.toFixed(2)} ${m.y.toFixed(2)}`;
  }
  return `${d} Z`;
}

export function makeCertificateId(bidId: string, placedAt: string): string {
  const year = new Date(placedAt).getFullYear() || new Date().getFullYear();
  const hash = fnv1a(`${bidId}:${placedAt}`);
  let code = "";
  let n = hash;
  for (let i = 0; i < 6; i++) {
    code = CODE_ALPHABET[n % CODE_ALPHABET.length] + code;
    n = Math.floor(n / CODE_ALPHABET.length);
  }
  return `AL-${year}-${code}`;
}

export interface CertificateBid {
  bid_id: string;
  placed_at: string;
  interest_rate: number;
  auction_title?: string | null;
  parcel_id?: string | null;
  legal_description?: string | null;
  tax_year?: number | null;
  redemption_period_months?: number | null;
  lien: {
    id: string;
    taxes_owed: number;
    property: {
      id?: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      parcel_id?: string | null;
    };
  };
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function weekdayLong(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildCertificateHtml(args: {
  bid: CertificateBid;
  holderName: string;
  holderEmail: string;
}): string {
  const { bid, holderName, holderEmail } = args;
  const certificateId = makeCertificateId(bid.bid_id, bid.placed_at);
  const issueDate = weekdayLong(new Date());
  const auctionDate = weekdayLong(new Date(bid.placed_at));
  const redeemsBy = bid.redemption_period_months
    ? weekdayLong(addMonths(new Date(bid.placed_at), bid.redemption_period_months))
    : null;
  const p = bid.lien.property;
  const parcel = p.parcel_id || bid.parcel_id || null;
  const taxYear = bid.tax_year ?? null;
  const blob = sealBlobPath(fnv1a(`${certificateId}:blob`));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>AuctionLedger Lien Certificate ${certificateId}</title>
<style>
  @page { size: letter landscape; margin: 11mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, "Times New Roman", serif; color: #16233c; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cert { border: 2.5px solid #16233c; padding: 22px 26px; max-width: 270mm; margin: 0 auto; }
  .rule { border-bottom: 1px solid #c8a23a; margin: 10px 0 14px; }
  .topline { display: flex; justify-content: space-between; align-items: center; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-mark { display: grid; place-items: center; width: 30px; height: 30px; background: #16233c; color: #c8a23a; font-weight: 700; font-size: 15px; border-radius: 5px; }
  .brand-name { font-size: 15px; font-weight: 700; letter-spacing: 0.04em; }
  .brand-tag { font-size: 8px; letter-spacing: 0.28em; color: #8a93a6; text-transform: uppercase; }
  .certno { text-align: right; font-size: 11px; color: #44506b; }
  .certno strong { display: block; color: #16233c; font-size: 13px; letter-spacing: 0.05em; }
  h1 { text-align: center; font-size: 22px; letter-spacing: 0.22em; font-weight: 700; margin-top: 4px; text-transform: uppercase; }
  .sub { text-align: center; font-size: 11px; color: #44506b; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 4px; }
  .body { font-size: 13.5px; line-height: 1.65; margin-top: 18px; }
  .table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  .table th, .table td { border: 1px solid #cfd6e2; padding: 8px 10px; text-align: left; font-size: 12.5px; }
  .table th { background: #f2f4f8; letter-spacing: 0.06em; text-transform: uppercase; font-size: 10px; color: #44506b; width: 34%; }
  .foot { margin-top: 22px; position: relative; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
  .seal { position: absolute; left: 50%; bottom: -13px; width: 92px; height: 92px; transform: translateX(-50%) rotate(-5deg); z-index: 1; }
  .seal svg { width: 100%; height: 100%; display: block; }
  .sig { font-size: 11px; color: #44506b; text-align: center; }
  .sigline { margin-top: 26px; border-top: 1px solid #16233c; padding-top: 4px; width: 150px; }
  .legal { margin-top: 18px; font-size: 8.5px; color: #7a8296; line-height: 1.5; text-align: center; }
</style>
</head>
<body>
<div class="cert">
  <div class="topline">
    <div class="brand">
      <span class="brand-mark">AL</span>
      <div>
        <div class="brand-name">AuctionLedger</div>
        <div class="brand-tag">Tax Lien Auctions</div>
      </div>
    </div>
    <div class="certno"><strong>Certificate No. ${certificateId}</strong>Issued: ${issueDate}</div>
  </div>
  <div class="rule"></div>
  <h1>Certificate of Purchase</h1>
  <div class="sub">Tax Lien Sold at Public Auction</div>
  <div class="body">
    This certifies that <strong>${holderName || holderEmail}</strong> is the holder of the tax lien sold at
    auction through AuctionLedger for the property described below. The holder is entitled to the certificate
    (face) amount shown, together with interest accrued at the stated rate until redemption, in accordance with
    the applicable state's statutory requirements.
  </div>
  <table class="table">
    <tr><th>County / Jurisdiction</th><td>${p.city}, ${p.state}</td></tr>
    <tr><th>Property Address</th><td>${p.address}, ${p.city}, ${p.state} ${p.zip}</td></tr>
    <tr><th>Parcel / Account No.</th><td>${parcel || "—"}</td></tr>
    <tr><th>Legal Description</th><td>${bid.legal_description || "—"}</td></tr>
    <tr><th>Tax Year(s)</th><td>${taxYear ?? "—"}</td></tr>
    <tr><th>Certificate / Serial No.</th><td>${certificateId}</td></tr>
    <tr><th>Lien / Bid ID</th><td>${bid.lien.id || bid.bid_id}</td></tr>
    <tr><th>Certificate / Face Amount (Winning Bid)</th><td>${fmt(bid.lien.taxes_owed)}</td></tr>
    <tr><th>Annual Interest Rate</th><td>${(bid.interest_rate ?? 0).toFixed(2)}%</td></tr>
    <tr><th>Auction Name</th><td>${bid.auction_title || "AuctionLedger Tax Sale"}</td></tr>
    <tr><th>Date of Certificate Sale</th><td>${auctionDate}</td></tr>
    ${redeemsBy ? `<tr><th>Redemption Deadline</th><td>${redeemsBy}</td></tr>` : ""}
  </table>
  <div class="foot">
    <div class="sig"><div class="sigline">AuctionLedger</div></div>
    <div class="seal" aria-hidden="true">
      <svg viewBox="-8 -8 136 136" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="waxFace" cx="44%" cy="34%" r="80%">
            <stop offset="0%" stop-color="#df6a5f" />
            <stop offset="38%" stop-color="#b8402f" />
            <stop offset="78%" stop-color="#8e271c" />
            <stop offset="100%" stop-color="#731b12" />
          </radialGradient>
          <linearGradient id="waxGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f7dc92" />
            <stop offset="55%" stop-color="#e0bd55" />
            <stop offset="100%" stop-color="#b2902a" />
          </linearGradient>
          <linearGradient id="rimShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#5b120c" stop-opacity="0.72" />
            <stop offset="100%" stop-color="#5b120c" stop-opacity="0" />
          </linearGradient>
          <filter id="sealShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
          <filter id="sealGrain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.30 0 0 0 0 0.07 0 0 0 0 0.04 0 0 0 0.5 0" />
          </filter>
          <clipPath id="sealClip"><path d="${blob}" /></clipPath>
        </defs>
        <path d="${blob}" transform="translate(3 4)" fill="#3f0b07" opacity="0.38" filter="url(#sealShadow)" />
        <path d="${blob}" fill="url(#waxFace)" />
        <g clip-path="url(#sealClip)">
          <rect x="-8" y="-8" width="136" height="136" filter="url(#sealGrain)" opacity="0.16" />
          <path d="${blob}" fill="url(#rimShade)" transform="translate(0 14)" opacity="0.6" />
        </g>
        <g transform="translate(60 60) scale(0.9) translate(-60 -60)">
          <path d="${blob}" fill="none" stroke="#7a1f18" stroke-width="6" opacity="0.55" />
        </g>
        <path d="${blob}" fill="none" stroke="url(#waxGold)" stroke-width="3" />
        <path id="sealTop" d="M 21 60 A 39 39 0 0 1 99 60" fill="none" />
        <path id="sealBottom" d="M 21 60 A 39 39 0 1 0 99 60" fill="none" />
        <text font-family="Georgia, 'Times New Roman', serif" font-size="10" letter-spacing="2.6" fill="#f7dc92">
          <textPath href="#sealTop" startOffset="50%" text-anchor="middle">AUCTIONLEDGER</textPath>
        </text>
        <text font-family="Georgia, 'Times New Roman', serif" font-size="7.8" letter-spacing="1.7" fill="#f7dc92">
          <textPath href="#sealBottom" startOffset="50%" text-anchor="middle">TAX LIEN AUCTIONS</textPath>
        </text>
        <circle cx="21" cy="60" r="2.1" fill="url(#waxGold)" />
        <circle cx="99" cy="60" r="2.1" fill="url(#waxGold)" />
        <circle cx="60" cy="38" r="2.1" fill="url(#waxGold)" />
        <circle cx="60" cy="83" r="2.1" fill="url(#waxGold)" />
        <g transform="translate(60 60)">
          <rect x="-17.5" y="-17.5" width="35" height="35" rx="7.5" fill="#16233c" />
          <rect x="-14.5" y="-14.5" width="29" height="29" rx="5" fill="none" stroke="url(#waxGold)" stroke-width="1" opacity="0.75" />
        </g>
        <text x="60" y="66.5" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="18" font-weight="700" fill="#f0cd5f">AL</text>
      </svg>
    </div>
    <div class="sig">Certificate No. ${certificateId}</div>
  </div>
  <div class="legal">
    This certificate evidences a real property lien recorded through the AuctionLedger auction platform.
    It is not a substitute for, and does not replace, any instrument, deed, or certificate issued by the
    applicable taxing authority. All rights, remedies, and redemption periods are governed by state law.
  </div>
</div>
<script>
  window.onload = function () { setTimeout(function () { window.focus(); window.print(); }, 120); };
</script>
</body>
</html>`;
}

/** Opens a print window with the certificate so the user can save as PDF. */
export function printLienCertificate(args: {
  bid: CertificateBid;
  holderName: string;
  holderEmail: string;
}): void {
  const html = buildCertificateHtml(args);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}