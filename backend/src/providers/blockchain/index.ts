import { config } from "../../shared/config.js";
import { ConfigurationError } from "../../shared/errors.js";
import { logger } from "../../shared/logger.js";

/**
 * Blockchain provider abstraction for USDC deposit verification.
 * Never fabricate confirmations. If RPC is unconfigured, every method fails
 * safely with NOT_CONFIGURED so the deposit model cannot be silently "confirmed".
 */
export interface BlockchainProvider {
  readonly name: string;
  getBlockNumber(): Promise<number>;
  getConfirmations(txHash: string): Promise<number>;
  getTransaction(txHash: string): Promise<{
    hash: string;
    from: string;
    to: string;
    value: bigint;
    tokenContract: string | null;
    blockNumber: number | null;
    success: boolean;
  } | null>;
  isFinal(txHash: string): Promise<boolean>;
}

class UnconfiguredBlockchainProvider implements BlockchainProvider {
  readonly name = "unconfigured";
  async getBlockNumber(): Promise<number> {
    throw new ConfigurationError("Blockchain RPC not configured");
  }
  async getConfirmations(): Promise<number> {
    throw new ConfigurationError("Blockchain RPC not configured");
  }
  async getTransaction(): Promise<{
    hash: string;
    from: string;
    to: string;
    value: bigint;
    tokenContract: string | null;
    blockNumber: number | null;
    success: boolean;
  } | null> {
    throw new ConfigurationError("Blockchain RPC not configured");
  }
  async isFinal(): Promise<boolean> {
    throw new ConfigurationError("Blockchain RPC not configured");
  }
}

// A real implementation would wrap viem/ethers against BLOCKCHAIN_RPC_URL and
// verify ERC-20 Transfer logs for the configured USDC contract.
class RpcBlockchainProvider implements BlockchainProvider {
  readonly name = "rpc";
  constructor(private rpcUrl: string, private usdcContract: string, private threshold: number) {}
  async getBlockNumber(): Promise<number> {
    const res = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
    });
    const data = (await res.json()) as { result?: string };
    return Number.parseInt(data.result ?? "0", 16);
  }
  async getConfirmations(txHash: string): Promise<number> {
    const head = await this.getBlockNumber();
    const res = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [txHash] }),
    });
    const data = (await res.json()) as { result?: { blockNumber?: string } };
    const txBlock = data.result?.blockNumber ? Number.parseInt(data.result.blockNumber, 16) : null;
    if (txBlock === null) return 0;
    return Math.max(0, head - txBlock);
  }
  async getTransaction(txHash: string): Promise<{
    hash: string;
    from: string;
    to: string;
    value: bigint;
    tokenContract: string | null;
    blockNumber: number | null;
    success: boolean;
  } | null> {
    // Real impl: decode ERC-20 Transfer event logs; here we return the raw shape stub.
    throw new ConfigurationError("RPC transaction decoding not implemented in this build");
  }
  async isFinal(txHash: string): Promise<boolean> {
    const confirmations = await this.getConfirmations(txHash);
    return confirmations >= this.threshold;
  }
}

let provider: BlockchainProvider | null = null;
export function getBlockchainProvider(): BlockchainProvider {
  if (provider) return provider;
  const p: BlockchainProvider = config.blockchainRpcUrl
    ? new RpcBlockchainProvider(config.blockchainRpcUrl, config.usdcTokenContract, config.usdcConfirmationThreshold)
    : new UnconfiguredBlockchainProvider();
  if (!config.blockchainRpcUrl) {
    logger.warn("Blockchain provider NOT_CONFIGURED — USDC verification unavailable", {
      provider: "unconfigured",
    });
  }
  provider = p;
  return p;
}
