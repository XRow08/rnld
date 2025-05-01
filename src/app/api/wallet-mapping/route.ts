import { NextResponse } from "next/server";
import { findSolanaAddressInSnapshotFile, getMappingBySolanaAddress, saveWalletMapping } from "@/utils/supabase-server";

// Função para verificar diretamente o conteúdo do arquivo CSV
async function checkSolanaAddress(solanaAddress: string): Promise<{
  found: boolean;
  balance?: string;
  hasEVM?: boolean;
  evmAddress?: string;
}> {
  try {
    // Primeiro verificar no banco de dados Supabase
    const mapping = await getMappingBySolanaAddress(solanaAddress);
    
    if (mapping) {
      return {
        found: true,
        balance: mapping.balance,
        hasEVM: !!mapping.evm_address,
        evmAddress: mapping.evm_address
      };
    }
    
    // Se não encontrado no banco, verificar no arquivo do snapshot
    const snapshotResult = await findSolanaAddressInSnapshotFile(solanaAddress);
    
    if (snapshotResult.found) {
      // Encontrado no snapshot mas não no banco, então adicionar no banco
      await saveWalletMapping(solanaAddress, "", snapshotResult.balance || "0");
      
      return {
        found: true,
        balance: snapshotResult.balance,
        hasEVM: false
      };
    }
    
    // Não encontrado em nenhum lugar
    return { found: false };
  } catch (error) {
    console.error("Error in checkSolanaAddress:", error);
    return { found: false };
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
    
    // Verificar endereço usando a função que busca tanto no Supabase quanto no CSV
    const result = await checkSolanaAddress(address);
    
    if (result.found) {
      // Endereço encontrado
      return NextResponse.json({
        found: true,
        hasEVM: result.hasEVM || false,
        message: result.hasEVM 
          ? "This Solana address already has an EVM address mapped" 
          : "Solana address found and eligible for EVM mapping",
        record: {
          solanaAddress: address,
          balance: result.balance || "0",
          evmAddress: result.evmAddress || "",
        }
      });
    } else {
      // Endereço não encontrado
      return NextResponse.json({
        found: false,
        hasEVM: false,
        message: "Solana address not found in snapshot"
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
    console.log("Checking if Solana address exists...");
    const checkResult = await checkSolanaAddress(normalizedSolanaAddress);
    
    // Se não existir, retornar erro
    if (!checkResult.found) {
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
    
    console.log("Check result:", checkResult);

    // Verificar se já existe um endereço EVM para esta wallet Solana
    if (checkResult.hasEVM) {
      console.log("Solana address already has an EVM address mapped:", checkResult.evmAddress);
      return NextResponse.json(
        { 
          success: false,
          error: "This Solana address already has an EVM address mapped",
          code: "ALREADY_MAPPED",
          existingEVM: checkResult.evmAddress
        },
        { status: 400 }
      );
    }

    // Atualizar o mapeamento no Supabase
    console.log("Saving mapping to Supabase...");
    try {
      const saved = await saveWalletMapping(
        normalizedSolanaAddress, 
        normalizedEvmAddress, 
        checkResult.balance || "0"
      );
      console.log("Save result:", saved);

      if (!saved) {
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
    const updatedMapping = await getMappingBySolanaAddress(normalizedSolanaAddress);

    console.log('=== Wallet Mapping Debug Info ===');
    console.log('Solana Address:', normalizedSolanaAddress);
    console.log('EVM Address:', normalizedEvmAddress);
    console.log('Updated mapping:', updatedMapping);
    console.log('===============================');

    return NextResponse.json({
      success: true,
      message: "Wallet mapping updated successfully",
      record: {
        solanaAddress: normalizedSolanaAddress,
        evmAddress: normalizedEvmAddress,
        balance: updatedMapping?.balance || checkResult.balance || "0"
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