import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/inventory
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const location = searchParams.get('location');

    const connection = await createConnection();

    const where: string[] = [];
    const params: any[] = [];
    if (productId) { where.push('i.product_id = ?'); params.push(productId); }
    if (location) { where.push('i.location = ?'); params.push(location); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await connection.query(
      `SELECT i.id, i.product_id as productId, p.name as productName, p.unit as unit, i.quantity, i.min_stock as minStock, i.max_stock as maxStock, i.location, i.cost_price as costPrice, i.batch_number as batchNumber, i.expiry_date as expiryDate, i.created_at as createdAt, i.updated_at as updatedAt
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       ${whereSql}
       ORDER BY p.name ASC`,
      params,
    );

    await connection.end();
    return NextResponse.json({ inventory: rows }, { status: 200 });
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/inventory (admin-only) set absolute quantity
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inventoryId, quantity } = await request.json();
    if (!inventoryId || quantity == null) {
      return NextResponse.json({ error: 'inventoryId and quantity are required' }, { status: 400 });
    }

    const connection = await createConnection();
    await connection.execute('UPDATE inventory SET quantity = ?, updated_at = NOW() WHERE id = ?', [quantity, inventoryId]);
    await connection.end();
    return NextResponse.json({ message: 'Inventory updated' }, { status: 200 });
  } catch (error) {
    console.error('Inventory PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



