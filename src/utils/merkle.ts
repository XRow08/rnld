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
  const values = leaves.map((leaf) => [
    leaf.address.toLowerCase(),
    BigInt(leaf.value.replace(/[^0-9]/g, "")).toString(),
  ]);

  const tree = StandardMerkleTree.of(values, ["address", "uint256"]);
  const root = tree.root;

  const proofs: { [address: string]: string[] } = {};
  leaves.forEach((leaf, index) => {
    const proof = tree.getProof(index);
    proofs[leaf.address.toLowerCase()] = proof;
  });

  return { root, proofs, tree };
}

export function verifyMerkleProof(
  leaf: MerkleLeaf,
  proof: string[],
  root: string
): boolean {
  try {
    const value = [
      leaf.address.toLowerCase(),
      BigInt(leaf.value.replace(/[^0-9]/g, "")).toString(),
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
