"use client";
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import * as viemChains from "viem/chains";
import { PropsWithChildren } from "react";
import { WagmiProvider } from "wagmi";
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  okxWallet,
  coinbaseWallet,
  rainbowWallet,
  trustWallet,
  ledgerWallet,
  braveWallet,
  safeWallet,
  imTokenWallet,
} from "@rainbow-me/rainbowkit/wallets";

export default function WagmiProv({ children }: PropsWithChildren) {
  const config = getDefaultConfig({
    appName: "FIDC",
    projectId: "4ebbf2eddb8738c4c84cd8082b5e9756",
    chains: [viemChains.bsc],
    ssr: true,
    wallets: [
      {
        groupName: "Popular Wallets",
        wallets: [
          injectedWallet,
          metaMaskWallet,
          okxWallet,
          walletConnectWallet,
          coinbaseWallet,
          rainbowWallet,
          trustWallet,
          braveWallet,
          imTokenWallet,
        ],
      },
      {
        groupName: "Hardware Wallets",
        wallets: [ledgerWallet, safeWallet],
      },
    ],
  });

  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          coolMode
          showRecentTransactions={true}
          theme={darkTheme()}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
