"use client";

import { getWalletClient, type Config } from '@wagmi/core';
import { createConfig, http } from "wagmi";
import { arbitrum, base, mainnet, polygon } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

if (!projectId) {
  throw new Error(
    "Critical Configuration Error: Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
  );
}


const validateRpcUrl = (envUrl: string | undefined, fallbackUrl: string): string => {
  if (!envUrl) return fallbackUrl;
  try {
    // Test if the string can be parsed as a valid URL structure
    new URL(envUrl);
    return envUrl;
  } catch (error) {
    console.warn(`Malformed RPC URL detected: "${envUrl}". Reverting to fallback: "${fallbackUrl}"`);
    return fallbackUrl;
  }
};

export const walletConfig = createConfig({
  chains: [
    mainnet,
    polygon,
    arbitrum,
    base,
  ],

  connectors: [
    injected(),
    walletConnect({
      projectId,
    }),
  ],

  transports: {
    [mainnet.id]: http(
      validateRpcUrl(process.env.NEXT_PUBLIC_ETH_RPC, "https://cloudflare-eth.com")
    ),

    [polygon.id]: http(
      validateRpcUrl(process.env.NEXT_PUBLIC_POLYGON_RPC, "https://polygon-rpc.com")
    ),

    [arbitrum.id]: http(
      validateRpcUrl(process.env.NEXT_PUBLIC_ARBITRUM_RPC, "https://arb1.arbitrum.io/rpc")
    ),

    [base.id]: http(
      validateRpcUrl(process.env.NEXT_PUBLIC_BASE_RPC, "https://mainnet.base.org")
    ),
  },
});

export async function getSigner() {
  const client = await getWalletClient(walletConfig as unknown as Config);
  if (!client) return null;
  return client;
}