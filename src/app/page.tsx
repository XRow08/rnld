"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SignMessage } from "@/components/SignMessage";
import { TokenBalance } from "@/components/TokenBalance";
import { EVMAddressForm } from "@/components/EVMAddressForm";
import { DebugSnapshot } from "@/components/DebugSnapshot";

require("@solana/wallet-adapter-react-ui/styles.css");

const SolanaWalletPage = () => {
  const { publicKey, connected } = useWallet();
  const [evmAddress, setEvmAddress] = useState<string>("");
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [isStoredSuccessfully, setIsStoredSuccessfully] =
    useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isWalletInSnapshot, setIsWalletInSnapshot] = useState<boolean>(false);
  const [snapshotBalance, setSnapshotBalance] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const TOKEN_CONTRACT = "8hCYPHGC73UxC7gqLDMBHQvgVmtQ6fryCq49tJMCP55D";
  const BSC_CONTRACT = "0x8B9ABDD229ec0C4A28E01b91aacdC5dAAFc25C2b";

  useEffect(() => {
    if (connected && publicKey) {
      setCurrentStep(1);
      // Verificar se o endereço está no snapshot quando conectado
      checkWalletInSnapshot(publicKey.toString());
    } else {
      setCurrentStep(0);
    }
  }, [connected, publicKey]);

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

  // Função para verificar se a carteira está no snapshot usando a API
  const checkWalletInSnapshot = async (solanaAddress: string) => {
    if (!solanaAddress) return;

    setIsLoading(true);
    console.log("Verificando carteira no snapshot:", solanaAddress);

    try {
      // Chamar a API para verificar no servidor
      const response = await fetch(
        `/api/wallet-mapping?address=${solanaAddress}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Resposta da API de check:", data);

        if (data.found) {
          setIsWalletInSnapshot(true);
          // Definir o saldo do snapshot - se houver
          if (data.record && data.record.balance) {
            console.log("Saldo encontrado no snapshot:", data.record.balance);
            setSnapshotBalance(data.record.balance);
          } else {
            console.log("Carteira encontrada, mas sem saldo definido");
            setSnapshotBalance("0"); // valor padrão
          }
        } else {
          console.log("Carteira não encontrada no snapshot");
          setIsWalletInSnapshot(false);
          setSnapshotBalance(null);
        }
      } else {
        console.error("Erro ao consultar API:", await response.text());
        setIsWalletInSnapshot(false);
        setSnapshotBalance(null);
      }
    } catch (error) {
      console.error("Erro ao verificar wallet no snapshot:", error);
      setIsWalletInSnapshot(false);
      setSnapshotBalance(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (evmAddress: string) => {
    if (!publicKey) {
      return;
    }

    setEvmAddress(evmAddress);
    setIsLoading(true);

    try {
      // Verificar novamente se a carteira está no snapshot
      await checkWalletInSnapshot(publicKey.toString());

      // Log de debug para os valores
      console.log("Estado atual antes de salvar:", {
        isWalletInSnapshot,
        snapshotBalance,
        tokenBalance,
      });

      // Se a carteira não estiver no snapshot, mostrar aviso mas continuar
      if (!isWalletInSnapshot) {
        console.log(
          "Aviso: Wallet não encontrada no snapshot, mas continuando com o registro"
        );
      }

      // Salvar o mapeamento usando a API
      const response = await fetch("/api/wallet-mapping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          solanaAddress: publicKey.toString(),
          evmAddress,
          tokenAmount: tokenBalance || 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao salvar mapeamento");
      }

      const data = await response.json();

      // Adicionar log para depuração
      console.log("Resposta da API de salvar:", data);

      // Atualizar o estado com base na resposta da API - forçando como booleano
      const walletFound = data.inSnapshot === true;
      console.log("Wallet encontrada no snapshot:", walletFound);

      setIsWalletInSnapshot(walletFound);

      // Atualizar o saldo se veio na resposta
      if (walletFound && data.balance) {
        console.log("Atualizando saldo com o valor da resposta:", data.balance);
        setSnapshotBalance(data.balance);
      }

      // Armazenar localmente também para referência
      localStorage.setItem(publicKey.toString(), evmAddress);
      setIsStoredSuccessfully(true);
    } catch (error: any) {
      console.error("Erro ao processar operação:", error);
    } finally {
      setIsLoading(false);
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

    // Verificar se a carteira está no snapshot quando o saldo é atualizado
    if (publicKey) {
      checkWalletInSnapshot(publicKey.toString());
    }
  };

  // Toggle modo debug com clique no footer
  const handleDebugClick = () => {
    setShowDebug(!showDebug);
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
                allow you to verify your STAR10 tokens and link your EVM
                address.
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
                Check your STAR10 token balance on the Solana blockchain. This
                is the official token of Ronaldinho Gaúcho.
              </p>
              <TokenBalance
                tokenAddress={TOKEN_CONTRACT}
                onBalanceUpdate={handleBalanceUpdate}
              />

              {isLoading && (
                <div className="mt-4 p-4 bg-gray-900 bg-opacity-50 border border-gray-500 text-gray-300 rounded-md flex items-center">
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
                  <span>Verificando carteira no snapshot...</span>
                </div>
              )}

              {isWalletInSnapshot && snapshotBalance && !isLoading && (
                <div className="mt-4 p-4 bg-yellow-900 bg-opacity-30 border border-yellow-500 text-yellow-400 rounded-md">
                  <p className="font-bold">Found in Snapshot!</p>
                  <p className="text-sm mt-1">
                    Your wallet has a balance of {snapshotBalance} STAR10.
                  </p>
                </div>
              )}

              {!isWalletInSnapshot && !isLoading && tokenBalance !== null && (
                <div className="mt-4 p-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-400 rounded-md">
                  <p className="font-bold">Wallet Not Found!</p>
                  <p className="text-sm mt-1">
                    Your wallet was not found. Please make sure you're
                    connecting the correct wallet address.
                  </p>
                </div>
              )}

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
                Provide your EVM wallet address (Ethereum, Binance Smart Chain,
                etc.) to receive your STAR10 tokens.
                {tokenBalance ? (
                  <span className="block mt-1 font-semibold text-yellow-400">
                    Your {tokenBalance} STAR10 tokens will be registered for
                    distribution on the EVM network.
                  </span>
                ) : (
                  <span className="block mt-1">
                    You don't have any STAR10 tokens to transfer.
                  </span>
                )}
              </p>

              {!isWalletInSnapshot && !isLoading && (
                <div className="mb-4 p-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-400 rounded-md">
                  <p className="font-bold">Wallet Not Found!</p>
                  <p className="text-sm mt-1">
                    Your wallet was not found in our records. You can still
                    provide an EVM address, but please note it won't be
                    processed for token distribution.
                  </p>
                </div>
              )}

              {!isStoredSuccessfully ? (
                <EVMAddressForm
                  onSubmit={handleFormSubmit}
                  isSubmitting={isLoading}
                />
              ) : null}

              {isStoredSuccessfully && (
                <div
                  className={`mt-4 p-4 ${
                    isWalletInSnapshot
                      ? "bg-green-900 bg-opacity-30 border border-green-500 text-green-400"
                      : "bg-yellow-900 bg-opacity-30 border border-yellow-500 text-yellow-400"
                  } rounded-md`}
                >
                  <p className="font-bold flex items-center">
                    <span className="mr-2 text-lg break-all">
                      {isWalletInSnapshot ? "✓" : "⚠️"}
                    </span>
                    {isWalletInSnapshot
                      ? "Mapping completed successfully!"
                      : "Address registered, but not in snapshot!"}
                  </p>
                  <p className="text-sm mt-2 break-all">
                    Solana: {publicKey?.toString()}
                  </p>
                  <p className="text-sm break-all">EVM: {evmAddress}</p>

                  {isWalletInSnapshot && (
                    <p className="text-sm mt-2">
                      <span className="font-semibold">Balance:</span>{" "}
                      {snapshotBalance || 0} STAR10
                    </p>
                  )}

                  {!isWalletInSnapshot && (
                    <div className="mt-3 pt-3 border-t border-yellow-700">
                      <p className="text-sm">
                        Your wallet was not found in our records. Your address
                        has been registered, but it won't be included in the
                        token distribution.
                      </p>
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

          {/* Debug só para desenvolvimento - não necessário em produção */}
          {process.env.NODE_ENV === "development" && showDebug && (
            <>
              <DebugSnapshot />
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <h3 className="text-yellow-400 font-bold mb-2">Debug Tools</h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() =>
                      checkWalletInSnapshot(
                        "EXcnbXE1UPzZCjxVYgR9CCLZJxgHfAapP1V3wTZR2XXk"
                      )
                    }
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs"
                  >
                    Check Test Wallet 1
                  </button>
                  <button
                    onClick={() =>
                      checkWalletInSnapshot(
                        "D7Qk5aUtRbmYasie9gXHiKKdp6T2jHs2MrJjKj2UYBz4"
                      )
                    }
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs"
                  >
                    Check Test Wallet 2
                  </button>
                  <button
                    onClick={() => checkWalletInSnapshot("TEST123")}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs"
                  >
                    Check Test Wallet 3
                  </button>
                  <button
                    onClick={() => {
                      console.log('Estado atual:', { 
                        isWalletInSnapshot, 
                        snapshotBalance, 
                        tokenBalance, 
                        isStoredSuccessfully 
                      });
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded-md text-xs"
                  >
                    Log Estado
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        // Criar URL com um parâmetro de timestamp para evitar cache
                        const url = `/api/wallet-mapping?t=${Date.now()}`;
                        const response = await fetch(url);
                        const data = await response.json();
                        console.log('Debug API:', data);
                        
                        // Se tiver uma carteira conectada, verificar novamente
                        if (publicKey) {
                          setTimeout(() => {
                            checkWalletInSnapshot(publicKey.toString());
                          }, 500);
                        }
                      } catch (error) {
                        console.error('Erro ao fazer debug da API:', error);
                      }
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded-md text-xs"
                  >
                    Debug API
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="py-8 px-4 text-center text-sm text-gray-400 border-t border-gray-800 bg-black">
        <div className="max-w-4xl mx-auto">
          <p onClick={handleDebugClick}>
            $STAR10 - The official token of Ronaldinho Gaúcho
          </p>
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
