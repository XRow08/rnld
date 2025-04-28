import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parseCSVToRecords } from "@/utils/csv-manager";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  try {
    const csvPath = path.join(process.cwd(), "public/snapshot.csv");
    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const records = parseCSVToRecords(fileContent);
    const record = records.find(
      (r) => r.accountSolana.toLowerCase() === address.toLowerCase()
    );
    if (!record) return NextResponse.json(null);
    return NextResponse.json(record);
  } catch (error) {
    console.error("Error checking snapshot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
