"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

interface SignMessageProps {
  onSignatureVerified: () => void;
}

export const SignMessage = ({ onSignatureVerified }: SignMessageProps) => {
  const { publicKey, signMessage } = useWallet();
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSign = async () => {
    try {
      if (!publicKey || !signMessage) {
        setError("Wallet not connected!");
        return;
      }

      const message = new TextEncoder().encode(
        `Verify wallet ownership: ${publicKey.toString()}`
      );

      const signatureBytes = await signMessage(message);
      const signatureBase58 = bs58.encode(signatureBytes);
      
      setSignature(signatureBase58);
      setError(null);
      onSignatureVerified();
    } catch (err: any) {
      setError(err.message || "Error signing message");
      setSignature(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button 
        onClick={handleSign} 
        className="w-full py-3 bg-[rgb(247,216,111)] text-black font-bold rounded-lg hover:bg-yellow-700 transition-colors"
      >
        SIGN MESSAGE
      </button>
      
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
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