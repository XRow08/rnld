import fs from "fs";
import path from "path";
import { generateMerkleTree, MerkleLeaf } from "./merkle";
import { getSnapshotRecords } from "./csv-manager";
import type { StandardMerkleTree } from "@openzeppelin/merkle-tree";

interface MerkleCache {
  root: string;
  proofs: { [address: string]: string[] };
  leaves: MerkleLeaf[];
  timestamp: number;
  tree: StandardMerkleTree<any>;
}

let memoryCacheData: MerkleCache | null = null;

const CACHE_FILE_PATH = path.join(process.cwd(), "merkle-cache.json");
const CACHE_EXPIRY_MS = 3600000;

export async function generateAndCacheMerkleTree(): Promise<MerkleCache> {
  const snapshotRecords = await getSnapshotRecords();
  const leaves = snapshotRecords
    .map((record) => ({
      address: record.holderAddress.toLowerCase(),
      value: record.balance || "0",
    }))
    .filter((leaf) => leaf.address && leaf.value);
  leaves.sort((a, b) => a.address.localeCompare(b.address));
  const { root, proofs, tree } = generateMerkleTree(leaves);
  const cacheData: MerkleCache = {
    root,
    proofs,
    leaves,
    tree,
    timestamp: Date.now(),
  };

  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cacheData, null, 2));
    console.log("Merkle Tree cache saved to file");
  } catch (error) {
    console.error("Error saving Merkle Tree cache:", error);
  }
  memoryCacheData = cacheData;
  return cacheData;
}

export async function getMerkleTreeCache(): Promise<MerkleCache> {
  if (memoryCacheData) {
    if (Date.now() - memoryCacheData.timestamp < CACHE_EXPIRY_MS) {
      return memoryCacheData;
    }
  }
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const fileContent = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
      const fileCache = JSON.parse(fileContent) as MerkleCache;
      if (Date.now() - fileCache.timestamp < CACHE_EXPIRY_MS) {
        memoryCacheData = fileCache;
        return fileCache;
      }
    }
  } catch (error) {
    console.error("Error reading Merkle Tree cache file:", error);
  }
  return generateAndCacheMerkleTree();
}

export async function getProofForAddress(address: string): Promise<{
  root: string;
  proof: string[];
  value: string;
  exists: boolean;
}> {
  const cache = await getMerkleTreeCache();
  const normalizedAddress = address.toLowerCase();

  const leaf = cache.leaves.find((l) => l.address === normalizedAddress);

  if (!leaf) {
    return {
      root: cache.root,
      proof: [],
      value: "0",
      exists: false,
    };
  }

  return {
    root: cache.root,
    proof: cache.proofs[normalizedAddress] || [],
    value: leaf.value,
    exists: true,
  };
}
