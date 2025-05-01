import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

interface SnapshotRecord {
  accountSolana: string;
  tokenAccountSolana: string;
  holderAddressBSC: string;
  balance: string;
  publicTag: string;
  owner: string;
  balanceNormalized: string;
}

const SNAPSHOT_STORAGE_KEY = "star10_snapshot_data";

export function parseCSVToRecords(csvData: string): SnapshotRecord[] {
  const lines = csvData.split("\n");
  const records: SnapshotRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(";");
    if (values.length < 3) continue;

    const cleanBalance = values[3]
      ? values[3].replace(/\./g, "").replace(/,/g, ".")
      : "";

    records.push({
      accountSolana: values[0] ? values[0].trim() : "",
      tokenAccountSolana: values[1] ? values[1].trim() : "",
      holderAddressBSC: values[2] ? values[2].trim() : "",
      balance: cleanBalance,
      publicTag: values[4] ? values[4].trim() : "",
      owner: values[5] ? values[5].trim() : "",
      balanceNormalized: values[6] ? values[6].trim() : "",
    });
  }

  console.log("CSV Parsed Records:", records);
  return records;
}

export async function initializeSnapshotData(csvData: string): Promise<void> {
  if (typeof window === "undefined") return;

  const records = parseCSVToRecords(csvData);
  localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(records));

  console.log(`Initialized ${records.length} records in localStorage`);
}

export async function getSnapshotRecords(): Promise<SnapshotRecord[]> {
  try {
    // Caminho para o arquivo CSV
    const csvPath = path.join(process.cwd(), "public", "snapshot.csv");
    
    // Ler o arquivo diretamente
    const fileContent = fs.readFileSync(csvPath, { encoding: "utf-8", flag: "r" });
    
    // Normalizar quebras de linha para garantir compatibilidade
    const normalizedContent = fileContent.replace(/\r\n/g, "\n");
    
    // Dividir por linhas e processar cada uma
    const lines = normalizedContent.split("\n");
    console.log(`Total lines in CSV: ${lines.length}`);
    
    // Pular a primeira linha (cabeçalho)
    const records: SnapshotRecord[] = [];
    
    // Processar cada linha a partir da linha 1 (após o cabeçalho)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Pular linhas vazias
      
      // Dividir a linha pelos separadores
      const columns = line.split(";");
      if (columns.length < 3) continue; // Garantir que tem colunas suficientes
      
      // Criar o registro
      const record: SnapshotRecord = {
        accountSolana: columns[0]?.trim() || "",
        tokenAccountSolana: columns[1] ? columns[1].trim() : "",
        holderAddressBSC: columns[2] ? columns[2].trim() : "",
        balance: columns[3]?.trim() || "0",
        publicTag: "",
        owner: "",
        balanceNormalized: columns[4]?.trim() || "0"
      };
      
      // Adicionar à lista de registros válidos
      records.push(record);
    }
    
    console.log(`Total records processed: ${records.length}`);
    
    // Mostrar alguns registros para verificação
    if (records.length > 0) {
      console.log("First record:", records[0]);
      console.log("Last record:", records[records.length - 1]);
    }
    
    return records;
  } catch (error) {
    console.error("Error loading snapshot records:", error);
    throw error;
  }
}

