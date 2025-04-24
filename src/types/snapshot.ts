// Interface para os registros do CSV
export interface SnapshotRecord {
  // Campos obrigatórios que não podem ser undefined
  accountSolana: string;
  tokenAccountSolana: string;
  holderAddressBSC: string;
  balance: string;
  publicTag: string;
  owner: string;
  
  // Campos alternativos/aliases que podem estar presentes em diferentes implementações
  solana?: string;
  bsc?: string;
}

// Declaração para a variável global de forma global, sem redeclarar
declare global {
  // Declaração global única
  var _csvRecords: SnapshotRecord[] | undefined;
} 