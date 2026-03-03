import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';

// GET /api/inventory/low-stock
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await createConnection();
    const [rows] = await connection.query(
      `SELECT i.id, i.product_id as productId, p.name as productName, p.unit as unit, i.quantity, i.min_stock as minStock, i.location
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE i.quantity <= i.min_stock
       ORDER BY (i.quantity - i.min_stock) ASC`
    );
    await connection.end();
    return NextResponse.json({ lowStock: rows }, { status: 200 });
  } catch (error) {
    console.error('Inventory low-stock error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