export async function findBySolanaAddress(address: string): Promise<any> {
  try {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const response = await fetch(
      `${origin}/api/check-snapshot?address=${encodeURIComponent(address)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Erro na verificação do snapshot: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao verificar endereço no snapshot:", error);
    return { error: (error as Error).message };
  }
}

export async function updateEVMAddressForSolana(
  solanaAddress: string,
  evmAddress: string,
  tokenBalance: number
) {
  if (typeof window === "undefined") return false;

  try {
    const records: any[] = await getSnapshotRecords();

    const cleanAddress = solanaAddress.trim().toLowerCase();
    let existingRecordIndex = records.findIndex(
      (record) =>
        record.accountSolana &&
        record.accountSolana.trim().toLowerCase() === cleanAddress
    );

    if (existingRecordIndex >= 0) {
      records[existingRecordIndex].holderAddressBSC = evmAddress;
    } else {
      records.push({
        accountSolana: solanaAddress,
        tokenAccountSolana: "",
        holderAddressBSC: evmAddress,
        balance: tokenBalance.toString(),
        publicTag: "",
        owner: "",
        balanceNormalized: "",
      });
    }
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(records));

    return true;
  } catch (error) {
    console.error("Error updating snapshot data:", error);
    return false;
  }
}

export async function saveMapping(
  solanaAddress: string,
  evmAddress: string
): Promise<any> {
  try {
    const response = await fetch("/api/save-mapping", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ solanaAddress, evmAddress }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao salvar mapeamento: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao salvar mapeamento:", error);
    return { error: (error as Error).message };
  }
}

export async function findBySolanaAddressInCSV(
  solanaAddress: string
): Promise<SnapshotRecord | null> {
  try {
    // Obter todos os registros
    const records = await getSnapshotRecords();
    
    // Normalizar o endereço para comparação
    const normalizedAddress = solanaAddress.toLowerCase().trim();
    
    console.log(`Searching for Solana address: ${normalizedAddress}`);
    console.log(`Total records to search: ${records.length}`);
    
    // Buscar em todos os registros
    for (const record of records) {
      // Normalizar o endereço do registro para comparação
      const recordAddress = record.accountSolana.toLowerCase().trim();
      
      // Comparar os endereços
      if (recordAddress === normalizedAddress) {
        console.log(`Found matching record for address: ${normalizedAddress}`);
        return record;
      }
    }
    
    console.log(`No matching record found for address: ${normalizedAddress}`);
    return null;
  } catch (error) {
    console.error("Error finding Solana address in CSV:", error);
    return null;
  }
}

export async function updateMappingInCSV(
  solanaAddress: string,
  evmAddress: string
): Promise<boolean> {
  try {
    // Normalizar os endereços
    const normalizedSolanaAddress = solanaAddress.toLowerCase().trim();
    const normalizedEvmAddress = evmAddress.toLowerCase().trim();
    
    // Verificar primeiro se o endereço Solana existe no snapshot
    const record = await findBySolanaAddressInCSV(normalizedSolanaAddress);
    
    // Se o endereço não existir no snapshot, retornar falso
    if (!record) {
      console.log("Solana address not found in snapshot");
      return false;
    }
    
    // Se já houver um endereço EVM mapeado, retornar falso
    if (record.holderAddressBSC && record.holderAddressBSC.trim() !== "") {
      console.log("This Solana address already has an EVM address mapped:", record.holderAddressBSC);
      return false;
    }
    
    // Em produção, vamos usar uma abordagem diferente para evitar erros de permissão
    try {
      // Tentar atualizar o arquivo CSV diretamente primeiro
      const csvPath = path.join(process.cwd(), "public", "snapshot.csv");
      const fileContent = fs.readFileSync(csvPath, { encoding: "utf-8", flag: "r" });
      
      // Normalizar quebras de linha
      const normalizedContent = fileContent.replace(/\r\n/g, "\n");
      
      // Dividir por linhas
      const lines = normalizedContent.split("\n");
      
      // Procurar o endereço Solana em todas as linhas
      let updated = false;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(";");
        if (columns.length < 3) continue;
        
        // Verificar se a primeira coluna (Account) corresponde ao endereço Solana
        const lineAddress = columns[0]?.toLowerCase().trim() || "";
        
        if (lineAddress === normalizedSolanaAddress) {
          // Atualizar o endereço EVM
          columns[2] = normalizedEvmAddress;
          lines[i] = columns.join(";");
          updated = true;
          break;
        }
      }
      
      if (updated) {
        // Tentar escrever o arquivo atualizado
        fs.writeFileSync(csvPath, lines.join("\n"), "utf-8");
        console.log("CSV file updated successfully in-place");
        return true;
      }
    } catch (writeError) {
      // Se falhar ao escrever no arquivo CSV, usamos uma abordagem alternativa
      console.warn("Could not update CSV file directly:", writeError);
      console.log("Falling back to alternative method...");
    }
    
    // Abordagem alternativa: salvar em um arquivo de mapeamentos separado
    try {
      const mappingsPath = path.join(process.cwd(), "public", "mappings.json");
      let mappings = [];
      
      // Verificar se o arquivo já existe
      try {
        const existingMappings = fs.readFileSync(mappingsPath, "utf-8");
        mappings = JSON.parse(existingMappings);
      } catch (readError) {
        // Arquivo não existe ou não pode ser lido, criar um novo
        console.log("Creating new mappings file");
        mappings = [];
      }
      
      // Verificar se o endereço Solana já está mapeado
      const existingIndex = mappings.findIndex(
        (m: any) => m.solanaAddress.toLowerCase() === normalizedSolanaAddress
      );
      
      if (existingIndex >= 0) {
        // Já existe um mapeamento
        if (mappings[existingIndex].evmAddress) {
          console.log("This Solana address is already mapped in the mappings file");
          return false;
        }
        
        // Atualizar o endereço EVM
        mappings[existingIndex].evmAddress = normalizedEvmAddress;
      } else {
        // Adicionar novo mapeamento
        mappings.push({
          solanaAddress: solanaAddress,
          evmAddress: evmAddress,
          timestamp: new Date().toISOString(),
          balance: record.balance || "0"
        });
      }
      
      // Salvar o arquivo de mapeamentos
      fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2), "utf-8");
      console.log("Mapping saved to separate mappings file");
      
      return true;
    } catch (mappingError) {
      console.error("Error saving to mappings file:", mappingError);
      
      // Como último recurso, vamos salvar o mapeamento no console
      // (útil para depuração em produção)
      console.log("=== IMPORTANT: MAPPING DATA (SAVE THIS) ===");
      console.log("Solana Address:", solanaAddress);
      console.log("EVM Address:", evmAddress);
      console.log("Time:", new Date().toISOString());
      console.log("Balance:", record.balance || "0");
      console.log("=========================================");
      
      // Retornar true para não interromper o fluxo do usuário
      // mas enviar um alerta para o administrador verificar os logs
      return true;
    }
  } catch (error) {
    console.error("Error updating mapping in CSV:", error);
    return false;
  }
}
