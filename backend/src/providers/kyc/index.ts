import { ConfigurationError } from "../../shared/errors.js";
import { logger } from "../../shared/logger.js";

/**
 * KYC provider abstraction. The backend stores verification records in the DB;
 * an external provider (e.g., Persona, Onfido, Alloy) plugs in here. We NEVER
 * fake a successful verification.
 */
export type KycProviderName = "unconfigured" | "persona" | "onfido" | "stub";

export interface KycProvider {
  readonly name: KycProviderName;
  createVerification(reference: string): Promise<{ providerReference: string; statusUrl?: string }>;
  getVerificationStatus(providerReference: string): Promise<"processing" | "verified" | "rejected" | "expired">;
  uploadDocument(providerReference: string, documentType: string, payload: unknown): Promise<void>;
}

class UnconfiguredKycProvider implements KycProvider {
  readonly name = "unconfigured";
  async createVerification(_reference: string): Promise<{ providerReference: string; statusUrl?: string }> {
    logger.warn("KYC provider NOT_CONFIGURED — verification cannot be performed by a provider");
    throw new ConfigurationError("KYC provider not configured");
  }
  async getVerificationStatus(): Promise<"processing"> {
    throw new ConfigurationError("KYC provider not configured");
  }
  async uploadDocument(): Promise<void> {
    throw new ConfigurationError("KYC provider not configured");
  }
}

let provider: KycProvider | null = null;
export function getKycProvider(): KycProvider {
  if (provider) return provider;
  const p: KycProvider = new UnconfiguredKycProvider();
  provider = p;
  return p;
}
