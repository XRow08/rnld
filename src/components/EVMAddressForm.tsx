"use client";

import { useState } from "react";

interface EVMAddressFormProps {
  onSubmit: (address: string) => void;
  isSubmitting?: boolean;
}

export const EVMAddressForm = ({ onSubmit, isSubmitting = false }: EVMAddressFormProps) => {
  const [address, setAddress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    
    if (!evmAddressRegex.test(address)) {
      setError("Please enter a valid EVM address (0x followed by 40 hexadecimal characters)");
      return;
    }
    
    setError(null);
    onSubmit(address);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label htmlFor="evmAddress" className="block text-sm font-medium text-yellow-400 mb-1">
          EVM Address to Receive Tokens
        </label>
        <input
          id="evmAddress"
          type="text"
          placeholder="0x..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={isSubmitting}
          className="w-full p-3 bg-gray-800 border border-[rgb(247,216,111)] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[rgb(247,216,111)]"
        />
        {error && (
          <p className="text-red-500 text-sm mt-1">{error}</p>
        )}
      </div>
      
      <button 
        type="submit" 
        disabled={isSubmitting}
        className={`w-full py-3 bg-[rgb(247,216,111)] text-white font-bold rounded-lg hover:bg-yellow-700 transition-colors mt-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isSubmitting ? "PROCESSING..." : "SAVE ADDRESS"}
      </button>
    </form>
  );
}; 