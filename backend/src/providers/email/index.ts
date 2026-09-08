import { getPool } from "../../db/pool.js";
import { config } from "../../shared/config.js";
import { logger } from "../../shared/logger.js";
import { ConfigurationError } from "../../shared/errors.js";

export type EmailTemplate =
  | "welcome"
  | "verification"
  | "password_reset"
  | "bid_confirmation"
  | "outbid"
  | "auction_reminder"
  | "winning"
  | "losing"
  | "payment"
  | "invoice"
  | "certificate"
  | "redemption"
  | "support"
  | "saved_search";

export interface SendEmailInput {
  template: EmailTemplate;
  to: string;
  variables: Record<string, string>;
  locale?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND = "Auction Ledger";
const SUPPORT_EMAIL = "auctionledger@gmail.com";
const NAVY = "#1d2a4d";
const NAVY_DEEP = "#141d38";
const GOLD = "#c9a24b";
const INK = "#20242e";
const MUTED = "#6b7280";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface LayoutOptions {
  cta?: { label: string; url: string };
  note?: string;
}

function layout(bodyInner: string, opts: LayoutOptions = {}): string {
  const cta = opts.cta
    ? `<div style="margin:28px 0 4px;text-align:center;">
         <a href="${escapeHtml(opts.cta.url)}" style="display:inline-block;padding:13px 34px;border-radius:8px;background:${GOLD};color:${NAVY_DEEP};font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(opts.cta.label)}</a>
         <p style="margin:10px 0 0;font-size:12px;color:${MUTED};">${escapeHtml(opts.cta.url)}</p>
       </div>`
    : "";

  const note = opts.note ? `<p style="margin:20px 0 0;font-size:12px;color:${MUTED};">${escapeHtml(opts.note)}</p>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#eef1f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(20,29,56,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY} 100%);padding:28px 32px;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Auction <span style="color:${GOLD};">Ledger</span></div>
              <div style="margin-top:4px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.65);">Tax Lien Certificate Auctions</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px;font-family:Segoe UI, Helvetica, Arial, sans-serif;color:${INK};">
              ${bodyInner}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid #e6e9f0;font-family:Segoe UI, Helvetica, Arial, sans-serif;">
              <p style="margin:0;font-size:12px;color:${MUTED};">Questions or need help? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:${NAVY};font-weight:600;text-decoration:none;">${SUPPORT_EMAIL}</a></p>
              <p style="margin:10px 0 0;font-size:11px;color:#9aa2b1;">© ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p>
              <p style="margin:6px 0 0;font-size:11px;color:#9aa2b1;">Registered bidders only. Not financial advice.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${escapeHtml(text)}</p>`;
}

function heading(title: string): string {
  return `<h1 style="margin:0 0 16px;font-size:20px;color:${NAVY};">${escapeHtml(title)}</h1>`;
}

const TEMPLATES: Record<EmailTemplate, (v: Record<string, string>) => RenderedEmail> = {
  welcome: (v) => ({
    subject: `Welcome to ${BRAND}`,
    html: layout(
      heading(`Welcome to ${BRAND}, ${escapeHtml(v.name ?? "")}`) +
        para(
          "Thank you for joining Auction Ledger. You can now browse tax lien auctions, save searches, and place bids once you complete a profile.",
        ),
      { note: "Complete your account details in your dashboard to start bidding." },
    ),
    text: `Welcome to ${BRAND}, ${v.name ?? ""}. Thank you for joining Auction Ledger.`,
  }),
  verification: (v) => ({
    subject: "Verify your email",
    html: layout(
      heading("Verify your email address") +
        para("Hi, and thanks for creating your Auction Ledger account.") +
        para("To activate your account, enter the 6-digit verification code below:") +
        layoutInner(v.verificationCode ?? "") +
        para("The code expires after 24 hours.") +
        (v.verificationToken
          ? ctaLink(`Verify instantly`, `${v.appUrl}/verify?token=${v.verificationToken}`)
          : ""),
      { note: "If you did not create an account, you can safely ignore this email." },
    ),
    text: `Verify your email — enter this code on the Auction Ledger verification page: ${v.verificationCode}`,
  }),
  password_reset: (v) => ({
    subject: "Reset your password",
    html: layout(
      heading("Reset your password") +
        para("We received a request to reset your Auction Ledger password.") +
        (v.resetToken
          ? ctaLink(`Reset my password`, `${v.appUrl}/reset?token=${v.resetToken}`)
          : para("No reset link was generated. Please request a new one.")),
      { note: "If you did not request this, you can safely ignore this email." },
    ),
    text: `Reset your password: ${v.appUrl}/reset?token=${v.resetToken}`,
  }),
  bid_confirmation: (v) => ({
    subject: "Bid confirmed",
    html: layout(
      heading("Bid confirmed") +
        para(`Your bid on lot ${v.lotId} at an interest rate of ${v.rate}% has been confirmed.`) +
        para("Track the auction in your dashboard."),
    ),
    text: `Bid confirmed on lot ${v.lotId} at ${v.rate}%.`,
  }),
  outbid: (v) => ({
    subject: "You have been outbid",
    html: layout(
      heading("You have been outbid") +
        para(`Another bidder placed a higher bid on lot ${v.lotId}.`) +
        para("Log in to place a new bid before the auction closes."),
      { cta: { label: "View auction", url: `${v.appUrl}/auctions` } },
    ),
    text: `You were outbid on lot ${v.lotId}.`,
  }),
  auction_reminder: (v) => ({
    subject: "Auction starting soon",
    html: layout(
      heading("Auction starting soon") +
        para(`Auction ${v.auctionId} starts at ${v.startsAt}.`) +
        para("Get ready to place your bids."),
      { cta: { label: "Open auction", url: `${v.appUrl}/auctions/${v.auctionId}` } },
    ),
    text: `Auction ${v.auctionId} starts ${v.startsAt}.`,
  }),
  winning: (v) => ({
    subject: "Congratulations — you won",
    html: layout(
      heading("Congratulations!") +
        para(`You won lot ${v.lotId}.`) +
        para("Review the settlement instructions in your dashboard to complete the purchase."),
      { cta: { label: "View your dashboard", url: `${v.appUrl}/dashboard` } },
    ),
    text: `You won lot ${v.lotId}.`,
  }),
  losing: (v) => ({
    subject: "Auction result",
    html: layout(
      heading("Auction result") +
        para(`You did not win lot ${v.lotId}.`) +
        para("Keep an eye on upcoming auctions — new tax lien sales are added regularly."),
      { cta: { label: "Browse auctions", url: `${v.appUrl}/auctions` } },
    ),
    text: `You did not win lot ${v.lotId}.`,
  }),
  payment: (v) => ({
    subject: "Payment confirmation",
    html: layout(
      heading("Payment received") +
        para(`A payment of ${v.amount} was received on your account.`),
    ),
    text: `Payment ${v.amount} received.`,
  }),
  invoice: (v) => ({
    subject: "New invoice",
    html: layout(
      heading("New invoice available") +
        para(`Invoice ${v.invoiceId} for ${v.amount} is now available in your dashboard.`),
      { cta: { label: "View invoice", url: `${v.appUrl}/dashboard` } },
    ),
    text: `Invoice ${v.invoiceId} for ${v.amount} is available.`,
  }),
  certificate: (v) => ({
    subject: "Certificate issued",
    html: layout(
      heading("Your tax lien certificate") +
        para(`Certificate ${v.certificateNumber} has been issued.`) +
        para("You can download it from your dashboard."),
      { cta: { label: "Open dashboard", url: `${v.appUrl}/dashboard` } },
    ),
    text: `Certificate ${v.certificateNumber} issued.`,
  }),
  redemption: (v) => ({
    subject: "Redemption reminder",
    html: layout(
      heading("Redemption reminder") +
        para(`Redemption for certificate ${v.certificateNumber} is due on ${v.deadline}.`),
    ),
    text: `Redemption due ${v.deadline}.`,
  }),
  support: (v) => ({
    subject: "Support update",
    html: layout(heading("Support update") + para(v.message ?? "")),
    text: v.message ?? "",
  }),
  saved_search: (v) => ({
    subject: "New matches for your saved search",
    html: layout(
      heading("New matches found") +
        para(`${v.matches ?? 0} new properties matched your saved search "${v.searchName}".`),
      { cta: { label: "View results", url: `${v.appUrl}/search` } },
    ),
    text: `${v.matches ?? 0} new matches for ${v.searchName}.`,
  }),
};

function layoutInner(code: string): string {
  return `<div style="margin:26px 0 6px;text-align:center;">
    <div style="display:inline-block;padding:16px 28px;border:2px dashed ${GOLD};border-radius:10px;background:#fdf9f0;">
      <span style="font-size:34px;line-height:1;letter-spacing:10px;font-weight:700;color:${NAVY};">${escapeHtml(code)}</span>
    </div>
    <p style="margin:10px 0 0;font-size:12px;color:${MUTED};">Enter this code on the verification page</p>
  </div>`;
}

function ctaLink(label: string, url: string): string {
  return `<div style="margin:18px 0 4px;text-align:center;">
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 34px;border-radius:8px;background:${GOLD};color:${NAVY_DEEP};font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>
  </div>`;
}

export interface EmailProvider {
  readonly name: string;
  send(input: SendEmailInput): Promise<{ delivered: boolean; providerId?: string }>;
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  constructor(private apiKey: string) {}

