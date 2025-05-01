"use client";

import { useState, FormEvent } from "react";

interface EVMAddressFormProps {
  onSubmit: (evmAddress: string) => void;
  isSubmitting: boolean;
  walletInSnapshot?: boolean;
  errorMessage?: string;
  hasExistingEvm?: boolean;
  existingEvmAddress?: string;
}

export const EVMAddressForm = ({
  onSubmit,
  isSubmitting,
  walletInSnapshot,
  errorMessage,
  hasExistingEvm,
  existingEvmAddress,
}: EVMAddressFormProps) => {
  const [evmAddress, setEvmAddress] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  const validateEvmAddress = (address: string) => {
    // Validação básica: endereço EVM começa com 0x e tem 42 caracteres
    const isValidEvm = address.startsWith("0x") && address.length === 42;
    setIsValid(isValidEvm);

    if (!address) {
      setValidationMessage("Por favor, informe um endereço EVM");
    } else if (!isValidEvm) {
      setValidationMessage(
        "Endereço EVM inválido. Deve começar com 0x e ter 42 caracteres."
      );
    } else {
      setValidationMessage("");
    }

    return isValidEvm;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (
      validateEvmAddress(evmAddress) &&
      walletInSnapshot !== false &&
      !hasExistingEvm
    ) {
      onSubmit(evmAddress);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {walletInSnapshot === false && (
        <div className="p-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-400 rounded-md">
          <p className="font-bold">Wallet not Found!</p>
          <p className="text-sm mt-1">
            Your Solana wallet is not in our snapshot. It is not possible to
            proceed with the mapping.
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-900 bg-opacity-30 border border-red-500 text-red-400 rounded-md">
          <p className="font-bold">Error!</p>
          <p className="text-sm mt-1">{errorMessage}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="evmAddress"
          className="block text-sm font-medium text-gray-300"
        >
          EVM Address
        </label>
        <input
          type="text"
          id="evmAddress"
          placeholder="0x..."
          value={evmAddress}
          onChange={(e) => {
            setEvmAddress(e.target.value);
            validateEvmAddress(e.target.value);
          }}
          disabled={
            isSubmitting || walletInSnapshot === false || hasExistingEvm
          }
          className={`mt-1 block w-full rounded-md bg-gray-800 text-white px-3 py-2 text-sm border ${
            !isValid && evmAddress
              ? "border-red-500"
              : isValid
              ? "border-green-500"
              : "border-gray-600"
          }`}
        />
        {validationMessage && (
          <p className="mt-1 text-sm text-red-400">{validationMessage}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={
          !isValid ||
          isSubmitting ||
          walletInSnapshot === false ||
          hasExistingEvm
        }
        className={`w-full py-2 px-4 rounded-lg font-semibold ${
          !isValid || walletInSnapshot === false || hasExistingEvm
            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
            : "bg-[rgb(247,216,111)] text-black hover:bg-yellow-600"
        } transition-colors duration-300`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
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
            Processing...
          </span>
        ) : (
          "Connect EVM Address"
        )}
      </button>
    </form>
  );
};
