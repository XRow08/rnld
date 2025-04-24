interface SnapshotRecord {
  accountSolana: string;
  tokenAccountSolana: string;
  holderAddressBSC: string;
  balance: string;
  publicTag: string;
  owner: string;
}

const SNAPSHOT_STORAGE_KEY = 'star10_snapshot_data';

export function parseCSVToRecords(csvData: string): SnapshotRecord[] {
  const lines = csvData.split('\n');
  const records: SnapshotRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(';');
    if (values.length < 3) continue;
    
    const cleanBalance = values[3] ? values[3].replace(/\./g, '').replace(/,/g, '.') : '';
    
    records.push({
      accountSolana: values[0] ? values[0].trim() : '',
      tokenAccountSolana: values[1] ? values[1].trim() : '',
      holderAddressBSC: values[2] ? values[2].trim() : '',
      balance: cleanBalance,
      publicTag: values[4] ? values[4].trim() : '',
      owner: values[5] ? values[5].trim() : '',
    });
  }
  
  console.log("CSV Parsed Records:", records);
  return records;
}

export async function initializeSnapshotData(csvData: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const records = parseCSVToRecords(csvData);
  localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(records));
  
  console.log(`Initialized ${records.length} records in localStorage`);
}

export async function getSnapshotRecords(): Promise<any[]> {
  try {
    const response = await fetch('/api/get-all-records', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao obter registros: ${response.statusText}`);
    }

    const data = await response.json();
    return data.records || [];
  } catch (error) {
    console.error('Erro ao obter registros do snapshot:', error);
    return [];
  }
}

export async function findBySolanaAddress(address: string): Promise<any> {
  try {
    const response = await fetch(`/api/check-snapshot?address=${encodeURIComponent(address)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na verificação do snapshot: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao verificar endereço no snapshot:', error);
    return { error: (error as Error).message };
  }
}

export async function updateEVMAddressForSolana(solanaAddress: string, evmAddress: string, tokenBalance: number) {
  if (typeof window === 'undefined') return false;
  
  try {
    const records: any[] = await getSnapshotRecords();
    
    const cleanAddress = solanaAddress.trim().toLowerCase();
    let existingRecordIndex = records.findIndex(
      record => record.accountSolana && 
      record.accountSolana.trim().toLowerCase() === cleanAddress
    );
    
    if (existingRecordIndex >= 0) {
      records[existingRecordIndex].holderAddressBSC = evmAddress;
      console.log(`Updated record at index ${existingRecordIndex}`);
    } else {
      records.push({
        accountSolana: solanaAddress,
        tokenAccountSolana: '',
        holderAddressBSC: evmAddress,
        balance: tokenBalance.toString(),
        publicTag: '',
        owner: '',
      });
      console.log(`Added new record for ${solanaAddress}`);
    }
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(records));
    console.log(`Saved ${records.length} records to localStorage`);
    
    return true;
  } catch (error) {
    console.error('Error updating snapshot data:', error);
    return false;
  }
}

export async function saveMapping(solanaAddress: string, evmAddress: string): Promise<any> {
  try {
    const response = await fetch('/api/save-mapping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ solanaAddress, evmAddress }),
    });

    if (!response.ok) {
      throw new Error(`Erro ao salvar mapeamento: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao salvar mapeamento:', error);
    return { error: (error as Error).message };
  }
} 