"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';

interface ConnectEVMWalletProps {
  onAddressChange: (address: string | undefined) => void;
}

export const ConnectEVMWallet = ({ onAddressChange }: ConnectEVMWalletProps) => {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    onAddressChange(address);
  }, [address, onAddressChange]);

  return (
    <div className="flex flex-col space-y-4">
      <h3 className="text-lg font-medium text-[rgb(247,216,111)]">Connect EVM Wallet</h3>
      <p className="text-sm text-gray-300">
        Connect your EVM wallet (including Ledger hardware wallet) to claim your STAR10 tokens
      </p>
      <div className="flex">
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            return (
              <div
                {...(!mounted && {
                  'aria-hidden': true,
                  'style': {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!mounted || !account || !chain) {
                    return (
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="bg-[rgb(247,216,111)] hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg transition-all"
                      >
                        Connect EVM Wallet
                      </button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <button
                        onClick={openChainModal}
                        type="button"
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
                      >
                        Wrong Network
                      </button>
                    );
                  }

                  return (
                    <div className="flex gap-3">
                      <button
                        onClick={openChainModal}
                        type="button"
                        className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center"
                      >
                        {chain.name}
                      </button>

                      <button
                        onClick={openAccountModal}
                        type="button"
                        className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                      >
                        {account.displayName}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </div>
  );
}; 