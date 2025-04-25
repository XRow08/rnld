import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { SnapshotRecord } from "@/types/snapshot";

const SNAPSHOT_PATH = path.join(process.cwd(), "public/snapshot.csv");

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

    console.log(`Verificando endereço: ${address}`);
    
    if (!fs.existsSync(SNAPSHOT_PATH)) {
      console.log("Arquivo CSV não encontrado:", SNAPSHOT_PATH);
      return NextResponse.json(
        { error: "Arquivo de snapshot não encontrado" },
        { status: 404 }
      );
    }

    // Ler e processar o CSV
    const records = readCSV();
    const cleanAddress = address.trim().toLowerCase();
    
    // Buscar o registro
    const foundRecord = findWalletRecord(records, cleanAddress);

    if (foundRecord) {
      console.log("Wallet encontrada:", foundRecord.accountSolana);
      return NextResponse.json({
        found: true,
        record: {
          solana: foundRecord.accountSolana,
          bsc: foundRecord.holderAddressBSC,
          balance: foundRecord.balance || "0"
        }
      });
    } else {
      console.log("Wallet não encontrada");
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

    // Verificar se arquivo existe
    if (!fs.existsSync(SNAPSHOT_PATH)) {
      console.log("Arquivo CSV não encontrado:", SNAPSHOT_PATH);
      return NextResponse.json(
        { error: "Arquivo de snapshot não encontrado" },
        { status: 404 }
      );
    }

    // Ler o CSV
    const records = readCSV();
    const cleanAddress = solanaAddress.trim().toLowerCase();
    
    // Buscar o registro
    const foundRecord = findWalletRecord(records, cleanAddress);
    
    if (foundRecord) {
      // Atualizar registro existente
      console.log("Atualizando wallet encontrada:", foundRecord.accountSolana);
      foundRecord.holderAddressBSC = evmAddress;
      
      // Salvar alterações no CSV
      try {
        saveCSV(records);
        
        return NextResponse.json({
          success: true,
          inSnapshot: true,
          balance: foundRecord.balance || "0",
          message: "Wallet atualizada com sucesso"
        });
      } catch (saveError) {
        console.error("Erro ao salvar CSV:", saveError);
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
      console.log("Wallet não encontrada no snapshot");
      
      // Opção: Adicionar a wallet mesmo não estando no snapshot original
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

// Função auxiliar para ler o CSV
function readCSV(): SnapshotRecord[] {
  try {
    // Ler o CSV
    const fileContent = fs.readFileSync(SNAPSHOT_PATH, "utf8");
    
    // Usar csv-parse para processar o CSV corretamente
    const records = parse(fileContent, {
      columns: false, // Não usar a primeira linha como cabeçalho
      skip_empty_lines: true,
      delimiter: ";"
    });
    
    // Converter para o formato SnapshotRecord (pulando o cabeçalho)
    const result: SnapshotRecord[] = [];
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (row.length < 3) continue; // Pular linhas sem dados suficientes
      
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

// Função auxiliar para salvar o CSV
function saveCSV(records: SnapshotRecord[]): void {
  try {
    // Criar o conteúdo do CSV
    const header = ["Account Solana", "Token Account Solana", "HolderAddress BSC", "Balance", "Public Tag", "Owner"];
    const rows = records.map(record => [
      record.accountSolana,
      record.tokenAccountSolana,
      record.holderAddressBSC,
      record.balance,
      record.publicTag,
      record.owner
    ]);
    
    // Incluir o cabeçalho
    rows.unshift(header);
    
    // Converter para string CSV
    const csvContent = stringify(rows, { delimiter: ";" });
    
    // Salvar no arquivo
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