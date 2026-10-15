import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../../shared/config.js";
import { AppError, ConfigurationError } from "../../shared/errors.js";
import { logger } from "../../shared/logger.js";

/**
 * Fiat on-ramp abstraction. A provider takes the buyer's card payment, converts
 * it to USDC and delivers the USDC to the platform wallet. The provider is NOT
 * trusted to move the internal ledger: the caller must independently verify the
 * on-chain delivery before crediting a user's balance.
 */
export interface CreateWidgetParams {
  /** Fiat amount in whole units (e.g. 500 for $500). */
  fiatAmount: number;
  fiatCurrency: string;
  cryptoSymbol: string;
  network: string;
  walletAddress: string;
  partnerOrderId: string;
  partnerCustomerId: string;
  email?: string;
  redirectUrl?: string;
}

export interface OnRampWebhook {
  eventId: string;
  data: Record<string, unknown>;
}

export interface OnRampProvider {
  readonly name: string;
  createWidgetUrl(params: CreateWidgetParams): Promise<string>;
  verifyWebhook(headers: Headers, rawBody: string): OnRampWebhook;
}

export function isOnRampConfigured(): boolean {
  return Boolean(
    config.transakApiKey &&
      (config.transakAccessToken || config.transakApiSecret) &&
      (config.onrampUsdcWallet || config.usdcSettlementAddressPlatform),
  );
}

/** The destination wallet that receives purchased USDC. */
export function onRampWalletAddress(): string {
  const w = config.onrampUsdcWallet || config.usdcSettlementAddressPlatform;
  if (!w) throw new ConfigurationError("ONRAMP_USDC_WALLET is not configured");
  return w;
}

class TransakProvider implements OnRampProvider {
  readonly name = "transak";
  private cached: { token: string; expiresAt: number } | null = null;

  private isStaging(): boolean {
    return config.transakEnv.toUpperCase() === "STAGING";
  }

  private gatewayBase(): string {
    return this.isStaging()
      ? "https://api-gateway-stg.transak.com"
      : "https://api-gateway.transak.com";
  }

  private apiBase(): string {
    return this.isStaging() ? "https://api-stg.transak.com" : "https://api.transak.com";
  }

  /**
   * Returns a valid partner access token. If TRANSAK_ACCESS_TOKEN is set it is
   * used directly. Otherwise the token is derived from the API secret via the
   * Refresh Token API and cached in memory until shortly before it expires.
   */
  private async accessToken(): Promise<string> {
    if (config.transakAccessToken) return config.transakAccessToken;
    const now = Date.now();
    if (this.cached && this.cached.expiresAt - 60_000 > now) return this.cached.token;

    const res = await fetch(`${this.apiBase()}/partners/api/v2/refresh-token`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.transakApiKey,
        "api-secret": config.transakApiSecret,
      },
      body: JSON.stringify({ apiKey: config.transakApiKey }),
    });
    const text = await res.text();
    if (!res.ok) {
      logger.error("Transak access token refresh failed", { status: res.status });
      throw new AppError("ONRAMP_PROVIDER_ERROR", "Could not authenticate with payment provider", 502);
    }
    let parsed: { data?: { accessToken?: string; expiresAt?: number } };
    try {
      parsed = JSON.parse(text) as { data?: { accessToken?: string; expiresAt?: number } };
    } catch {
      throw new AppError("ONRAMP_PROVIDER_ERROR", "Malformed provider auth response", 502);
    }
    const token = parsed.data?.accessToken;
    if (!token) throw new AppError("ONRAMP_PROVIDER_ERROR", "Provider did not return a token", 502);
    const expiresAt = (parsed.data?.expiresAt ?? 0) * 1000 || now + 6 * 24 * 60 * 60 * 1000;
    this.cached = { token, expiresAt };
    return token;
  }

  async createWidgetUrl(params: CreateWidgetParams): Promise<string> {
    const widgetParams: Record<string, unknown> = {
      apiKey: config.transakApiKey,
      referrerDomain: config.transakReferrerDomain || undefined,
      productsAvailed: "BUY",
      fiatAmount: params.fiatAmount,
      fiatCurrency: params.fiatCurrency,
      cryptoCurrencyCode: params.cryptoSymbol,
      network: params.network,
      paymentMethod: "credit_debit_card",
      hideExchangeScreen: true,
      walletAddress: params.walletAddress,
      disableWalletAddressForm: true,
      partnerOrderId: params.partnerOrderId,
      partnerCustomerId: params.partnerCustomerId,
      email: params.email || undefined,
      redirectURL: params.redirectUrl || undefined,
    };
    const res = await fetch(`${this.gatewayBase()}/api/v2/auth/session`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "access-token": await this.accessToken(),
      },
      body: JSON.stringify({ widgetParams }),
    });
    const text = await res.text();
    if (!res.ok) {
      logger.error("Transak widget session failed", { status: res.status });
      throw new AppError("ONRAMP_PROVIDER_ERROR", "Could not start card payment session", 502);
    }
    let parsed: { data?: { widgetUrl?: string } };
    try {
      parsed = JSON.parse(text) as { data?: { widgetUrl?: string } };
    } catch {
      throw new AppError("ONRAMP_PROVIDER_ERROR", "Malformed provider response", 502);
    }
    const url = parsed.data?.widgetUrl;
    if (!url) throw new AppError("ONRAMP_PROVIDER_ERROR", "Provider did not return a widget URL", 502);
    return url;
  }

  verifyWebhook(headers: Headers, rawBody: string): OnRampWebhook {
    const signature =
      headers.get("x-transak-signature") ??
      headers.get("x-signature") ??
      headers.get("authorization") ??
      "";
    const secret = config.transakWebhookSecret;
    if (!secret) {
      if (config.onrampAllowUnsignedWebhook) {
        logger.warn("Accepting UNSIGNED on-ramp webhook (dev mode)");
      } else {
        throw new ConfigurationError("TRANSAK_WEBHOOK_SECRET is not configured");
      }
    } else if (!verifyHmac(rawBody, signature, secret)) {
      throw new AppError("ONRAMP_BAD_SIGNATURE", "Invalid webhook signature", 401);
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new AppError("ONRAMP_BAD_PAYLOAD", "Malformed webhook payload", 400);
    }
    const eventId = String(payload.eventID ?? payload.eventId ?? payload.event ?? "UNKNOWN");
    const data = (payload.webhookData ?? payload.data ?? {}) as Record<string, unknown>;
    return { eventId, data };
  }
}

function verifyHmac(rawBody: string, signature: string, secret: string): boolean {
  const candidates = signature.includes(",")
    ? signature.split(",").map((s) => s.trim().replace(/^v\d+=/, ""))
    : [signature.trim().replace(/^v\d+=/, "")];
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return candidates.some((c) => {
    if (!c) return false;
    const a = Buffer.from(c.toLowerCase());
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

let provider: OnRampProvider | null = null;
export function getOnRampProvider(): OnRampProvider {
  if (!provider) provider = new TransakProvider();
  return provider;
}
