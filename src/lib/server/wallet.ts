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
    .NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const appUrl =
  process.env
    .NEXT_PUBLIC_APP_URL ||
  "https://code-ascention.com.br";

const validateUrl = (
  url: string,
  fallback: string,
) => {
  try {
    new URL(url);

    return url;
  } catch {
    console.warn(
      `[INVALID URL] ${url}`,
    );

    return fallback;
  }
};

const validateRpcUrl = (
  envUrl: string | undefined,
  fallbackUrl: string,
): string => {
  if (!envUrl) return fallbackUrl;

  return validateUrl(
    envUrl,
    fallbackUrl,
  );
};

const connectors = [
  injected(),
] as any[];

if (projectId) {
  connectors.push(
    walletConnect({
      projectId,

      metadata: {
        name: "Code Ascension",

        description:
          "Offline AI-powered cyberpunk learning roguelike",

        url: validateUrl(
          appUrl,
          "https://code-ascention.com.br",
        ),

        icons: [
          validateUrl(
            `${appUrl}/icons/icon-192.png`,
            "https://code-ascention.com.br/icons/icon-192.png",
          ),
        ],
      },
    }),
  );
} else {
  console.warn(
    "[WALLETCONNECT DISABLED] Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
  );
}

export const walletConfig =
  createConfig({
    chains: [
      mainnet,
      polygon,
      arbitrum,
      base,
    ],

    connectors,

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
