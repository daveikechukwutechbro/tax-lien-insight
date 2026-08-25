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

const TEMPLATES: Record<EmailTemplate, (v: Record<string, string>) => RenderedEmail> = {
  welcome: (v) => ({
    subject: "Welcome to Tax Lien Insight",
    html: `<p>Hi ${v.name ?? ""}, welcome to Tax Lien Insight.</p>`,
    text: `Welcome to Tax Lien Insight, ${v.name ?? ""}.`,
  }),
  verification: (v) => ({
    subject: "Verify your email",
    html: `<p>Confirm your email: <a href="${v.appUrl}/verify?token=${v.verificationToken}">verify</a></p>`,
    text: `Verify: ${v.appUrl}/verify?token=${v.verificationToken}`,
  }),
  password_reset: (v) => ({
    subject: "Reset your password",
    html: `<p>Reset your password: <a href="${v.appUrl}/reset?token=${v.resetToken}">reset</a></p>`,
    text: `Reset: ${v.appUrl}/reset?token=${v.resetToken}`,
  }),
  bid_confirmation: (v) => ({
    subject: "Bid confirmed",
    html: `<p>Your bid on lot ${v.lotId} at rate ${v.rate}% is confirmed.</p>`,
    text: `Bid confirmed on lot ${v.lotId} at ${v.rate}%.`,
  }),
  outbid: (v) => ({
    subject: "You have been outbid",
    html: `<p>You were outbid on lot ${v.lotId}.</p>`,
    text: `Outbid on lot ${v.lotId}.`,
  }),
  auction_reminder: (v) => ({
    subject: "Auction starting soon",
    html: `<p>Auction ${v.auctionId} starts at ${v.startsAt}.</p>`,
    text: `Auction ${v.auctionId} starts ${v.startsAt}.`,
  }),
  winning: (v) => ({
    subject: "Congratulations — you won",
    html: `<p>You won lot ${v.lotId}.</p>`,
    text: `You won lot ${v.lotId}.`,
  }),
  losing: (v) => ({
    subject: "Auction result",
    html: `<p>You did not win lot ${v.lotId}.</p>`,
    text: `You did not win lot ${v.lotId}.`,
  }),
  payment: (v) => ({
    subject: "Payment confirmation",
    html: `<p>Payment of ${v.amount} received.</p>`,
    text: `Payment ${v.amount} received.`,
  }),
  invoice: (v) => ({
    subject: "New invoice",
    html: `<p>Invoice ${v.invoiceId} for ${v.amount} is available.</p>`,
    text: `Invoice ${v.invoiceId}: ${v.amount}.`,
  }),
  certificate: (v) => ({
    subject: "Certificate issued",
    html: `<p>Certificate ${v.certificateNumber} has been issued.</p>`,
    text: `Certificate ${v.certificateNumber} issued.`,
  }),
  redemption: (v) => ({
    subject: "Redemption reminder",
    html: `<p>Redemption for certificate ${v.certificateNumber} due ${v.deadline}.</p>`,
    text: `Redemption due ${v.deadline}.`,
  }),
  support: (v) => ({
    subject: "Support update",
    html: `<p>${v.message ?? ""}</p>`,
    text: v.message ?? "",
  }),
  saved_search: (v) => ({
    subject: "New matches for your saved search",
    html: `<p>${v.matches ?? 0} new matches for "${v.searchName}".</p>`,
    text: `${v.matches ?? 0} new matches for ${v.searchName}.`,
  }),
};

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
