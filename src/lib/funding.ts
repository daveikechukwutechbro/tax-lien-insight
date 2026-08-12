// Platform USDC deposit addresses per network.
// TODO: replace these with your real treasury addresses (ask the owner for them).
export const USDC_ADDRESSES: Record<NetworkKey, string> = {
  base: "0x0000000000000000000000000000000000000000",
  ethereum: "0x0000000000000000000000000000000000000000",
  polygon: "0x0000000000000000000000000000000000000000",
};

export type NetworkKey = "base" | "ethereum" | "polygon";

export const NETWORKS: { key: NetworkKey; label: string; sub: string; fee: number }[] = [
  { key: "base", label: "Base", sub: "(Recommended)", fee: 0.03 },
  { key: "ethereum", label: "Ethereum", sub: "", fee: 4.5 },
  { key: "polygon", label: "Polygon", sub: "", fee: 0.01 },
];

export const NETWORK_DISPLAY: Record<NetworkKey, string> = {
  base: "Base (Ethereum L2)",
  ethereum: "Ethereum (Mainnet)",
  polygon: "Polygon (PoS)",
};

export const QUICK_AMOUNTS = [500, 1000, 5000, 10000, 25000];