import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseCSVToRecords } from '@/utils/csv-manager';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'public/snapshot.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSVToRecords(fileContent);
    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error getting all records:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 