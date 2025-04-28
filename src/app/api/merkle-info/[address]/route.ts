import { NextResponse } from "next/server";
import { generateMerkleTree } from "@/utils/merkle";
import { getSnapshotRecords } from "@/utils/csv-manager";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

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

    const snapshotRecords = await getSnapshotRecords();
    console.log('Total records loaded:', snapshotRecords.length);

    const leaves = snapshotRecords.map((record) => ({
      address: record.holderAddressBSC.toLowerCase(),
      value: record.balanceNormalized,
    }));
    console.log('Leaves generated:', leaves.length);

    leaves.sort((a, b) => a.address.localeCompare(b.address));
    const { root, proofs } = generateMerkleTree(leaves);

    const record = snapshotRecords.find(
      (r) => r.holderAddressBSC.toLowerCase() === address
    );

    if (!record) {
      return NextResponse.json(
        { error: "Address not found in snapshot" },
        { status: 404 }
      );
    }

    console.log('=== Merkle Tree Debug Info ===');
    console.log('Address:', address);
    console.log('Normalized Balance:', record.balanceNormalized);
    console.log('Merkle Root:', root);
    console.log('Proof:', proofs[address]);
    console.log('=============================');

    const response = NextResponse.json({
      root,
      address,
      value: record.balanceNormalized,
      proof: proofs[address],
    });

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error generating Merkle proof for address:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
