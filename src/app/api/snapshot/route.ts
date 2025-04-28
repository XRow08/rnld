import { NextResponse } from "next/server";
import { getSnapshotRecords } from "@/utils/csv-manager";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const snapshotRecords = await getSnapshotRecords();
    console.log(snapshotRecords.length);

    const normalizedRecords = snapshotRecords.map((record) => ({
      holderAddressBSC: record.holderAddressBSC.toLowerCase(),
      accountSolana: record.accountSolana,
      tokenAccountSolana: record.tokenAccountSolana,
      balance: record.balance,
      balanceNormalized: record.balanceNormalized,
    }));

    const totalRecords = normalizedRecords.length;
    const totalBalance = normalizedRecords
      .reduce((acc, record) => acc + Number(record.balanceNormalized), 0)
      .toString();

    const response = NextResponse.json({
      totalRecords,
      totalBalance,
      records: normalizedRecords,
    });

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error fetching snapshot data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
