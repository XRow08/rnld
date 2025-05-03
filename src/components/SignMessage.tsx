"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

interface SignMessageProps {
  onSignatureVerified: () => void;
}

export const SignMessage = ({ onSignatureVerified }: SignMessageProps) => {
  const { publicKey, signMessage, wallet } = useWallet();
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSign = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!publicKey || !signMessage) {
        setError("Wallet not connected or doesn't support message signing");
        setIsLoading(false);
        return;
      }

      // Mensagem mais específica (incluindo nome da carteira, se disponível)
      const walletName = wallet?.adapter?.name || "your wallet";
      const message = new TextEncoder().encode(
        `Verify ownership of ${walletName} (${publicKey.toString()})`
      );

      const signatureBytes = await signMessage(message);
      const signatureBase58 = bs58.encode(signatureBytes);
      
      setSignature(signatureBase58);
      setError(null);
      onSignatureVerified();
    } catch (err: any) {
      console.error("Error signing message:", err);
      
      // Mensagens de erro mais específicas
      if (err.name === "WalletSignMessageError") {
        setError("Error during message signing. Please try again.");
      } else if (err.message && err.message.includes("cancelled")) {
        setError("You cancelled the signing request.");
      } else if (err.message && err.message.includes("timeout")) {
        setError("Signing request timed out. For hardware wallets like Ledger, ensure the Solana app is open and in the correct mode.");
      } else if (err.message && err.message.toLowerCase().includes("ledger")) {
        setError("Ledger issue: Ensure Solana app is open, contract data is allowed, and blind signing is enabled.");
      } else if (err.message && err.message.toLowerCase().includes("hardware")) {
        setError("Hardware wallet issue: Ensure the device is connected and the Solana app is open.");
      } else {
        setError(err.message || "Error signing message. Please try again.");
      }
      
      setSignature(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button 
        onClick={handleSign} 
        disabled={isLoading}
        className={`w-full py-3 ${isLoading ? 'bg-gray-500' : 'bg-[rgb(247,216,111)]'} text-black font-bold rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            SIGNING...
          </>
        ) : (
          'SIGN MESSAGE'
        )}
      </button>
      
      {error && (
        <div className="mt-2 p-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-400 rounded-md">
          <p className="flex items-center">
            <span className="mr-2">⚠️</span>
            {error}
          </p>
          {(error.toLowerCase().includes("ledger") || error.toLowerCase().includes("hardware")) && (
            <ul className="text-xs mt-2 list-disc pl-5">
              <li>Ensure your device is connected</li>
              <li>Open the Solana app on your device</li>
              <li>Make sure you've allowed contract data in Solana app settings</li>
              <li>Try reconnecting your wallet</li>
            </ul>
          )}
        </div>
      )}
      
      {signature && (
        <div className="mt-2 p-4 bg-green-900 bg-opacity-30 border border-green-500 text-green-400 rounded-md">
          <p className="flex items-center">
            <span className="mr-2">✓</span>
            Signature verified successfully!
          </p>
        </div>
      )}
    </div>
  );
}; 