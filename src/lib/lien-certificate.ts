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
  .foot { margin-top: 22px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
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