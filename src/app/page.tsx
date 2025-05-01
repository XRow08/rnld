"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SignMessage } from "@/components/SignMessage";
import { EVMAddressForm } from "@/components/EVMAddressForm";
import { ClaimButton } from "@/components/ClaimButton";
import { FaDiscord, FaTelegramPlane } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import Link from "next/link";
import { ClaimStep } from "@/components/ClaimStep";

require("@solana/wallet-adapter-react-ui/styles.css");

const SolanaWalletPage = () => {
  const { publicKey, connected } = useWallet();
  const [evmAddress, setEvmAddress] = useState<string>("");
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [isStoredSuccessfully, setIsStoredSuccessfully] =
    useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isWalletInSnapshot, setIsWalletInSnapshot] = useState<boolean>(false);
  const [snapshotBalance, setSnapshotBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [merkleProof, setMerkleProof] = useState<string[] | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<string>("unknown");
  const [publicTag, setPublicTag] = useState<string | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
  const [merkleLeaves, setMerkleLeaves] = useState<any[] | null>(null);
  const [merkleTree, setMerkleTree] = useState<any | null>(null);
  const [showClaimStep, setShowClaimStep] = useState<boolean>(false);
  const [isClaimEnabled, setIsClaimEnabled] = useState<boolean>(false);
  const [hasExistingEvm, setHasExistingEvm] = useState<boolean>(false);
  const [existingEvmAddress, setExistingEvmAddress] = useState<string | null>(null);

  const TOKEN_CONTRACT = "8hCYPHGC73UxC7gqLDMBHQvgVmtQ6fryCq49tJMCP55D";
  const BSC_CONTRACT = "0x8B9ABDD229ec0C4A28E01b91aacdC5dAAFc25C2b";

  useEffect(() => {
    if (connected && publicKey) {
      setCurrentStep(1);
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
    try {
      const response = await fetch(
        `/api/wallet-mapping?address=${solanaAddress}`
      );

      if (response.ok) {
        const data = await response.json();

        if (data.found) {
          setIsWalletInSnapshot(true);
          
          // Verificar se já existe um endereço EVM mapeado
          const hasEvm = data.hasEVM || false;
          setHasExistingEvm(hasEvm);
          
          if (data.record && data.record.balance) {
            setSnapshotBalance(data.record.balance);
          } else {
            setSnapshotBalance("0");
          }
          
          if (data.record && data.record.publicTag) {
            setPublicTag(data.record.publicTag);
          } else {
            setPublicTag(null);
          }
          
          // Armazenar o endereço EVM existente, se houver
          if (hasEvm && data.record && data.record.evmAddress) {
            setExistingEvmAddress(data.record.evmAddress);
            console.log("Existing EVM address:", data.record.evmAddress);
          } else {
            setExistingEvmAddress(null);
          }
          
          if (data.merkleProof) {
            setMerkleProof(data.merkleProof);
            setMerkleRoot(data.root);
            setMerkleLeaves(data.leafs);
            setMerkleTree(data.tree);
            setVerificationMethod("merkle");
          } else {
            setMerkleProof(null);
            setVerificationMethod("csv");
          }
          
          // Se já tiver EVM mapeado, mostrar mensagem
          if (hasEvm) {
            console.log("This Solana address already has an EVM address mapped");
          }
        } else {
          setIsWalletInSnapshot(false);
          setSnapshotBalance(null);
          setMerkleProof(null);
          setVerificationMethod("unknown");
          setPublicTag(null);
          setHasExistingEvm(false);
          setExistingEvmAddress(null);
          console.log("Solana address not found in snapshot");
        }
      } else {
        console.error("Erro ao consultar API:", await response.text());
        setIsWalletInSnapshot(false);
        setSnapshotBalance(null);
        setMerkleProof(null);
        setVerificationMethod("unknown");
        setPublicTag(null);
        setHasExistingEvm(false);
        setExistingEvmAddress(null);
      }
    } catch (error) {
      console.error("Erro ao verificar wallet no snapshot:", error);
      setIsWalletInSnapshot(false);
      setSnapshotBalance(null);
      setMerkleProof(null);
      setVerificationMethod("unknown");
      setPublicTag(null);
      setHasExistingEvm(false);
      setExistingEvmAddress(null);
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
      // Verificar se a carteira Solana está no snapshot
      await checkWalletInSnapshot(publicKey.toString());

      // Se a carteira não estiver no snapshot, não permitir salvar
      if (!isWalletInSnapshot) {
        console.log("Wallet não encontrada no snapshot. Não é possível salvar a carteira EVM.");
        return;
      }

      const response = await fetch("/api/wallet-mapping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          solanaAddress: publicKey.toString(),
          evmAddress,
          tokenAmount: snapshotBalance || 0,
          publicTag: publicTag || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Tratamento específico para cada tipo de erro
        if (errorData.code === "NOT_FOUND") {
          console.error("Endereço Solana não encontrado no snapshot");
          // Atualizar a UI para refletir isso
          setIsWalletInSnapshot(false);
        } else if (errorData.code === "ALREADY_MAPPED") {
          console.error("Este endereço Solana já possui um endereço EVM mapeado:", errorData.existingEVM);
          // Você pode mostrar o endereço EVM já mapeado na UI se desejar
        } else {
          console.error("Erro ao salvar mapeamento:", errorData.error || "Erro desconhecido");
        }
        
        throw new Error(errorData.error || "Falha ao salvar mapeamento");
      }

      const data = await response.json();
      
      // Atualizar o estado para refletir o sucesso
      setIsStoredSuccessfully(true);

      // Mostrar o componente de claim se tiver todos os dados necessários
      if (data.success && data.record && data.record.balance) {
        setShowClaimStep(true);
      }
    } catch (error: any) {
      console.error("Erro ao processar operação:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFromClaim = () => {
    setShowClaimStep(false);
    setCurrentStep(3);
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

  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-between">
      <header className="fixed top-10 z-10 w-full flex items-center justify-center px-20">
        <div className="flex items-center gap-3 py-3 px-4 md:px-4 justify-between w-full bg-[rgb(250,231,170)] border-2 border-black text-black rounded-xl">
          <div className="font-extrabold">$STAR10</div>

          <div className="hidden md:flex flex-col bg-[rgb(248,232,182)] border border-black rounded-lg overflow-hidden px-1 py-1">
            <div className="px-2 flex items-center">
              <span className="text-[8px] leading-3 text-black font-black">
                TOKEN ADDRESS BSC:
              </span>
              <span className="text-[8px] leading-3 font-black">
                {BSC_CONTRACT}
              </span>
            </div>
            <div className="px-2 flex items-center">
              <span className="text-[8px] leading-3 text-black font-black">
                TOKEN ADDRESS SOL:
              </span>
              <span className="text-[8px] leading-3 font-black">
                {TOKEN_CONTRACT}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <Link href={"https://discord.gg/star10token"}>
                <FaDiscord size={20} />
              </Link>
              <Link href={"https://x.com/10Ronaldinho"}>
                <FaXTwitter size={20} />
              </Link>
              <Link href={"https://t.me/star10team"}>
                <FaTelegramPlane size={20} />
              </Link>
            </div>
            <Link
              href={
                "https://pix.gotas.com/#0x8b9abdd229ec0c4a28e01b91aacdc5daafc25c2b?focus=true"
              }
            >
              <button className="hidden md:block hover:scale-105 transition-all duration-300 ease-in-out bg-[rgb(247,216,111)] border border-black text-black font-bold py-2 px-4 rounded-lg text-sm">
                BUY $STAR10 TOKEN
              </button>
            </Link>
          </div>
        </div>
      </header>

      <section className="flex flex-col justify-between pt-40">
        <section className="text-center px-4">
          <h1 className="text-4xl md:text-6xl bg-gradient-to-r from-[rgb(250,231,170)] to-[rgb(247,216,111)] bg-clip-text text-transparent font-bold mb-4">
            STAR10 TOKEN PORTAL
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-300">
            The official token of Ronaldinho Gaúcho. Connect your Phantom wallet
            to check your STAR10 balance.
          </p>
        </section>

        {/* Steps Indicator - Only show if not in claim step */}
        {!showClaimStep && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center">
              {[0, 1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <button
                    onClick={() => goToStep(step)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      currentStep >= step
                        ? "bg-[rgb(247,216,111)] text-black"
                        : "bg-gray-800 text-gray-400"
                    } ${step === currentStep ? "border-2 border-black" : ""}`}
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
                        currentStep > step
                          ? "bg-[rgb(247,216,111)]"
                          : "bg-gray-800"
                      }`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-md mx-auto pb-20 px-4">
          {!showClaimStep ? (
            <>
              {currentStep === 0 && (
                <div className="p-6 bg-gray-900 bg-opacity-80 rounded-lg shadow-xl mb-6 border border-[rgb(247,216,111)] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-[rgb(247,216,111)]">
                      Step 1: Connect Phantom Wallet
                    </h2>
                    <div className="w-8 h-8 rounded-full bg-[rgb(247,216,111)] text-black flex items-center justify-center font-bold">
                      1
                    </div>
                  </div>
                  <p className="text-sm mb-6 text-gray-300">
                    To start the process, connect your Phantom wallet. This will
                    allow you to verify your STAR10 tokens and link your EVM
                    address.
                  </p>
                  <div className="flex justify-center">
                    <WalletMultiButton className="!bg-[rgb(247,216,111)] hover:!bg-yellow-700" />
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="p-6 bg-gray-900 bg-opacity-80 rounded-lg shadow-xl mb-6 border border-[rgb(247,216,111)] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-[rgb(247,216,111)]">
                      Step 2: Verify Wallet Ownership
                    </h2>
                    <div className="w-8 h-8 rounded-full bg-[rgb(247,216,111)] text-black flex items-center justify-center font-bold">
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
                <div className="p-6 bg-gray-900 bg-opacity-80 rounded-lg shadow-xl mb-6 border border-[rgb(247,216,111)] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-[rgb(247,216,111)]">
                      Step 3: Check STAR10 Balance
                    </h2>
                    <div className="w-8 h-8 rounded-full bg-[rgb(247,216,111)] text-black flex items-center justify-center font-bold">
                      3
                    </div>
                  </div>
                  <p className="text-sm mb-6 text-gray-300">
                    Check your STAR10 token balance on the Solana blockchain. This
                    is the official token of Ronaldinho Gaúcho.
                  </p>
                  {/* <snapshotBalance
                    tokenAddress={TOKEN_CONTRACT}
                    onBalanceUpdate={handleBalanceUpdate}
                  /> */}

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

                  {isWalletInSnapshot && !isLoading && (
                    <div className="mt-4 p-4 bg-yellow-900 bg-opacity-30 border border-[rgb(247,216,111)] text-[rgb(247,216,111)] rounded-md">
                      <p className="font-bold">Found in Snapshot!</p>
                      <p className="text-sm mt-1">
                        Your wallet has a balance of: {snapshotBalance || "No balance"}
                      </p>
                      {merkleProof && (
                        <p className="text-xs mt-1 text-gray-400">
                          <span className="font-semibold text-green-400">✓ Verified</span> using Merkle proof
                        </p>
                      )}
                    </div>
                  )}

                  {!isWalletInSnapshot && !isLoading && (
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
                    {isWalletInSnapshot && !isLoading && (
                      <button
                        onClick={() => goToStep(3)}
                        className="px-4 py-2 bg-[rgb(247,216,111)] text-black rounded-lg hover:bg-yellow-700"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="p-6 bg-gray-900 bg-opacity-80 rounded-lg shadow-xl mb-6 border border-[rgb(247,216,111)] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-[rgb(247,216,111)]">
                      Step 4: Connect EVM Address
                    </h2>
                    <div className="w-8 h-8 rounded-full bg-[rgb(247,216,111)] text-black flex items-center justify-center font-bold">
                      4
                    </div>
                  </div>
                  <p className="text-sm mb-6 text-gray-300">
                    Provide your EVM wallet address (Ethereum, Binance Smart Chain,
                    etc.) to receive your STAR10 tokens.
                    {snapshotBalance ? (
                      <span className="block mt-1 font-semibold text-[rgb(247,216,111)]">
                        Your {snapshotBalance} STAR10 tokens will be registered for
                        distribution on the EVM network.
                      </span>
                    ) : (
                      <span className="block mt-1">
                        You don't have any STAR10 tokens to transfer.
                      </span>
                    )}
                  </p>

                  {hasExistingEvm && existingEvmAddress && (
                    <div className="mb-4 p-4 bg-yellow-900 bg-opacity-30 border border-yellow-500 text-yellow-400 rounded-md">
                      <p className="font-bold">Mapping Already Exists!</p>
                      <p className="text-sm mt-1">
                        Your Solana address already has an EVM address mapped. You cannot change it.
                      </p>
                      <p className="text-sm mt-2 font-mono break-all">
                        <span className="font-semibold">EVM Address:</span> {existingEvmAddress}
                      </p>
                    </div>
                  )}

                  {!isWalletInSnapshot && (
                    <div className="mb-4 p-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-400 rounded-md">
                      <p className="font-bold">Wallet Not Found!</p>
                      <p className="text-sm mt-1">
                        Your Solana wallet was not found in our records. Please make sure you're
                        connecting the correct wallet address.
                      </p>
                    </div>
                  )}

                  {!isStoredSuccessfully ? (
                    <div className="space-y-4">
                      <EVMAddressForm
                        onSubmit={handleFormSubmit}
                        isSubmitting={isLoading}
                        walletInSnapshot={isWalletInSnapshot}
                        errorMessage={isWalletInSnapshot ? "" : "Your Solana wallet is not in our snapshot."}
                        hasExistingEvm={hasExistingEvm}
                        existingEvmAddress={existingEvmAddress || undefined}
                      />
                    </div>
                  ) : (
                    <div
                      className={`mt-4 p-4 ${
                        isWalletInSnapshot
                          ? "bg-green-900 bg-opacity-30 border border-green-500 text-green-400"
                          : "bg-yellow-900 bg-opacity-30 border border-[rgb(247,216,111)] text-[rgb(247,216,111)]"
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

                      {isWalletInSnapshot && snapshotBalance && (
                        <>
                          <p className="text-sm mt-2">
                            <span className="font-semibold">Balance:</span>{" "}
                            {snapshotBalance}
                          </p>
                        </>
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
                    {isStoredSuccessfully && isClaimEnabled && (
                      <button
                        onClick={() => setShowClaimStep(true)}
                        className="px-4 py-2 bg-[rgb(247,216,111)] text-black rounded-lg hover:bg-yellow-700 transition-all duration-300"
                      >
                        Proceed to Claim
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mt-8">
              <ClaimStep
                snapshotBalance={snapshotBalance}
                evmAddress={evmAddress}
                merkleProof={merkleProof}
                isEnabled={isClaimEnabled}
                onBack={handleBackFromClaim}
              />
            </div>
          )}
        </div>
      </section>

      <footer className="text-center flex flex-col items-center justify-center text-sm text-gray-400 w-full h-[372px]">
        <div className="py-6 bg-[rgb(247,216,111)] flex flex-col h-full justify-between w-full max-w-[1200px] gap-6">
          <div className="mx-10 flex items-center gap-3 py-8 px-5 h-[60px] md:px-4 justify-between bg-[rgb(250,231,170)] border-2 border-black text-black rounded-xl">
            <div className="font-extrabold text-2xl pl-4">$STAR10</div>

            <div className="flex items-center gap-5">
              <Link href={"#"}>
                <button className="hidden md:block hover:scale-105 transition-all duration-300 ease-in-out bg-[rgb(247,216,111)] border border-black text-black font-bold py-2 px-4 rounded-lg text-sm">
                  Back to top
                </button>
              </Link>
            </div>
          </div>

          <div className="h-[3px] w-full bg-black" />

          <div className="mx-10 font-extrabold flex items-center justify-center h-full">
            <div className="bg-[rgb(250,231,170)] border-2 border-black text-black h-full w-full rounded-lg  flex items-center justify-center">
              <h1 className="text-center lg:text-[180px] md:text-[120px] text-[80px]">$STAR10</h1>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default SolanaWalletPage;