import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

interface SnapshotRecord {
  holderAddress: string;
  balance: string;
}

const SNAPSHOT_STORAGE_KEY = "star10_snapshot_data";

function detectSeparator(content: string): string {
  const firstLine = content.split("\n")[0];
  if (firstLine.includes(";")) return ";";
  if (firstLine.includes(",")) return ",";
  return ";";
}

function cleanAddress(address: string): string {
  let cleaned = address.replace(/["\s]/g, "").trim();
  if (cleaned && !cleaned.startsWith("0x")) {
    cleaned = "0x" + cleaned;
  }
  if (cleaned.length !== 42) {
    console.warn(
      `Endereço inválido encontrado: ${address} -> ${cleaned} (comprimento ${cleaned.length})`
    );
    return "";
  }

  return cleaned.toLowerCase();
}

export function parseCSVToRecords(csvData: string): SnapshotRecord[] {
  const lines = csvData.split("\n");
  const records: SnapshotRecord[] = [];
  const separator = detectSeparator(csvData);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = [];
    let currentValue = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"' && (j === 0 || line[j - 1] !== "\\")) {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        columns.push(currentValue);
        currentValue = "";
      } else {
        currentValue += char;
      }
    }

    columns.push(currentValue);

    if (columns.length < 3) continue;

    let holderAddress = columns[0] ? columns[0].trim().replace(/"/g, "") : "";
    holderAddress = cleanAddress(holderAddress);

    const fullBalance =
      columns.length >= 3 ? columns[2].trim().replace(/"/g, "") : "";

    if (holderAddress && fullBalance) {
      records.push({ holderAddress, balance: fullBalance });
    }
  }

  if (records.length > 0) {
    console.log("First record example:", records[0]);
  }

  return records;
}

export async function initializeSnapshotData(csvData: string): Promise<void> {
  if (typeof window === "undefined") return;
  const records = parseCSVToRecords(csvData);
  localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(records));
}

export async function getSnapshotRecords(): Promise<SnapshotRecord[]> {
  try {
    const csvPath = path.join(process.cwd(), "public", "snapshot.csv");
    const fileContent = fs.readFileSync(csvPath, {
      encoding: "utf-8",
      flag: "r",
    });
    const separator = detectSeparator(fileContent);
    const normalizedContent = fileContent.replace(/\r\n/g, "\n");
    const lines = normalizedContent.split("\n");
    if (lines.length > 0) console.log("Header sample:", lines[0]);
    if (lines.length > 1) console.log("First data line sample:", lines[1]);

    const records: SnapshotRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const columns = [];
      let currentValue = "";
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' && (j === 0 || line[j - 1] !== "\\")) {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          columns.push(currentValue);
          currentValue = "";
        } else {
          currentValue += char;
        }
      }
      columns.push(currentValue);
      if (columns.length < 3) continue;
      let holderAddress = columns[0] ? columns[0].trim().replace(/"/g, "") : "";
      holderAddress = cleanAddress(holderAddress);
      if (!holderAddress) continue;
      const fullBalance =
        columns.length >= 3 ? columns[2].trim().replace(/"/g, "") : "";
      if (!fullBalance) continue;
      records.push({ holderAddress, balance: fullBalance });
    }

    if (records.length > 0) {
      console.log("First record:", records[0]);
      if (records.length > 1) {
        console.log("Second record:", records[1]);
      }
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
      records[existingRecordIndex].holderAddress = evmAddress;
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

// Função para salvar mapeamentos em um arquivo separado que será acessível em produção
async function saveMappingToFile(
  solanaAddress: string,
  evmAddress: string,
  balance: string
): Promise<boolean> {
  try {
    // Caminho para um diretório com permissões de escrita (pasta tmp/ ou .next/)
    const mappingsDir = path.join(process.cwd(), "public", "data");
    const mappingsPath = path.join(mappingsDir, "mappings.json");

    // Certificar-se de que o diretório existe
    try {
      if (!fs.existsSync(mappingsDir)) {
        fs.mkdirSync(mappingsDir, { recursive: true });
        console.log("Created mappings directory");
      }
    } catch (mkdirError) {
      console.warn("Could not create mappings directory:", mkdirError);
    }

    // Ler mapeamentos existentes ou criar um novo array
    let mappings = [];
    try {
      if (fs.existsSync(mappingsPath)) {
        const existingData = fs.readFileSync(mappingsPath, "utf-8");
        mappings = JSON.parse(existingData);
        console.log(`Read ${mappings.length} existing mappings`);
      }
    } catch (readError) {
      console.warn("Error reading existing mappings:", readError);
      mappings = []; // Iniciar com array vazio se não puder ler
    }

    // Verificar se o endereço Solana já existe
    const existingIndex = mappings.findIndex(
      (m: any) => m.solanaAddress.toLowerCase() === solanaAddress.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Já existe um mapeamento, verificar se tem EVM
      if (
        mappings[existingIndex].evmAddress &&
        mappings[existingIndex].evmAddress.trim() !== ""
      ) {
        console.log("This Solana address already has an EVM mapping");
        return false;
      }

      // Atualizar o mapeamento existente
      mappings[existingIndex].evmAddress = evmAddress;
      mappings[existingIndex].updatedAt = new Date().toISOString();
    } else {
      // Adicionar novo mapeamento
      mappings.push({
        solanaAddress,
        evmAddress,
        balance,
        createdAt: new Date().toISOString(),
      });
    }

    // Salvar o arquivo
    fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2), "utf-8");
    console.log(`Saved ${mappings.length} mappings to file`);

    // Também tentar salvar em formato CSV para fácil visualização
    try {
      const csvPath = path.join(mappingsDir, "mappings.csv");
      let csvContent = "SolanaAddress;EVMAddress;Balance;CreatedAt\n";

      mappings.forEach((m: any) => {
        csvContent += `${m.solanaAddress};${m.evmAddress};${m.balance};${m.createdAt}\n`;
      });

      fs.writeFileSync(csvPath, csvContent, "utf-8");
      console.log("Also saved mappings as CSV");
    } catch (csvError) {
      console.warn("Could not save CSV version:", csvError);
      // Não falhar por causa disso
    }

    return true;
  } catch (error) {
    console.error("Error saving mapping to file:", error);
    return false;
  }
}

