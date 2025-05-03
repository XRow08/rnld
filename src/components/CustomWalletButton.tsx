"use client";

import { FC, useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

interface CustomWalletButtonProps {
  className?: string;
}

export const CustomWalletButton: FC<CustomWalletButtonProps> = ({
  className = "",
}) => {
  const { publicKey, wallet, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const connected = !!publicKey;

  const buttonClass = useMemo(() => {
    const baseClass = `py-2 px-4 rounded-md font-medium transition-all duration-200 ${className}`;
    return connected
      ? `${baseClass} bg-gray-700 hover:bg-gray-600 text-white`
      : `${baseClass} !bg-[rgb(247,216,111)] hover:!bg-yellow-700 text-black`;
  }, [className, connected]);

  const content = useMemo(() => {
    if (connected) {
      const base58 = publicKey.toBase58();
      const shortAddress = base58.slice(0, 4) + ".." + base58.slice(-4);
      return wallet?.adapter?.name + ": " + shortAddress;
    }

    return "Connect Wallet";
  }, [publicKey, wallet, connected]);

  const handleClick = useCallback(() => {
    if (connected) {
      disconnect().catch(() => {
        // Ignore disconnection errors
      });
    } else {
      setVisible(true);
    }
  }, [connected, setVisible, disconnect]);

  return (
    <button className={buttonClass} onClick={handleClick}>
      {content}
    </button>
  );
};
