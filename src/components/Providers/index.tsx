"use client";
import type { PropsWithChildren } from "react";
import WagmiProvider from "./WagmiProvider";
import { SolanaWalletProvider } from "../SolanaWalletProvider";

const Providers = ({ children }: PropsWithChildren) => {
  return (
    <WagmiProvider>
      <SolanaWalletProvider>
        {children}
      </SolanaWalletProvider>
    </WagmiProvider>
  );
};

export default Providers;
