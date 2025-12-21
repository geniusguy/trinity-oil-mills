import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// POST /api/inventory/adjustment (admin-only) -> delta change
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inventoryId, delta } = await request.json();
    if (!inventoryId || delta == null) {
      return NextResponse.json({ error: 'inventoryId and delta are required' }, { status: 400 });
    }

    const connection = await createConnection();
    await connection.execute('UPDATE inventory SET quantity = quantity + ?, updated_at = NOW() WHERE id = ?', [delta, inventoryId]);
    await connection.end();
    return NextResponse.json({ message: 'Inventory adjusted' }, { status: 200 });
  } catch (error) {
    console.error('Inventory adjustment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



