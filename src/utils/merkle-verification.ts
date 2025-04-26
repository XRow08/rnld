import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { SnapshotRecord } from "@/types/snapshot";

const SNAPSHOT_PATH = path.join(process.cwd(), "public/snapshot.csv");
const MERKLE_TREE_PATH = path.join(process.cwd(), "public/merkle-tree.json");

// Function to generate a Merkle tree from snapshot data
export function generateMerkleTree(): StandardMerkleTree<string[]> {
  try {
    // Check if snapshot exists
    if (!fs.existsSync(SNAPSHOT_PATH)) {
      throw new Error("Snapshot file not found");
    }

    // Read snapshot records
    const records = readCSV();
    if (records.length === 0) {
      throw new Error("No records found in snapshot");
    }

    // Filter out records with empty addresses
    const validRecords = records.filter(
      (record) => record.accountSolana && record.accountSolana.trim() !== ""
    );

    if (validRecords.length === 0) {
      throw new Error("No valid records found in snapshot");
    }

    // Create values for the Merkle tree - using string types for Solana addresses
    // Each leaf will be [walletAddress, balance]
    const values = validRecords.map((record) => {
      // Ensure balance is a valid number string
      let balance = "0";
      if (record.balance) {
        // Remove any non-numeric characters except decimal point
        const cleanBalance = record.balance.toString().replace(/[^0-9.]/g, "");
        
        // Parse as float and check if it's a valid number
        const numBalance = parseFloat(cleanBalance);
        
        if (!isNaN(numBalance)) {
          // Convert to string to avoid precision issues
          balance = numBalance.toString();
        }
      }
      
      return [
        record.accountSolana.toLowerCase(),
        balance,
      ];
    });

    // Generate the Merkle tree with string types
    const tree = StandardMerkleTree.of(values, ["string", "string"]);

    // Save the tree
    fs.writeFileSync(MERKLE_TREE_PATH, JSON.stringify(tree.dump()), "utf8");

    return tree as StandardMerkleTree<string[]>;
  } catch (error) {
    console.error("Error generating Merkle tree:", error);
    throw error;
  }
}

// Function to verify if an address is in the Merkle tree
export function verifyAddressInMerkleTree(address: string): {
  isInTree: boolean;
  proof?: string[];
  balance?: string;
} {
  try {
    if (!address || address.trim() === "") {
      return { isInTree: false };
    }

    // Normalize address
    const normalizedAddress = address.toLowerCase();

    // Load or generate tree
    let tree: StandardMerkleTree<string[]>;

    if (fs.existsSync(MERKLE_TREE_PATH)) {
      // Load existing tree
      const treeData = JSON.parse(fs.readFileSync(MERKLE_TREE_PATH, "utf8"));
      tree = StandardMerkleTree.load(treeData);
    } else {
      // Generate new tree
      tree = generateMerkleTree();
    }

    // Find the address in the tree
    // Use Array.from to convert the iterable to an array
    const entries = Array.from(tree.entries());
    for (const [i, v] of entries) {
      if (v[0] === normalizedAddress) {
        // Return proof and balance
        return {
          isInTree: true,
          proof: tree.getProof(i),
          balance: v[1],
        };
      }
    }

    // Address not found
    return {
      isInTree: false,
    };
  } catch (error) {
    console.error("Error verifying address in Merkle tree:", error);
    return {
      isInTree: false,
    };
  }
}

// Helper function to read CSV data
function readCSV(): SnapshotRecord[] {
  try {
    const fileContent = fs.readFileSync(SNAPSHOT_PATH, "utf8");
    const records = parse(fileContent, {
      columns: false,
      skip_empty_lines: true,
      delimiter: ";",
    });

    const result: SnapshotRecord[] = [];
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (row.length < 3) continue;
      result.push({
        accountSolana: row[0] ? row[0].trim() : "",
        tokenAccountSolana: row[1] ? row[1].trim() : "",
        holderAddressBSC: row[2] ? row[2].trim() : "",
        balance: row[3] ? row[3].trim() : "",
        publicTag: row[4] ? row[4].trim() : "",
        owner: row[5] ? row[5].trim() : "",
      });
    }

    return result;
  } catch (error) {
    console.error("Error reading CSV:", error);
    return [];
  }
}
