import { NextResponse } from "next/server";
import { importSnapshotToDB, supabase } from "@/utils/supabase-server";
import fs from "fs";
import path from "path";
import readline from "readline";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Aumentar o timeout para 10 minutos para permitir importações grandes
export const maxDuration = 600;

// Interface para resultados da importação
interface ImportResult {
  success: boolean;
  count?: number;
  totalRecords?: number;
  processedLines?: number;
  errors?: number;
  log?: string[];
  error?: string;
  importedRecords?: number;
}

// Função para importar diretamente sem usar a função existente
async function importDirectToSupabase(): Promise<ImportResult> {
  // Configurações para a importação
  const batchSize = 50; // Lotes menores são mais confiáveis
  const delayBetweenBatches = 200; // ms
  const csvPath = path.join(process.cwd(), "public", "snapshot.csv");
  
  // Verificar se o arquivo existe
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Arquivo CSV não encontrado: ${csvPath}`);
  }
  
  // Usar o cliente supabase importado
  let totalLines = 0;
  let processedLines = 0;
  let importedRecords = 0;
  let errors = 0;
  let progressLog: string[] = [];
  
  // Contar linhas (opcional, apenas para status)
  try {
    const countStream = fs.createReadStream(csvPath, { encoding: "utf-8" });
    const countReader = readline.createInterface({
      input: countStream,
      crlfDelay: Infinity
    });
    
    for await (const _ of countReader) {
      totalLines++;
    }
    
    progressLog.push(`Total de linhas no arquivo: ${totalLines}`);
  } catch (error: any) {
    progressLog.push(`Erro ao contar linhas: ${error.message}`);
    totalLines = -1; // Código para indicar que não foi possível contar
  }
  
  // Processar o arquivo
  try {
    const fileStream = fs.createReadStream(csvPath, { encoding: "utf-8" });
    const lineReader = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let batch = [];
    let isFirstLine = true;
    
    for await (const line of lineReader) {
      // Pular o cabeçalho
      if (isFirstLine) {
        isFirstLine = false;
        continue;
      }
      
      processedLines++;
      
      const parts = line.split(";");
      if (parts.length < 3) continue;
      
      const solanaAddress = parts[0]?.trim();
      if (!solanaAddress) continue;
      
      const evmAddress = parts[2] ? parts[2].trim() : "";
      const balance = parts[3] ? parts[3].replace(/\./g, "").replace(/,/g, ".") : "0";
      const balance_normal = parts[4] ||"0";
      
      batch.push({
        solana_address: solanaAddress.toLowerCase(),
        evm_address: evmAddress.toLowerCase(),
        balance: balance,
        balance_normal: balance_normal,
        created_at: new Date().toISOString()
      });
      
      // Quando o lote estiver completo, inserir no banco
      if (batch.length >= batchSize) {
        try {
          const { error } = await supabase.from("wallet_mappings").insert(batch);
          if (error) {
            if (error.code === "23505") { // Violação de chave única
              progressLog.push(`Aviso: Lote com registros duplicados (processado até linha ${processedLines})`);
            } else {
              errors++;
              progressLog.push(`Erro no lote (linha ${processedLines}): ${error.message}`);
            }
          }
          
          importedRecords += batch.length;
          
          // Reportar progresso a cada 500 registros
          if (importedRecords % 500 === 0) {
            const percentage = totalLines > 0 ? Math.round((processedLines / totalLines) * 100) : "?";
            progressLog.push(`Progresso: ${importedRecords} registros importados (${percentage}% do arquivo)`);
          }
          
        } catch (error: any) {
          errors++;
          progressLog.push(`Exceção ao inserir lote: ${error.message}`);
        }
        
        // Limpar lote e adicionar pausa para não sobrecarregar
        batch = [];
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    // Inserir o lote final, se houver
    if (batch.length > 0) {
      try {
        const { error } = await supabase.from("wallet_mappings").insert(batch);
        if (error && error.code !== "23505") {
          progressLog.push(`Erro no lote final: ${error.message}`);
          errors++;
        }
        importedRecords += batch.length;
      } catch (error: any) {
        errors++;
        progressLog.push(`Exceção no lote final: ${error.message}`);
      }
    }
    
    return {
      success: true,
      totalRecords: importedRecords,
      processedLines,
      errors,
      log: progressLog
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      processedLines,
      importedRecords,
      log: progressLog
    };
  }
}

// Rota para importar dados do snapshot para o banco Supabase
// Uso: /api/import-snapshot?secret=SUA_CHAVE_SECRETA&direct=true
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Chave secreta para proteger a rota (deve ser definida como variável de ambiente)
    const secretKey = searchParams.get("secret");
    
    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.error("Supabase environment variables not configured");
      return NextResponse.json(
        { 
          success: false,
          error: "Supabase configuration missing. Check SUPABASE_URL and SUPABASE_SERVICE_KEY env variables." 
        },
        { status: 500 }
      );
    }
    
    if (!secretKey || secretKey !== process.env.IMPORT_SECRET_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Verificar se deve usar o método direto mais robusto
    const useDirectMethod = searchParams.get("direct") === "true";
    
    console.log(`Starting snapshot import using ${useDirectMethod ? "direct" : "standard"} method`);
    
    let result: ImportResult;
    
    if (useDirectMethod) {
      // Usar método direto para importação
      result = await importDirectToSupabase();
    } else {
      // Usar método padrão com tamanho de lote pequeno para melhor confiabilidade
      const batchSize = parseInt(searchParams.get("batchSize") || "50", 10);
      
      // Validar o tamanho do lote
      if (isNaN(batchSize) || batchSize < 1 || batchSize > 500) {
        return NextResponse.json(
          { error: "Invalid batch size. Must be between 1 and 500." },
          { status: 400 }
        );
      }
      
      result = await importSnapshotToDB(batchSize);
    }
    
    if (result.success) {
      const message = useDirectMethod
        ? `Successfully imported ${result.totalRecords} records (${result.processedLines} lines processed)`
        : `Successfully imported ${result.count} records`;
        
      return NextResponse.json({
        success: true,
        message,
        details: useDirectMethod ? result : undefined
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: "Import failed",
          details: result
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in import API:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "An error occurred during import",
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 