import { NextResponse } from "next/server";
import {
  getMerkleTreeCache,
  generateAndCacheMerkleTree,
} from "@/utils/merkle-cache";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
   /*  const { root, proofs, leaves, timestamp } =
      await generateAndCacheMerkleTree();

    const response = NextResponse.json({
      root,
      timestamp,
      cacheAge: "fresh",
      leaves: leaves.map((leaf) => ({
        address: leaf.address,
        value: leaf.value,
      })),
      proofs: Object.entries(proofs).map(([address, proof]) => ({
        address,
        proof,
      })),
    });

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
 */
    return null;
  } catch (error) {
    console.error("Error generating Merkle tree info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