// Função para buscar mapeamento EVM existente para um endereço Solana
export async function getMappingForSolanaAddress(
  solanaAddress: string
): Promise<string | null> {
  try {
    const normalizedAddress = solanaAddress.toLowerCase().trim();

    // Primeiro verificar no arquivo CSV principal
    const record = await findBySolanaAddressInCSV(normalizedAddress);
    if (record && record.holderAddress && record.holderAddress.trim() !== "") {
      return record.holderAddress;
    }

    // Se não encontrou, verificar no arquivo de mapeamentos
    const mappingsPath = path.join(
      process.cwd(),
      "public",
      "data",
      "mappings.json"
    );
    if (fs.existsSync(mappingsPath)) {
      const data = fs.readFileSync(mappingsPath, "utf-8");
      const mappings = JSON.parse(data);

      const mapping = mappings.find(
        (m: any) => m.solanaAddress.toLowerCase() === normalizedAddress
      );

      if (mapping && mapping.evmAddress) {
        return mapping.evmAddress;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting mapping for Solana address:", error);
    return null;
  }
}

export async function findBySolanaAddressInCSV(
  solanaAddress: string
): Promise<SnapshotRecord | null> {
  try {
    const normalizedAddress = solanaAddress.toLowerCase().trim();

    // Primeiro verificar mapeamento salvo separadamente
    const existingEVM = await getMappingForSolanaAddress(normalizedAddress);

    // Obter dados do snapshot
    const records = await getSnapshotRecords();

    console.log(`Searching for Solana address: ${normalizedAddress}`);
    console.log(`Total records to search: ${records.length}`);

    // Buscar em todos os registros
    for (const record of records) {
      // Normalizar o endereço do registro para comparação
      const recordAddress = record.holderAddress.toLowerCase().trim();

      // Comparar os endereços
      if (recordAddress === normalizedAddress) {
        console.log(`Found matching record for address: ${normalizedAddress}`);

        // Se temos um mapeamento EVM salvo separadamente, usá-lo
        if (existingEVM) {
          record.holderAddress = existingEVM;
        }

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

    // Verificar se já existe um mapeamento via função de busca que inclui arquivo separado
    const existingEVM = await getMappingForSolanaAddress(
      normalizedSolanaAddress
    );
    if (existingEVM) {
      console.log(
        "This Solana address already has an EVM address mapped:",
        existingEVM
      );
      return false;
    }

    // Tentar salvar primeiro no arquivo CSV
    let savedInCSV = false;
    try {
      const csvPath = path.join(process.cwd(), "public", "snapshot.csv");
      const fileContent = fs.readFileSync(csvPath, {
        encoding: "utf-8",
        flag: "r",
      });

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
        savedInCSV = true;
      }
    } catch (csvError) {
      console.warn("Could not update CSV file directly:", csvError);
    }

    // Se não conseguiu salvar no CSV ou não encontrou o endereço, salvar em arquivo separado
    if (!savedInCSV) {
      console.log("Saving mapping to separate file...");
      const saved = await saveMappingToFile(
        solanaAddress,
        evmAddress,
        record.balance || "0"
      );

      if (saved) {
        console.log("Successfully saved mapping to separate file");
        return true;
      } else {
        console.error("Failed to save mapping to any location");
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating mapping in CSV:", error);

    // Tentar salvar em arquivo separado como último recurso
    try {
      const record = await findBySolanaAddressInCSV(solanaAddress);
      if (record) {
        const saved = await saveMappingToFile(
          solanaAddress,
          evmAddress,
          record.balance || "0"
        );

        if (saved) {
          console.log("Saved mapping to separate file after error");
          return true;
        }
      }
    } catch (fallbackError) {
      console.error("Error in fallback save:", fallbackError);
    }

    return false;
  }
}
