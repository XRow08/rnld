import { NextResponse } from "next/server";
import { getProofForAddress } from "@/utils/merkle-cache";

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
    
    const { root, proof, value, exists } = await getProofForAddress(address);

    if (!exists) {
      return NextResponse.json(
        { error: "Address not found in snapshot" },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      root,
      address,
      value,           
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
