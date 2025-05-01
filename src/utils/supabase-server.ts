import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Usar variáveis de ambiente para as credenciais (apenas no servidor)
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

// Criar o cliente Supabase com a chave de serviço (apenas para uso no servidor)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Interface para o registro de mapeamento
export interface WalletMapping {
  id?: number;
  solana_address: string;
  evm_address: string;
  balance: string;
  created_at?: string;
  updated_at?: string;
}

// Função para buscar mapeamento existente
export async function getMappingBySolanaAddress(
  solanaAddress: string
): Promise<WalletMapping | null> {
  try {
    const { data, error } = await supabase
      .from("wallet_mappings")
      .select("*")
      .eq("solana_address", solanaAddress.toLowerCase().trim())
      .single();

    if (error) {
      console.error("Error fetching mapping:", error);
      return null;
    }

    return data as WalletMapping;
  } catch (error) {
    console.error("Error in getMappingBySolanaAddress:", error);
    return null;
  }
}

// Função para criar ou atualizar mapeamento
export async function saveWalletMapping(
  solanaAddress: string,
  evmAddress: string,
  balance: string
): Promise<boolean> {
  try {
    // Verificar se já existe
    const existingMapping = await getMappingBySolanaAddress(solanaAddress);

    if (existingMapping && existingMapping.evm_address) {
      console.log("This Solana address already has a mapping");
      return false;
    }

    // Se existir mas não tiver endereço EVM, atualizar
    if (existingMapping) {
      const { error } = await supabase
        .from("wallet_mappings")
        .update({
          evm_address: evmAddress.toLowerCase().trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMapping.id);

      if (error) {
        console.error("Error updating mapping:", error);
        return false;
      }
      return true;
    }

    // Caso contrário, criar novo
    const { error } = await supabase.from("wallet_mappings").insert({
      solana_address: solanaAddress.toLowerCase().trim(),
      evm_address: evmAddress.toLowerCase().trim(),
      balance: balance,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error inserting mapping:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in saveWalletMapping:", error);
    return false;
  }
}

// Função para verificar se um endereço Solana existe
export async function findSolanaAddressInSnapshotFile(
  solanaAddress: string
): Promise<{
  found: boolean;
  balance?: string;
}> {
  try {
    // Leitura segura do CSV apenas para verificação (somente leitura)
    const normalizedAddress = solanaAddress.toLowerCase().trim();
    const csvPath = path.join(process.cwd(), "public", "snapshot.csv");

    // Ler o arquivo linha por linha para evitar o erro de pilha
    const fileStream = fs.createReadStream(csvPath, { encoding: "utf-8" });
    const lineReader = require("readline").createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    // Pular a primeira linha (cabeçalho)
    let firstLine = true;

    for await (const line of lineReader) {
      if (firstLine) {
        firstLine = false;
        continue;
      }

      const parts = line.split(";");
      if (parts.length < 3) continue;

      const addressInFile = parts[0].toLowerCase().trim();

      if (addressInFile === normalizedAddress) {
        const balance = parts[3]
          ? parts[3].replace(/\./g, "").replace(/,/g, ".")
          : "0";
        return {
          found: true,
          balance: balance,
        };
      }
    }

    return { found: false };
  } catch (error) {
    console.error("Error checking Solana address in CSV:", error);
    return { found: false };
  }
}

// Função para inicializar o banco com dados do snapshot CSV
export async function importSnapshotToDB(
  batchSize = 100
): Promise<{ success: boolean; count: number }> {
  try {
    // Ler o arquivo CSV
    const csvPath = path.join(process.cwd(), "public", "snapshot.csv");
    console.log("Reading CSV file from:", csvPath);

    // Contar o número total de linhas para acompanhamento do progresso
    let totalLines = 0;
    try {
      const countStream = fs.createReadStream(csvPath, { encoding: "utf-8" });
      const countReader = require("readline").createInterface({
        input: countStream,
        crlfDelay: Infinity,
      });

      for await (const _ of countReader) {
        totalLines++;
      }
      console.log(`Total lines in CSV: ${totalLines}`);
    } catch (countError) {
      console.warn("Error counting lines:", countError);
      console.log("Continuing with import without line count");
    }

    // Ler o arquivo para importação
    const fileStream = fs.createReadStream(csvPath, { encoding: "utf-8" });
    const lineReader = require("readline").createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    // Preparar para batch insert
    let batch: any[] = [];
    let totalImported = 0;
    let firstLine = true;
    let lastReportTime = Date.now();
    const reportInterval = 5000; // Reportar a cada 5 segundos

    console.log("Starting import process...");
    for await (const line of lineReader) {
      // Pular cabeçalho
      if (firstLine) {
        firstLine = false;
        continue;
      }

      const parts = line.split(";");
      if (parts.length < 3) continue;

      const solanaAddress = parts[0]?.trim();
      if (!solanaAddress) continue;

      const evmAddress = parts[2] ? parts[2].trim() : "";
      const balance = parts[3]
        ? parts[3].replace(/\./g, "").replace(/,/g, ".")
        : "0";

      // Adicionar ao lote atual
      batch.push({
        solana_address: solanaAddress.toLowerCase(),
        evm_address: evmAddress.toLowerCase(),
        balance: balance,
        created_at: new Date().toISOString(),
      });

      // Se o lote atingir o tamanho, inserir no banco
      if (batch.length >= batchSize) {
        try {
          const { error } = await supabase
            .from("wallet_mappings")
            .insert(batch);
          if (error) {
            // Se for erro de unicidade, não falhar completamente
            if (error.code === "23505") {
              // Código de violação de unicidade
              console.warn(
                "Duplicate entries detected, continuing with import"
              );
              // Poderia implementar lógica para tentar inserir um por um
            } else {
              console.error("Error inserting batch:", error);
            }
          }
        } catch (insertError) {
          console.error("Exception inserting batch:", insertError);
        }

        totalImported += batch.length;
        batch = [];

        // Reportar progresso periodicamente
        const now = Date.now();
        if (now - lastReportTime > reportInterval) {
          const percentage = totalLines
            ? Math.round((totalImported / totalLines) * 100)
            : "?";
          console.log(
            `Imported ${totalImported} records so far (${percentage}% complete)`
          );
          lastReportTime = now;
        }
      }
    }

    // Inserir o lote final se houver
    if (batch.length > 0) {
      try {
        const { error } = await supabase.from("wallet_mappings").insert(batch);
        if (!error) {
          totalImported += batch.length;
        } else {
          console.warn("Error on final batch:", error);
        }
      } catch (finalError) {
        console.error("Exception on final batch:", finalError);
      }
    }

    console.log(`Import complete. Total records processed: ${totalImported}`);
    return {
      success: true,
      count: totalImported,
    };
  } catch (error) {
    console.error("Error importing CSV to database:", error);
    return {
      success: false,
      count: 0,
    };
  }
}
