import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

export interface MerkleLeaf {
  address: string;
  value: string;
}

export function generateMerkleTree(leaves: MerkleLeaf[]): {
  root: string;
  proofs: { [address: string]: string[] };
  tree: StandardMerkleTree<any>;
} {
  try {
    console.log("Gerando Merkle Tree com", leaves.length, "folhas");
    
    // Verificar alguns dos primeiros valores para debug
    if (leaves.length > 0) {
      console.log("Exemplos de entrada para o Merkle Tree:");
      for (let i = 0; i < Math.min(3, leaves.length); i++) {
        console.log(`Leaf ${i}:`, leaves[i]);
      }
    }
    
    // Nota: Os valores já estão normalizados neste ponto
    // Apenas converter para BigInt para garantir formato numérico
    const values = leaves.map((leaf) => {
      try {
        // Usar o valor diretamente, ele já deve estar normalizado
        return [
          leaf.address.toLowerCase(),
          BigInt(leaf.value).toString()
        ];
      } catch (error) {
        console.error(`Erro ao processar folha: ${leaf.address} - ${leaf.value}`, error);
        // Usar 0 para valores que não podem ser convertidos
        return [leaf.address.toLowerCase(), "0"];
      }
    });
    
    // Filtrar quaisquer valores problemáticos
    const validValues = values.filter(value => value[1] !== "0");
    
    if (validValues.length === 0) {
      throw new Error("Nenhum valor válido para gerar a Merkle Tree");
    }

    console.log(`Criando Merkle Tree com ${validValues.length} valores válidos`);
    const tree = StandardMerkleTree.of(validValues, ["address", "uint256"]);
    const root = tree.root;

    console.log("Merkle Root:", root);
    console.log("Gerando provas para cada endereço...");

    const proofs: { [address: string]: string[] } = {};
    let validCount = 0;
    
    // Gerar provas para cada folha válida
    validValues.forEach((value, index) => {
      try {
        const address = value[0].toLowerCase();
        const proof = tree.getProof(index);
        proofs[address] = proof;
        validCount++;
      } catch (error) {
        console.error(`Erro ao gerar prova para índice ${index}:`, error);
      }
    });

    console.log(`Geradas ${validCount} provas com sucesso`);
    return { root, proofs, tree };
  } catch (error) {
    console.error("Erro crítico ao gerar Merkle Tree:", error);
    throw error;
  }
}

export function verifyMerkleProof(
  leaf: MerkleLeaf,
  proof: string[],
  root: string
): boolean {
  try {
    // Usar o valor diretamente, ele já deve estar normalizado
    const value = [
      leaf.address.toLowerCase(),
      BigInt(leaf.value).toString()
    ];
    
    return StandardMerkleTree.verify(
      root,
      ["address", "uint256"],
      value,
      proof
    );
  } catch (error) {
    console.error("Error verifying Merkle proof:", error);
    return false;
  }
}
