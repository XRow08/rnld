import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { SnapshotRecord } from "@/types/snapshot";
import { verifyAddressInMerkleTree, generateMerkleTree } from "@/utils/merkle-verification";

// Type for Merkle tree result
type MerkleResult = {
  isInTree: boolean;
  proof?: string[];
  balance?: string;
};

const SNAPSHOT_PATH = path.join(process.cwd(), "public/snapshot.csv");

// Generate Merkle tree on startup if it doesn't exist
try {
  generateMerkleTree();
  console.log("Merkle tree generated successfully");
} catch (error) {
  console.error("Error generating Merkle tree on startup:", error);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Endereço Solana não fornecido" },
        { status: 400 }
      );
    }
    
    if (!fs.existsSync(SNAPSHOT_PATH)) {
      return NextResponse.json(
        { error: "Arquivo de snapshot não encontrado" },
        { status: 404 }
      );
    }

    // First, try to check the Merkle tree
    try {
      const merkleResult = verifyAddressInMerkleTree(address);
      
      // If the address is in the Merkle tree, return that result
      if (merkleResult.isInTree) {
        return NextResponse.json({
          found: true,
          record: {
            solana: address,
            balance: merkleResult.balance || "0",
          },
          merkleProof: merkleResult.proof
        });
      }
    } catch (merkleError) {
      console.error("Error checking Merkle tree:", merkleError);
      // Continue with CSV check if Merkle tree check fails
    }

    // Fallback to CSV check for backwards compatibility
    const records = readCSV();
    const cleanAddress = address.trim().toLowerCase();
    const foundRecord = findWalletRecord(records, cleanAddress);

    if (foundRecord) {
      return NextResponse.json({
        found: true,
        record: {
          solana: foundRecord.accountSolana,
          bsc: foundRecord.holderAddressBSC,
          balance: foundRecord.balance || "0"
        }
      });
    } else {
      return NextResponse.json({ found: false });
    }
  } catch (error) {
    console.error("Erro ao verificar wallet:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { solanaAddress, evmAddress } = await request.json();

    if (!solanaAddress || !evmAddress) {
      return NextResponse.json(
        { error: "Endereços Solana e EVM são obrigatórios" },
        { status: 400 }
      );
    }

    if (!fs.existsSync(SNAPSHOT_PATH)) {
      return NextResponse.json(
        { error: "Arquivo de snapshot não encontrado" },
        { status: 404 }
      );
    }

    let merkleResult: MerkleResult = { isInTree: false };
    
    // First try to check the Merkle tree to verify if the address is in the snapshot
    try {
      merkleResult = verifyAddressInMerkleTree(solanaAddress);
    } catch (merkleError) {
      console.error("Error checking Merkle tree:", merkleError);
      // Continue with CSV check if Merkle tree check fails
    }
    
    // If the address is in the Merkle tree, use that information
    if (merkleResult.isInTree) {
      const records = readCSV();
      const cleanAddress = solanaAddress.trim().toLowerCase();
      const foundRecord = findWalletRecord(records, cleanAddress);
      
      if (foundRecord) {
        foundRecord.holderAddressBSC = evmAddress;
        try {
          saveCSV(records);
          return NextResponse.json({
            success: true,
            inSnapshot: true,
            balance: merkleResult.balance || "0",
            merkleProof: merkleResult.proof,
            message: "Wallet atualizada com sucesso"
          });
        } catch (saveError) {
          return NextResponse.json(
            { 
              success: false, 
              error: "Erro ao salvar dados",
              inSnapshot: true,
              balance: merkleResult.balance || "0",
              merkleProof: merkleResult.proof
            },
            { status: 500 }
          );
        }
      } else {
        // Address in Merkle tree but not in CSV - add it
        records.push({
          accountSolana: solanaAddress,
          tokenAccountSolana: "",
          holderAddressBSC: evmAddress,
          balance: merkleResult.balance || "0",
          publicTag: "",
          owner: ""
        });
        
        try {
          saveCSV(records);
          return NextResponse.json({
            success: true,
            inSnapshot: true,
            balance: merkleResult.balance || "0",
            merkleProof: merkleResult.proof,
            message: "Wallet adicionada com sucesso"
          });
        } catch (saveError) {
          return NextResponse.json(
            { 
              success: false, 
              error: "Erro ao salvar dados",
              inSnapshot: true,
              balance: merkleResult.balance || "0",
              merkleProof: merkleResult.proof
            },
            { status: 500 }
          );
        }
      }
    }

    // Fallback to traditional CSV method for backward compatibility
    const records = readCSV();
    const cleanAddress = solanaAddress.trim().toLowerCase();
    const foundRecord = findWalletRecord(records, cleanAddress);
    
    if (foundRecord) {
      foundRecord.holderAddressBSC = evmAddress;
      try {
        saveCSV(records);
        return NextResponse.json({
          success: true,
          inSnapshot: true,
          balance: foundRecord.balance || "0",
          message: "Wallet atualizada com sucesso"
        });
      } catch (saveError) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Erro ao salvar dados",
            inSnapshot: true,
            balance: foundRecord.balance || "0"
          },
          { status: 500 }
        );
      }
    } else {
      records.push({
        accountSolana: solanaAddress,
        tokenAccountSolana: "",
        holderAddressBSC: evmAddress,
        balance: "0",
        publicTag: "",
        owner: ""
      });
      
      try {
        saveCSV(records);
        return NextResponse.json({
          success: true,
          inSnapshot: false,
          message: "Wallet adicionada, mas não encontrada no snapshot original"
        });
      } catch (saveError) {
        console.error("Erro ao salvar CSV:", saveError);
        return NextResponse.json(
          { success: false, error: "Erro ao salvar dados", inSnapshot: false },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error("Erro ao processar requisição:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor", details: (error as Error).message },
      { status: 500 }
    );
  }
}

function readCSV(): SnapshotRecord[] {
  try {
    const fileContent = fs.readFileSync(SNAPSHOT_PATH, "utf8");
    const records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      delimiter: ";"
    });
    const result: SnapshotRecord[] = [];
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (row.length < 3) continue;
      result.push({
        accountSolana: row[0] ? row[0].trim() : "",
        tokenAccountSolana: row[1] ? row[1].trim() : "",
        holderAddressBSC: row[2] ? row[2].trim() : "",
        balance: row[3] ? row[3].trim() : "",
        publicTag: row[4] ? row[4].trim() : "",
        owner: row[5] ? row[5].trim() : ""
      });
    }
    
    return result;
  } catch (error) {
    console.error("Erro ao ler CSV:", error);
    return [];
  }
}

function saveCSV(records: SnapshotRecord[]): void {
  try {
    const header = ["Account Solana", "Token Account Solana", "HolderAddress BSC", "Balance", "Public Tag", "Owner"];
    const rows = records.map(record => [
      record.accountSolana,
      record.tokenAccountSolana,
      record.holderAddressBSC,
      record.balance,
      record.publicTag,
      record.owner
    ]);
    rows.unshift(header);
    const csvContent = stringify(rows, { delimiter: ";" });
    fs.writeFileSync(SNAPSHOT_PATH, csvContent, "utf8");
    console.log(`CSV salvo com ${records.length} registros`);
  } catch (error) {
    console.error("Erro ao salvar CSV:", error);
    throw error;
  }
}

// Função auxiliar para buscar um registro por endereço Solana
function findWalletRecord(records: SnapshotRecord[], cleanAddress: string): SnapshotRecord | undefined {
  return records.find(record => {
    if (!record.accountSolana) return false;
    return record.accountSolana.trim().toLowerCase() === cleanAddress;
  });
} 