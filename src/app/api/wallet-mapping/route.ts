import { NextResponse } from "next/server";
import { findBySolanaAddressInCSV, getSnapshotRecords, updateMappingInCSV } from "@/utils/csv-manager";
import fs from "fs";
import path from "path";

// Função para verificar diretamente o conteúdo do arquivo CSV
async function checkCSVContent(solanaAddress: string): Promise<boolean> {
  try {
    const csvPath = path.join(process.cwd(), "public", "snapshot.csv");
    const fileContent = fs.readFileSync(csvPath, { encoding: "utf-8", flag: "r" });
    
    console.log("Direct CSV check - content length:", fileContent.length);
    
    // Normalizar o endereço
    const normalizedAddress = solanaAddress.toLowerCase().trim();
    
    // Dividir o conteúdo em linhas
    const lines = fileContent.split("\n");
    console.log(`Direct CSV check - total lines: ${lines.length}`);
    
    // Verificar cada linha manualmente
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const columns = line.split(";");
      if (columns.length < 3) continue;
      
      const addressInCsv = columns[0]?.toLowerCase().trim() || "";
      
      // Comparar o endereço
      if (addressInCsv === normalizedAddress) {
        console.log(`Direct CSV check - Found matching address at line ${i + 1}`);
        return true;
      }
      
      // Mostrar as primeiras linhas para debug
      if (i < 5) {
        console.log(`Direct CSV check - Line ${i + 1}: Address="${addressInCsv}"`);
      }
    }
    
    console.log(`Direct CSV check - Address "${normalizedAddress}" not found in file`);
    return false;
  } catch (error) {
    console.error("Error in direct CSV check:", error);
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  try {
    console.log("===== WALLET MAPPING GET REQUEST =====");
    console.log("Checking address:", address);
    
    // Verificar diretamente no CSV
    const directCheck = await checkCSVContent(address);
    console.log("Direct CSV check result:", directCheck);
    
    // Verificar usando as funções existentes
    const record = await findBySolanaAddressInCSV(address);

    if (record) {
      // Endereço encontrado no snapshot
      const hasEVM = record.holderAddressBSC && record.holderAddressBSC.trim() !== "";
      
      return NextResponse.json({
        found: true,
        hasEVM: hasEVM,
        message: hasEVM 
          ? "This Solana address already has an EVM address mapped" 
          : "Solana address found and eligible for EVM mapping",
        record: {
          solanaAddress: address,
          balance: record.balance || "0",
          balanceNormalized: record.balanceNormalized || "0",
          evmAddress: record.holderAddressBSC || "",
          publicTag: record.publicTag || "",
        },
        directCheck
      });
    } else {
      // Endereço não encontrado no snapshot
      return NextResponse.json({
        found: false,
        hasEVM: false,
        message: "Solana address not found in snapshot",
        directCheck
      });
    }
  } catch (error) {
    console.error("Error fetching wallet data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { solanaAddress, evmAddress } = body;

    console.log("===== WALLET MAPPING POST REQUEST =====");
    console.log("Request body:", body);

    if (!solanaAddress || !evmAddress) {
      console.log("Missing required parameters");
      return NextResponse.json(
        { error: "Solana address and EVM address are required" },
        { status: 400 }
      );
    }

    // Normalizar endereços
    const normalizedSolanaAddress = solanaAddress.toLowerCase().trim();
    const normalizedEvmAddress = evmAddress.toLowerCase().trim();
    
    console.log("Normalized Solana Address:", normalizedSolanaAddress);
    console.log("Normalized EVM Address:", normalizedEvmAddress);

    // Verificar se o endereço Solana existe no snapshot
    console.log("Checking if Solana address exists in snapshot...");
    let record = await findBySolanaAddressInCSV(normalizedSolanaAddress);
    
    // Se não existir no snapshot, retornar erro
    if (!record) {
      console.log("Solana address not found in snapshot");
      return NextResponse.json(
        { 
          success: false,
          error: "Solana address not found in snapshot",
          code: "NOT_FOUND"
        },
        { status: 404 }
      );
    }
    
    console.log("Record found:", record);

    // Verificar se já existe um endereço EVM para esta wallet Solana
    if (record.holderAddressBSC && record.holderAddressBSC.trim() !== "") {
      console.log("Solana address already has an EVM address mapped:", record.holderAddressBSC);
      return NextResponse.json(
        { 
          success: false,
          error: "This Solana address already has an EVM address mapped",
          code: "ALREADY_MAPPED",
          existingEVM: record.holderAddressBSC
        },
        { status: 400 }
      );
    }

    // Atualizar o mapeamento (no CSV ou em arquivo alternativo)
    console.log("Updating mapping...");
    try {
      const updated = await updateMappingInCSV(normalizedSolanaAddress, normalizedEvmAddress);
      console.log("Update result:", updated);

      if (!updated) {
        return NextResponse.json(
          { 
            success: false,
            error: "Failed to update mapping. The address may not exist in the snapshot or already has an EVM address.",
            code: "UPDATE_FAILED"
          },
          { status: 400 }
        );
      }
    } catch (updateError: any) {
      console.error("Error during mapping update:", updateError);
      
      // Log detalhado para depuração em produção
      console.log("=== ERROR DETAILS ===");
      console.log("Error message:", updateError.message);
      console.log("Error stack:", updateError.stack);
      console.log("====================");
      
      return NextResponse.json(
        { 
          success: false,
          error: "An error occurred while updating the mapping. Please try again later.",
          code: "UPDATE_ERROR",
          details: updateError.message
        },
        { status: 500 }
      );
    }

    // Buscar o registro atualizado
    console.log("Fetching updated record...");
    try {
      record = await findBySolanaAddressInCSV(normalizedSolanaAddress);
      console.log("Updated record:", record);
    } catch (fetchError) {
      console.error("Error fetching updated record:", fetchError);
      // Não retornamos erro aqui, apenas continuamos com o registro original
    }

    console.log('=== Wallet Mapping Debug Info ===');
    console.log('Solana Address:', normalizedSolanaAddress);
    console.log('EVM Address:', normalizedEvmAddress);
    console.log('Record after update:', record);
    console.log('===============================');

    return NextResponse.json({
      success: true,
      message: "Wallet mapping updated successfully",
      record: {
        solanaAddress: normalizedSolanaAddress,
        evmAddress: normalizedEvmAddress,
        balance: record?.balance || "0",
        balanceNormalized: record?.balanceNormalized || "0",
        publicTag: record?.publicTag || ""
      }
    });
  } catch (error: any) {
    // Erro genérico - poderia ser erro ao processar JSON, etc.
    console.error("Unexpected error in wallet mapping API:", error);
    console.log("Error details:", error.message);
    console.log("Error stack:", error.stack);
    
    return NextResponse.json(
      { 
        success: false,
        error: "An unexpected error occurred. Please try again later.",
        code: "UNEXPECTED_ERROR"
      },
      { status: 500 }
    );
  }
} 