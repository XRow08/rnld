import { NextResponse } from "next/server";
import { verifyAddressInMerkleTree } from "@/utils/merkle-verification";

export async function POST(request: Request) {
  try {
    const { solanaAddress, evmAddress, balance, merkleProof } = await request.json();

    if (!solanaAddress || !evmAddress) {
      return NextResponse.json(
        { error: "Solana and EVM addresses are required" },
        { status: 400 }
      );
    }

    if (!merkleProof) {
      return NextResponse.json(
        { error: "Merkle Proof is required" },
        { status: 400 }
      );
    }

    // Verify if the address is in the snapshot using Merkle Tree
    const merkleResult = verifyAddressInMerkleTree(solanaAddress);
    
    if (!merkleResult.isInTree) {
      return NextResponse.json(
        { error: "Address not found in snapshot" },
        { status: 403 }
      );
    }

    // In a real scenario, this would interact with a smart contract
    // to process the token transfer

    // Simulate a transaction processing
    const txHash = "0x" + Array.from({length: 64}, () => 
      Math.floor(Math.random() * 16).toString(16)).join('');

    // Log the operation
    console.log(`Claim processed: ${solanaAddress} -> ${evmAddress}, amount: ${balance}`);

    // Return success
    return NextResponse.json({
      success: true,
      txHash,
      message: "Claim processed successfully"
    });
  } catch (error) {
    console.error("Error processing claim:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 