"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectEVMWallet } from "./ConnectEVMWallet";

interface ClaimButtonProps {
  snapshotBalance: string | null;
  evmAddress?: string;
  merkleProof: string[] | null;
  isEnabled: boolean;
  onEVMAddressChange?: (address: string | undefined) => void;
}

// Interface for airdrop data
interface AirdropData {
  root: string;
  address: string;
  value: string;
  proof: string[];
  leafIndex: number;
}

export const ClaimButton = ({
  snapshotBalance,
  evmAddress,
  isEnabled,
  onEVMAddressChange,
}: ClaimButtonProps) => {
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [claimStatus, setClaimStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [connectedEVMAddress, setConnectedEVMAddress] = useState<string | undefined>(evmAddress);

  const handleClaim = async () => {
    if (!publicKey || !connectedEVMAddress) return;
    
    setIsLoading(true);
    setClaimStatus("pending");

    try {
      // Here you would implement the actual claim functionality
      // For example, call a smart contract or API to process the claim
      console.log("Claiming with Solana publicKey:", publicKey.toString());
      console.log("Claiming for EVM address:", connectedEVMAddress);
      
      // Mock successful transaction for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Set fake transaction hash for demonstration
      setTxHash("0x" + Math.random().toString(16).substr(2, 64));
      setClaimStatus("success");
    } catch (error) {
      console.error("Error processing claim:", error);
      setClaimStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleClaim();
  }, [publicKey]);
  
  // Handle EVM address changes and propagate to parent
  useEffect(() => {
    setConnectedEVMAddress(evmAddress);
  }, [evmAddress]);
  
  const handleEVMAddressChange = (address: string | undefined) => {
    setConnectedEVMAddress(address);
    if (onEVMAddressChange) {
      onEVMAddressChange(address);
    }
  };

  return (
    <div className="mt-8 border border-[rgb(247,216,111)] rounded-lg p-6 bg-gray-900 bg-opacity-80">
      <h3 className="text-xl font-bold text-[rgb(247,216,111)] mb-4">
        Claim Your STAR10 Tokens
      </h3>
      <p className="text-gray-300 mb-4">
        Connect your EVM wallet and click the button below to request the transfer of your STAR10 tokens to
        your address on BSC at TGE.
      </p>
      
      {/* EVM Wallet Connection */}
      <div className="mb-6 p-4 bg-gray-800 bg-opacity-70 border border-gray-700 rounded-md">
        <ConnectEVMWallet onAddressChange={handleEVMAddressChange} />
      </div>
      
      {connectedEVMAddress && (
        <div className="p-4 bg-green-900 bg-opacity-30 border border-green-600 text-green-400 rounded-md mb-4">
          <p className="font-bold">EVM Wallet Connected</p>
          <p className="text-sm mt-1 break-all">Address: {connectedEVMAddress}</p>
        </div>
      )}

      {snapshotBalance && (
        <div className="p-4 bg-yellow-900 bg-opacity-30 border border-[rgb(247,216,111)] text-[rgb(247,216,111)] rounded-md mb-4">
          <p className="font-bold">Available Balance for Claim</p>
          <p className="text-2xl font-bold mt-1">{snapshotBalance} STAR10</p>
        </div>
      )}

      {(!isEnabled || !publicKey || !connectedEVMAddress) && (
        <div className="mb-4 p-4 bg-gray-800 bg-opacity-70 border border-gray-700 text-gray-400 rounded-md">
          <p className="font-bold">Claim Disabled</p>
          <p className="text-sm mt-1">
            To enable claiming, be sure to:
            <ul className="ml-5 mt-2 list-disc">
              <li>
                Connect your Solana wallet if you are a Solana holder on the
                delegation step {!publicKey && <span className="text-red-400"> - Required</span>}
              </li>
              <li>
                Connect your BSC wallet after the delegation for Solana holders
                or if you are a BSC holder {!connectedEVMAddress && <span className="text-red-400"> - Required</span>}
              </li>
              <li>Verify your wallet ownership</li>
              <li>Have STAR10 tokens in snapshot</li>
              <li>Claim tokens at TGE</li>
            </ul>
          </p>
        </div>
      )}

      <button
        onClick={handleClaim}
        disabled={isLoading || claimStatus === "success" || !isEnabled || !connectedEVMAddress || !publicKey}
        className={`w-full py-3 px-4 rounded-lg font-bold transition-all duration-300 
          ${
            isLoading
              ? "bg-gray-600 cursor-wait"
              : claimStatus === "success"
              ? "bg-green-600 hover:bg-green-700"
              : !publicKey
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : !connectedEVMAddress
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : !isEnabled
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : "bg-[rgb(247,216,111)] hover:bg-yellow-700 text-black"
          }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5 mr-2"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Processing...</span>
          </div>
        ) : claimStatus === "success" ? (
          "Claim Processed Successfully!"
        ) : !publicKey ? (
          "Connect Solana Wallet First"
        ) : !connectedEVMAddress ? (
          "Connect BSC Wallet to Claim"
        ) : !isEnabled ? (
          "Claiming Not Available"
        ) : (
          "Claim STAR10 Tokens"
        )}
      </button>

      {claimStatus === "success" && txHash && (
        <div className="mt-4 p-4 bg-green-900 bg-opacity-30 border border-green-500 text-green-400 rounded-md">
          <p className="font-bold">Transaction Sent!</p>
          <p className="text-sm mt-1">
            Your claim has been processed successfully. The token transfer will
            be completed soon.
          </p>
          <p className="text-sm mt-1 break-all">
            <span className="font-semibold">TX Hash:</span> {txHash}
          </p>
        </div>
      )}

      {claimStatus === "error" && (
        <div className="mt-4 p-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-400 rounded-md">
          <p className="font-bold">Error Processing Claim</p>
          <p className="text-sm mt-1">
            An error occurred while processing your claim. Please try again
            later or contact support.
          </p>
        </div>
      )}
    </div>
  );
};
