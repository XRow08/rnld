"use client";

import { useState } from "react";
import { findBySolanaAddress, getSnapshotRecords, initializeSnapshotData } from "@/utils/csv-manager";

export const DebugSnapshot = () => {
  const [address, setAddress] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [csvData, setCsvData] = useState<string>("");
  const [importMessage, setImportMessage] = useState<string>("");

  const handleCheck = () => {
    if (!address) return;
    
    // Tenta encontrar o endereço no snapshot
    const record = findBySolanaAddress(address);
    setResult(record || { notFound: true });
  };

  const showAllRecords = async () => {
    const records = await getSnapshotRecords();
    setAllRecords(records);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      setCsvData(text);
      
      try {
        // Inicializar com os dados do arquivo CSV
        await initializeSnapshotData(text);
        setImportMessage("CSV importado com sucesso!");
        
        // Atualizar a lista de registros
        showAllRecords();
      } catch (error) {
        console.error("Erro ao importar CSV:", error);
        setImportMessage("Erro ao importar CSV. Verifique o formato.");
      }
    };
    
    reader.readAsText(file);
  };

  const handleCsvDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvData(e.target.value);
  };

  const handleImportCsv = async () => {
    if (!csvData) return;
    
    try {
      // Inicializar com os dados do textarea
      await initializeSnapshotData(csvData);
      setImportMessage("Dados CSV importados com sucesso!");
      
      // Atualizar a lista de registros
      showAllRecords();
    } catch (error) {
      console.error("Erro ao importar CSV:", error);
      setImportMessage("Erro ao importar CSV. Verifique o formato.");
    }
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg mt-4">
      <h3 className="text-lg font-bold text-yellow-400 mb-3">Debug Snapshot</h3>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Solana address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded text-white"
        />
        <button 
          onClick={handleCheck}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Check
        </button>
        <button 
          onClick={showAllRecords}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Show All
        </button>
      </div>
      
      {result && (
        <div className="p-3 bg-gray-800 rounded mb-4 overflow-auto">
          <h4 className="font-bold text-white mb-2">Result:</h4>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Importação de CSV */}
      <div className="p-3 bg-gray-800 rounded mb-4">
        <h4 className="font-bold text-white mb-2">Import CSV</h4>
        
        <div className="mb-3">
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-300 
                       file:mr-4 file:py-2 file:px-4
                       file:rounded file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-600 file:text-white
                       hover:file:bg-blue-700"
          />
        </div>
        
        <div className="mb-3">
          <textarea 
            value={csvData}
            onChange={handleCsvDataChange}
            placeholder="Cole o conteúdo CSV aqui..."
            className="w-full h-28 p-2 bg-gray-700 text-white rounded text-xs"
          />
        </div>
        
        <div className="flex justify-between items-center">
          <button 
            onClick={handleImportCsv}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            Import CSV
          </button>
          
          {importMessage && (
            <span className={`text-xs ${importMessage.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>
              {importMessage}
            </span>
          )}
        </div>
      </div>
      
      {allRecords.length > 0 && (
        <div className="p-3 bg-gray-800 rounded overflow-auto max-h-60">
          <h4 className="font-bold text-white mb-2">All Records ({allRecords.length}):</h4>
          <div className="text-xs text-gray-300">
            {allRecords.map((record, index) => (
              <div key={index} className="mb-2 p-2 border-b border-gray-700">
                <div>Solana: <span className="text-green-400">{record.accountSolana || '(empty)'}</span></div>
                <div>EVM: <span className="text-blue-400">{record.holderAddressBSC || '(empty)'}</span></div>
                <div>Balance: <span className="text-yellow-400">{record.balance || '0'}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 