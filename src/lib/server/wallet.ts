"use client";

import { getWalletClient, type Config } from "@wagmi/core";
import { createConfig, http } from "wagmi";
import { arbitrum, base, mainnet, polygon } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

/* -----------------------------
   SAFE ENV HELPERS
------------------------------*/

const safeUrl = (url: string | undefined, fallback: string) => {
  if (!url) return fallback;

  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    console.warn("[INVALID URL]", url);
    return fallback;
  }
};

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const appUrl = safeUrl(
  process.env.NEXT_PUBLIC_APP_URL,
  "https://code-ascention.com.br"
);

/* -----------------------------
   CONNECTORS (SAFE INIT)
------------------------------*/

const connectors: any[] = [injected()];

if (projectId && projectId.trim().length > 5) {
  connectors.push(
    walletConnect({
      projectId,
      metadata: {
        name: "Code Ascension",
        description: "Offline AI-powered cyberpunk learning roguelike",
        url: appUrl,
        icons: [safeUrl(`${appUrl}/icons/icon-192.png`, `${appUrl}/icons/icon-192.png`)],
      },
    })
  );
} else {
  console.warn("[WALLETCONNECT DISABLED] Missing or invalid projectId");
}

/* -----------------------------
   RPC TRANSPORT SAFE WRAPPER
------------------------------*/

const rpc = (env: string | undefined, fallback: string) =>
  http(safeUrl(env, fallback));

/* -----------------------------
   WALLET CONFIG
------------------------------*/

export const walletConfig = createConfig({
  chains: [mainnet, polygon, arbitrum, base],
  connectors,

  transports: {
    [mainnet.id]: rpc(
      process.env.NEXT_PUBLIC_ETH_RPC,
      "https://eth-mainnet.g.alchemy.com"
    ),

    [polygon.id]: rpc(
      process.env.NEXT_PUBLIC_POLYGON_RPC,
      "https://polygon-rpc.com"
    ),

    [arbitrum.id]: rpc(
      process.env.NEXT_PUBLIC_ARBITRUM_RPC,
      "https://arb1.arbitrum.io/rpc"
    ),

    [base.id]: rpc(
      process.env.NEXT_PUBLIC_BASE_RPC,
      "https://mainnet.base.org"
    ),
  },
});

/* -----------------------------
   SAFE SIGNER
------------------------------*/

export async function getSigner() {
  try {
    const client = await getWalletClient(walletConfig as unknown as Config);
    return client ?? null;
  } catch (err) {
    console.error("[Wallet] getSigner failed:", err);
    return null;
  }
}