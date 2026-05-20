"use client";

import { createConfig, http } from "wagmi";

import {
  mainnet,
  polygon,
  arbitrum,
  base,
} from "wagmi/chains";

import {
  injected,
  walletConnect,
} from "wagmi/connectors";

const projectId =
  process.env
    .NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error(
    "Missing WalletConnect Project ID"
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

    connectors: [
      injected(),

      walletConnect({
        projectId,
      }),
    ],

    transports: {
      [mainnet.id]: http(
        process.env
          .NEXT_PUBLIC_ETH_RPC
      ),

      [polygon.id]: http(
        process.env
          .NEXT_PUBLIC_POLYGON_RPC
      ),

      [arbitrum.id]: http(
        process.env
          .NEXT_PUBLIC_ARBITRUM_RPC
      ),

      [base.id]: http(
        process.env
          .NEXT_PUBLIC_BASE_RPC
      ),
    },
  });