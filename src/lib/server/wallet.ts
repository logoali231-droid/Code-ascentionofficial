"use client";

import {
  getWalletClient,
  type Config,
} from "@wagmi/core";

import {
  createConfig,
  http,
} from "wagmi";

import {
  arbitrum,
  base,
  mainnet,
  polygon,
} from "wagmi/chains";

import {
  injected,
  walletConnect,
} from "wagmi/connectors";

const projectId =
  process.env
    .NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "development";

const validateRpcUrl = (
  envUrl: string | undefined,
  fallbackUrl: string,
): string => {
  if (!envUrl) return fallbackUrl;

  try {
    new URL(envUrl);

    return envUrl;
  } catch {
    console.warn(
      `Malformed RPC URL detected: "${envUrl}". Reverting to fallback.`,
    );

    return fallbackUrl;
  }
};

export const walletConfig =
  createConfig({
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

        metadata: {
          name: "Code Ascension",

          description:
            "Offline AI-powered cyberpunk learning roguelike",

          url:
            process.env
              .NEXT_PUBLIC_APP_URL ||
            "http://localhost:3001",

          icons: [
            "http://localhost:3001/icons/icon-192.png",
          ],
        },
      }),
    ],

    transports: {
      [mainnet.id]: http(
        validateRpcUrl(
          process.env
            .NEXT_PUBLIC_ETH_RPC,

          "https://eth-mainnet.g.alchemy.com",
        ),
      ),

      [polygon.id]: http(
        validateRpcUrl(
          process.env
            .NEXT_PUBLIC_POLYGON_RPC,

          "https://polygon-mainnet.g.alchemy.com",
        ),
      ),

      [arbitrum.id]: http(
        validateRpcUrl(
          process.env
            .NEXT_PUBLIC_ARBITRUM_RPC,

          "https://arb-mainnet.g.alchemy.com",
        ),
      ),

      [base.id]: http(
        validateRpcUrl(
          process.env
            .NEXT_PUBLIC_BASE_RPC,

          "https://base-mainnet.g.alchemy.com",
        ),
      ),
    },
  });

export async function getSigner() {
  const client =
    await getWalletClient(
      walletConfig as unknown as Config,
    );

  if (!client) return null;

  return client;
}
