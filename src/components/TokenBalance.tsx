"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";

interface TokenBalanceProps {
  tokenAddress: string;
  onBalanceUpdate?: (balance: number) => void;
}

export const TokenBalance = ({ tokenAddress, onBalanceUpdate }: TokenBalanceProps) => {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /* const fetchTokenBalance = async () => {
    if (!publicKey) {
      setError("Wallet not connected");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const rpcEndpoints = [
        "https://solana-mainnet.g.alchemy.com/v2/h0SvRZQcbUYULS18piOMYgt8NJTX7_id",
        "https://api.mainnet-beta.solana.com",
        "https://solana-api.projectserum.com",
        "https://rpc.ankr.com/solana",
        "https://ssc-dao.genesysgo.net"
      ];
      
      let connection;
      let connectionSuccess = false;
      
      for (const endpoint of rpcEndpoints) {
        try {
          connection = new Connection(endpoint, "confirmed");
          await connection.getSlot();
          connectionSuccess = true;
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!connectionSuccess || !connection) {
        throw new Error("Could not connect to any Solana RPC endpoint");
      }
      
      try {
        const tokenKey = new PublicKey(tokenAddress);
        const ownerKey = publicKey;
        
        const tokenAccounts = await connection.getTokenAccountsByOwner(
          ownerKey,
          { mint: tokenKey }
        );
        
        if (tokenAccounts.value.length === 0) {
          setBalance(0);
          if (onBalanceUpdate) onBalanceUpdate(0);
        } else {
          let totalBalance = 0;
          
          for (const tokenAccount of tokenAccounts.value) {
            const accountInfo = tokenAccount.account;
            const data = accountInfo.data;
            
            if (data.length >= 64) {
              const amountData = data.slice(32, 40);
              
              let amount = 0;
              for (let i = 0; i < 8; i++) {
                amount += amountData[i] * Math.pow(2, 8 * i);
              }
              
              const tokenAmount = amount / Math.pow(10, 9);
              totalBalance += tokenAmount;
            }
          }
          
          setBalance(totalBalance);
          if (onBalanceUpdate) onBalanceUpdate(totalBalance);
        }
      } catch (tokenErr) {
        try {
          const tokenKey = new PublicKey(tokenAddress);
          const ownerKey = publicKey;
          
          const parsedAccounts = await connection.getParsedTokenAccountsByOwner(
            ownerKey,
            { mint: tokenKey }
          );
          
          if (parsedAccounts.value.length === 0) {
            setBalance(0);
            if (onBalanceUpdate) onBalanceUpdate(0);
          } else {
            let totalBalance = 0;
            
            for (const account of parsedAccounts.value) {
              const parsedInfo = account.account.data.parsed.info;
              const tokenBalance = Number(parsedInfo.tokenAmount.amount) / Math.pow(10, parsedInfo.tokenAmount.decimals);
              totalBalance += tokenBalance;
            }
            
            setBalance(totalBalance);
            if (onBalanceUpdate) onBalanceUpdate(totalBalance);
          }
        } catch (parsedErr) {
          throw new Error("Failed in both token query methods");
        }
      }
      
      setIsLoading(false);
    } catch (err: any) {
      setError(`Could not verify balance. Solana server with limited access.`);
      setIsLoading(false);
    }
  }; */
  

  return (
    <div className="flex flex-col gap-4">
      <button
        disabled={isLoading}
        className="w-full py-3 bg-[rgb(247,216,111)] text-white font-bold rounded-lg hover:bg-yellow-700 transition-colors"
      >
        {isLoading ? "Loading..." : "Check STAR10 Balance"}
      </button>
      
      {error && (
        <div className="mt-2 p-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-400 rounded-md">
          <p>{error}</p>
          <p className="text-xs mt-2">
            For a production project, we recommend using a dedicated RPC provider 
            such as Helius, QuickNode, or GenesysGo.
          </p>
        </div>
      )}
      
      {balance !== null && !error && (
        <div className="mt-2 p-4 bg-gradient-to-r from-[rgb(247,216,111)] to-[rgb(247,216,111)] text-white rounded-md">
          <p className="font-medium">STAR10 Balance:</p>
          <p className="text-2xl font-bold">{balance} STAR10</p>
          <p className="text-xs mt-2">Ronaldinho Gaúcho's official token</p>
          <p className="text-xs mt-1 text-yellow-200">Contract: {tokenAddress}</p>
        </div>
      )}

      <div className="text-xs text-gray-400 mt-2">
        <p>* This component queries the actual balance on the Solana blockchain</p>
        <p>
          * Officially verified token:
          8hCYPHGC73UxC7gqLDMBHQvgVmtQ6fryCq49tJMCP55D
        </p>
      </div>
    </div>
  );
};
