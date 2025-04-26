"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface ClaimButtonProps {
  snapshotBalance: string | null;
  evmAddress: string;
  merkleProof: string[] | null;
  isEnabled: boolean;
}

export const ClaimButton = ({
  snapshotBalance,
  evmAddress,
  merkleProof,
  isEnabled,
}: ClaimButtonProps) => {
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [claimStatus, setClaimStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleClaim = async () => {
    if (!publicKey || !evmAddress || !merkleProof || !isEnabled) return;

    /* setIsLoading(true);
    setClaimStatus("pending"); */

    try {
     /*  const response = await fetch("/api/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          solanaAddress: publicKey.toString(),
          evmAddress,
          balance: snapshotBalance,
          merkleProof,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process claim");
      }

      const data = await response.json();
      
      // Set transaction hash from the response or generate a random one for demo
      setTxHash(data.txHash || "0x" + Math.random().toString(16).substring(2, 10));
      setClaimStatus("success"); */
      
    } catch (error) {
      console.error("Error processing claim:", error);
      setClaimStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 border border-[rgb(247,216,111)] rounded-lg p-6 bg-gray-900 bg-opacity-80">
      <h3 className="text-xl font-bold text-[rgb(247,216,111)] mb-4">
        Claim Your STAR10 Tokens
      </h3>
      <p className="text-gray-300 mb-4">
        Click the button below to request the transfer of your STAR10 tokens from 
        Solana to your address {evmAddress ? <span className="text-[rgb(247,216,111)]">{evmAddress.substring(0, 8)}...{evmAddress.substring(evmAddress.length - 6)}</span> : ""} on BSC.
      </p>
      
      {snapshotBalance && (
        <div className="p-4 bg-yellow-900 bg-opacity-30 border border-[rgb(247,216,111)] text-[rgb(247,216,111)] rounded-md mb-4">
          <p className="font-bold">Available Balance for Claim</p>
          <p className="text-2xl font-bold mt-1">{snapshotBalance} STAR10</p>
        </div>
      )}

      {!isEnabled && (
        <div className="mb-4 p-4 bg-gray-800 bg-opacity-70 border border-gray-700 text-gray-400 rounded-md">
          <p className="font-bold">Claim Disabled</p>
          <p className="text-sm mt-1">
            To enable claiming, you need to:
            <ul className="ml-5 mt-2 list-disc">
              <li>Connect your Solana wallet</li>
              <li>Verify your wallet ownership</li>
              <li>Have STAR10 tokens in snapshot</li>
              <li>Register your EVM address</li>
            </ul>
          </p>
        </div>
      )}

      <button
        onClick={handleClaim}
        disabled={isLoading || claimStatus === "success" || !isEnabled}
        className={`w-full py-3 px-4 rounded-lg font-bold transition-all duration-300 
          ${isLoading ? "bg-gray-600 cursor-wait" : 
            claimStatus === "success" ? "bg-green-600 hover:bg-green-700" : 
            !isEnabled ? "bg-gray-700 text-gray-400 cursor-not-allowed" :
            "bg-[rgb(247,216,111)] hover:bg-yellow-700 text-black"}`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </div>
        ) : claimStatus === "success" ? (
          "Claim Processed Successfully!"
        ) : (
          "Claim STAR10 Tokens"
        )}
      </button>

      {claimStatus === "success" && txHash && (
        <div className="mt-4 p-4 bg-green-900 bg-opacity-30 border border-green-500 text-green-400 rounded-md">
          <p className="font-bold">Transaction Sent!</p>
          <p className="text-sm mt-1">
            Your claim has been processed successfully. The token transfer will be completed soon.
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
            An error occurred while processing your claim. Please try again later or contact support.
          </p>
        </div>
      )}
    </div>
  );
}; 