import { NextResponse } from 'next/server';
import { generateMerkleTree } from '@/utils/merkle';
import { getSnapshotRecords } from '@/utils/csv-manager';

export async function GET(request: Request) {
  try {
    const snapshotRecords = await getSnapshotRecords();
    const validRecords = snapshotRecords.filter(record => 
      record.holderAddressBSC && 
      record.holderAddressBSC.trim() !== '' && 
      record.balance && 
      record.balance.trim() !== ''
    );

    const leaves = validRecords.map(record => ({
      address: record.holderAddressBSC.toLowerCase(),
      value: record.balance
    }));

    const { root, proofs, tree } = generateMerkleTree(leaves);
    leaves.forEach((leaf, index) => {
      console.log(`${index + 1}. Address: ${leaf.address}`);
      console.log(`   Amount: ${leaf.value}`);
    });
    return NextResponse.json({
      root,
      leaves: leaves.map(leaf => ({
        address: leaf.address,
        value: leaf.value
      })),
      proofs: Object.entries(proofs).map(([address, proof]) => ({
        address,
        proof
      })),
      tree: tree.dump()
    });
  } catch (error) {
    console.error('Error generating Merkle tree info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }
    const snapshotRecords = await getSnapshotRecords();
    const validRecords = snapshotRecords.filter(record => 
      record.holderAddressBSC && 
      record.holderAddressBSC.trim() !== '' && 
      record.balance && 
      record.balance.trim() !== ''
    );

    const leaves = validRecords.map(record => ({
      address: record.holderAddressBSC.toLowerCase(),
      value: record.balance
    }));

    const { root, proofs, tree } = generateMerkleTree(leaves);
    const record = validRecords.find(
      r => r.holderAddressBSC.toLowerCase() === address.toLowerCase()
    );

    if (!record) {
      return NextResponse.json({ error: 'Address not found in snapshot' }, { status: 404 });
    }

    return NextResponse.json({
      root,
      address: record.holderAddressBSC.toLowerCase(),
      value: record.balance,
      proof: proofs[record.holderAddressBSC.toLowerCase()],
      tree: tree.dump()
    });
  } catch (error) {
    console.error('Error generating Merkle proof for address:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 