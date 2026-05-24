"use client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  WagmiProvider,
} from "wagmi";

import {
  walletConfig,
} from "../lib/web3/wallet";
import React from "react";


const queryClient =
  new QueryClient();

export default function Web3Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = React.useState(
    () => new QueryClient()
  );

  return (
    <WagmiProvider config={walletConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}