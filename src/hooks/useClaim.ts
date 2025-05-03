import { BSC_CONTRACT } from "@/constants";
import { Claim__factory } from "@/contracts";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import axios from "axios";

export function useClaim() {
  const [isLoading, setIsLoading] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    if (address) getProofAndAmount();
  }, [address]);

  async function getProofAndAmount() {
    try {
      if (!address) throw new Error("No wallet connected");
      const url = `/api/merkle-info/${address.toLowerCase()}`;
      const { data } = await axios.get(url);
      const amount = ethers.parseEther(data.value);
      const proof = data.proof || [];
      return { amount, proof };
    } catch (error) {
      console.error("Error getting proof and amount:", error);
      setError(true);
      throw error;
    }
  }

  async function onClaim() {
    try {
      setIsLoading(true);
      const { amount, proof } = await getProofAndAmount();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = Claim__factory.connect(BSC_CONTRACT, signer);
      const tx = await contract.claimTokens(amount, proof, {
        gasLimit: 100000,
      });
      const receipt = await tx.wait();
      if (receipt?.hash) setHash(receipt.hash);
      return receipt?.hash;
    } catch (error) {
      console.error(error);
      setError(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    hash,
    error,
    onClaim,
    getProofAndAmount,
  };
}
