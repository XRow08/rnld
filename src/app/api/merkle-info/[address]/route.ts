import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface MerkleCache {
  root: string;
  proofs: { [address: string]: string[] };
  leaves: { address: string; value: string }[];
  timestamp: number;
}

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address.toLowerCase();
    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }
    const CACHE_FILE_PATH = path.join(process.cwd(), "merkle-cache.json");
    let cacheData: MerkleCache;

    try {
      const fileContent = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
      cacheData = JSON.parse(fileContent) as MerkleCache;
    } catch (error) {
      console.error("Error reading Merkle cache file:", error);
      return NextResponse.json(
        { error: "Failed to read merkle data" },
        { status: 500 }
      );
    }

    const leaf = cacheData.leaves.find(
      (leaf) => leaf.address.toLowerCase() === address
    );

    const proof = cacheData.proofs[address] || [];
    const root = cacheData.root;

    if (!leaf) {
      return NextResponse.json(
        { error: "Address not found in snapshot" },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      root,
      address,
      value: leaf.value,
      proof,
      exists: true,
    });

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error retrieving Merkle proof for address:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