  async send(input: SendEmailInput) {
    const rendered = TEMPLATES[input.template](input.variables);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.emailFrom,
        to: input.to,
        reply_to: config.emailReplyTo || undefined,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
    });
    if (!res.ok) {
      throw new ConfigurationError("Resend delivery failed", { status: res.status });
    }
    const data = (await res.json()) as { id?: string };
    return { delivered: true, providerId: data.id };
  }
}

class OutboxEmailProvider implements EmailProvider {
  readonly name = "outbox";
  async send(input: SendEmailInput) {
    const rendered = TEMPLATES[input.template](input.variables);
    await getPool().query(
      `INSERT INTO email_outbox (to_address, subject, html, text, template, variables, locale, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'queued')`,
      [
        input.to,
        rendered.subject,
        rendered.html,
        rendered.text,
        input.template,
        JSON.stringify(input.variables),
        input.locale ?? "en-US",
      ],
    );
    return { delivered: false };
  }
}

export function isEmailConfigured(): boolean {
  return (
    Boolean(config.resendApiKey && config.emailProvider === "resend") &&
    getEmailProvider() instanceof ResendEmailProvider
  );
}

let provider: EmailProvider | null = null;
export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  if (config.resendApiKey && config.emailProvider === "resend") {
    provider = new ResendEmailProvider(config.resendApiKey);
  } else {
    provider = new OutboxEmailProvider();
    logger.warn("Email provider NOT_CONFIGURED — using outbox queue", { provider: "outbox" });
  }
  return provider;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const p = getEmailProvider();
  try {
    await p.send(input);
  } catch (err) {
    logger.error("Email send failed, queuing to outbox", { errorCode: (err as Error).message });
    // Fail-safe: persist to outbox so it is not lost.
    const rendered = TEMPLATES[input.template](input.variables);
    await getPool().query(
      `INSERT INTO email_outbox (to_address, subject, html, text, template, variables, locale, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'queued')`,
      [
        input.to,
        rendered.subject,
        rendered.html,
        rendered.text,
        input.template,
        JSON.stringify(input.variables),
        input.locale ?? "en-US",
      ],
    );
  }
}