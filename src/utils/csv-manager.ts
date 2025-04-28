import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

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
    const csvPath = path.join(process.cwd(), 'public', 'snapshot.csv');
    console.log('Loading CSV from:', csvPath);
    
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    console.log('CSV file content length:', fileContent.length);
    console.log('First few lines of CSV:', fileContent.split('\n').slice(0, 3));

    // Primeiro, vamos ler o cabeçalho do CSV
    const headerLine = fileContent.split('\n')[0];
    console.log('CSV Header:', headerLine);

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      from_line: 2 // Pular a linha do cabeçalho
    });
    console.log('Parsed records:', records.length);
    console.log('First record:', records[0]);

    // Validar e transformar os registros
    const validRecords = records.map((record: any) => {
      // Pegar as chaves e valores do registro
      const keys = Object.keys(record);
      const values = Object.values(record);

      // Encontrar os índices dos campos que precisamos
      const holderAddressIndex = keys.findIndex(k => k.toLowerCase().includes('holder'));
      const balanceIndex = keys.findIndex(k => k.toLowerCase().includes('balance') && !k.toLowerCase().includes('normalized'));
      const balanceNormalizedIndex = keys.findIndex(k => k.toLowerCase().includes('normalized'));

      // Se não encontrou os índices, tenta usar as chaves diretamente
      const holderAddress = holderAddressIndex >= 0 ? values[holderAddressIndex] : values[1] || '';
      const balance = balanceIndex >= 0 ? values[balanceIndex] : values[2] || '';
      const balanceNormalized = balanceNormalizedIndex >= 0 ? values[balanceNormalizedIndex] : values[3] || '';

      return {
        accountSolana: '', // Não temos esse campo no CSV
        tokenAccountSolana: '', // Não temos esse campo no CSV
        holderAddressBSC: holderAddress,
        balance: balance,
        publicTag: '', // Não temos esse campo no CSV
        owner: '', // Não temos esse campo no CSV
        balanceNormalized: balanceNormalized
      };
    });

    // Filtrar registros válidos
    const filteredRecords = validRecords.filter((record: any) => 
      record.holderAddressBSC && 
      record.holderAddressBSC.trim() !== '' && 
      record.balance && 
      record.balance.trim() !== ''
    );

    console.log('Valid records after transformation:', filteredRecords.length);
    console.log('Sample record:', filteredRecords[0]);

    return filteredRecords;
  } catch (error) {
    console.error('Error loading snapshot records:', error);
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
