import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { SnapshotRecord } from "@/types/snapshot";

// Inicializar dados do CSV na variável global
let isInitialized = false;

function initializeSnapshot() {
  if (isInitialized) return;

  try {
    const csvPath = path.join(process.cwd(), "public/snapshot.csv");

    // Verificar se o arquivo existe
    if (!fs.existsSync(csvPath)) {
      console.log("Criando arquivo CSV inicial com dados de teste");

      const header =
        "Account Solana;Token Account Solana;HolderAddress BSC;Balance;Public Tag;Owner;\n";
      try {
        fs.writeFileSync(csvPath, header, "utf-8");
      } catch (writeError) {
        console.error("Erro ao criar arquivo CSV:", writeError);
      }
      global._csvRecords = [];

      console.log("Inicializados registros:", global._csvRecords.length);
    } else {
      console.log("Lendo arquivo CSV existente:", csvPath);
      try {
        const fileContent = fs.readFileSync(csvPath, "utf-8");
        console.log(`Arquivo CSV tem ${fileContent.length} bytes`);

        const lines = fileContent.split("\n");
        console.log(`Arquivo CSV tem ${lines.length} linhas`);

        const records: SnapshotRecord[] = [];
        let linesProcessed = 0;

        // Pular o cabeçalho (linha 0)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          linesProcessed++;
          if (linesProcessed % 1000 === 0) {
            console.log(`Processadas ${linesProcessed} linhas...`);
          }

          const values = line.split(";");
          if (values.length < 3) continue;

          records.push({
            accountSolana: values[0] ? values[0].trim() : "",
            tokenAccountSolana: values[1] ? values[1].trim() : "",
            holderAddressBSC: values[2] ? values[2].trim() : "",
            balance: values[3] ? values[3].trim() : "",
            publicTag: values[4] ? values[4].trim() : "",
            owner: values[5] ? values[5].trim() : "",
          });
        }

        global._csvRecords = records;
        console.log(`Inicializado ${records.length} registros do arquivo CSV`);

        if (records.length > 0) {
          console.log("Amostra dos primeiros registros:", records.slice(0, 3));
        }
      } catch (readError) {
        console.error("Erro ao ler arquivo CSV:", readError);
        global._csvRecords = [];
      }
    }

    isInitialized = true;
    console.log(
      "Inicialização do snapshot concluída com",
      global._csvRecords.length,
      "registros"
    );
  } catch (error) {
    console.error("Erro na inicialização do snapshot:", error);
    global._csvRecords = [];
  }
}

export function middleware(request: NextRequest) {
  if (!isInitialized) {
    initializeSnapshot();
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
