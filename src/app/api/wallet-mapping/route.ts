import { NextResponse } from "next/server";
import { findBySolanaAddress, getSnapshotRecords } from "@/utils/csv-manager";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  try {
    const snapshotData = await findBySolanaAddress(address);

    if (snapshotData.error) {
      return NextResponse.json({ error: snapshotData.error }, { status: 500 });
    }

    return NextResponse.json({
      found: !!snapshotData,
      record: snapshotData || null,
    });
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

    if (!solanaAddress || !evmAddress) {
      return NextResponse.json(
        { error: "Solana address and EVM address are required" },
        { status: 400 }
      );
    }

    // Normalizar endereços
    const normalizedSolanaAddress = solanaAddress.toLowerCase().trim();
    const normalizedEvmAddress = evmAddress.toLowerCase().trim();

    // Carregar registros do snapshot
    const snapshotRecords = await getSnapshotRecords();
    console.log('Total records loaded:', snapshotRecords.length);

    // Encontrar o registro do endereço Solana
    const record = snapshotRecords.find(
      (r) => r.accountSolana.toLowerCase().trim() === normalizedSolanaAddress
    );

    if (!record) {
      return NextResponse.json(
        { error: "Solana address not found in snapshot" },
        { status: 404 }
      );
    }

    // Verificar se o endereço EVM já está mapeado
    if (record.holderAddressBSC && record.holderAddressBSC.trim() !== "") {
      return NextResponse.json(
        { error: "Solana address already mapped to an EVM address" },
        { status: 400 }
      );
    }

    // Atualizar o registro com o novo endereço EVM
    record.holderAddressBSC = normalizedEvmAddress;

    // Salvar o registro atualizado
    // TODO: Implementar a lógica de salvamento no banco de dados ou arquivo

    console.log('=== Wallet Mapping Debug Info ===');
    console.log('Solana Address:', normalizedSolanaAddress);
    console.log('EVM Address:', normalizedEvmAddress);
    console.log('Record Balance:', record.balance);
    console.log('Record Balance Normalized:', record.balanceNormalized);
    console.log('===============================');

    return NextResponse.json({
      success: true,
      message: "Wallet mapping updated successfully",
      record: {
        solanaAddress: normalizedSolanaAddress,
        evmAddress: normalizedEvmAddress,
        balance: record.balance,
        balanceNormalized: record.balanceNormalized
      }
    });
  } catch (error) {
    console.error("Error updating wallet mapping:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
