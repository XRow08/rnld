import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { SnapshotRecord } from '@/types/snapshot';

// Inicializar dados do CSV na variável global
let isInitialized = false;

function initializeSnapshot() {
  if (isInitialized) return;
  
  try {
    const csvPath = path.join(process.cwd(), 'public/snapshot.csv');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(csvPath)) {
      console.log('Criando arquivo CSV inicial com dados de teste');
      
      // Dados de teste para desenvolvimento - só usar se precisar
      const useTestData = false;
      if (useTestData) {
        // Criar com dados de teste
        const testData = [
          'Account Solana;Token Account Solana;HolderAddress BSC;Balance;Public Tag;Owner;',
          'EXcnbXE1UPzZCjxVYgR9CCLZJxgHfAapP1V3wTZR2XXk;ABC123;0x123456789abcdef;1000;test;owner1;',
          'D7Qk5aUtRbmYasie9gXHiKKdp6T2jHs2MrJjKj2UYBz4;DEF456;0x987654321fedcba;2000;test2;owner2;',
          'TEST123;GHI789;0xabcdef123456789;3000;test3;owner3;'
        ].join('\n');
        
        try {
          fs.writeFileSync(csvPath, testData, 'utf-8');
        } catch (writeError) {
          console.error('Erro ao criar arquivo CSV:', writeError);
        }
        
        // Inicializar dados de teste na memória também
        global._csvRecords = [
          {
            accountSolana: 'EXcnbXE1UPzZCjxVYgR9CCLZJxgHfAapP1V3wTZR2XXk',
            tokenAccountSolana: 'ABC123',
            holderAddressBSC: '0x123456789abcdef',
            balance: '1000',
            publicTag: 'test',
            owner: 'owner1'
          },
          {
            accountSolana: 'D7Qk5aUtRbmYasie9gXHiKKdp6T2jHs2MrJjKj2UYBz4',
            tokenAccountSolana: 'DEF456',
            holderAddressBSC: '0x987654321fedcba',
            balance: '2000',
            publicTag: 'test2',
            owner: 'owner2'
          },
          {
            accountSolana: 'TEST123',
            tokenAccountSolana: 'GHI789',
            holderAddressBSC: '0xabcdef123456789',
            balance: '3000',
            publicTag: 'test3',
            owner: 'owner3'
          }
        ];
      } else {
        // Criar arquivo vazio apenas com cabeçalho
        const header = 'Account Solana;Token Account Solana;HolderAddress BSC;Balance;Public Tag;Owner;\n';
        try {
          fs.writeFileSync(csvPath, header, 'utf-8');
        } catch (writeError) {
          console.error('Erro ao criar arquivo CSV:', writeError);
        }
        global._csvRecords = [];
      }
      
      console.log('Inicializados registros:', global._csvRecords.length);
    } else {
      console.log('Lendo arquivo CSV existente:', csvPath);
      // Arquivo existe, ler o conteúdo
      try {
        const fileContent = fs.readFileSync(csvPath, 'utf-8');
        console.log(`Arquivo CSV tem ${fileContent.length} bytes`);
        
        const lines = fileContent.split('\n');
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
          
          const values = line.split(';');
          if (values.length < 3) continue;
          
          records.push({
            accountSolana: values[0] ? values[0].trim() : '',
            tokenAccountSolana: values[1] ? values[1].trim() : '',
            holderAddressBSC: values[2] ? values[2].trim() : '',
            balance: values[3] ? values[3].trim() : '',
            publicTag: values[4] ? values[4].trim() : '',
            owner: values[5] ? values[5].trim() : '',
          });
        }
        
        global._csvRecords = records;
        console.log(`Inicializado ${records.length} registros do arquivo CSV`);
        
        // Log de amostra dos primeiros 3 registros
        if (records.length > 0) {
          console.log('Amostra dos primeiros registros:', records.slice(0, 3));
        }
      } catch (readError) {
        console.error('Erro ao ler arquivo CSV:', readError);
        global._csvRecords = [];
      }
    }
    
    isInitialized = true;
    console.log('Inicialização do snapshot concluída com', global._csvRecords.length, 'registros');
  } catch (error) {
    console.error('Erro na inicialização do snapshot:', error);
    global._csvRecords = [];
  }
}

// Middleware
export function middleware(request: NextRequest) {
  // Inicializar dados do snapshot na primeira execução
  if (!isInitialized) {
    initializeSnapshot();
  }
  
  return NextResponse.next();
}

// Configuração do middleware para executar em todas as rotas
export const config = {
  matcher: '/:path*',
}; 