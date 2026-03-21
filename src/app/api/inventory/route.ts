import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';

// GET /api/inventory
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
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
      `SELECT i.id, i.product_id as productId, p.name as productName, p.unit as unit,
              p.category as category, p.type as type,
              i.quantity, i.min_stock as minStock, i.max_stock as maxStock, i.location, i.cost_price as costPrice, i.batch_number as batchNumber, i.expiry_date as expiryDate, i.created_at as createdAt, i.updated_at as updatedAt
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       ${whereSql}
       ORDER BY p.name ASC`,
      params,
    );

    await connection.end();

    // Aggregate Castor Oil 200ml variants so the UI doesn't show the same stock multiple times.
    // This is display-only; it doesn't change DB rows.
    const CASTOR_200ML_VARIANT_IDS = new Set(['55336', '68539', 'castor-200ml']);
    const CASTOR_200ML_DISPLAY_NAME = 'TOM - Castor Oil - 200 ML';

    const isCastor200mlRow = (r: any) => CASTOR_200ML_VARIANT_IDS.has(String(r.productId ?? '').trim());

    const castorKey = (r: any) => `castor-200ml|${String(r.location ?? '').trim()}`;

    const byKey = new Map<string, any>();
    for (const r of rows as any[]) {
      if (!isCastor200mlRow(r)) {
        byKey.set(String(r.id), r);
        continue;
      }

      const k = castorKey(r);
      const existing = byKey.get(k);
      if (!existing) {
        byKey.set(k, {
          ...r,
          id: r.id,
          productId: 'castor-200ml',
          productName: CASTOR_200ML_DISPLAY_NAME,
          quantity: Number(r.quantity ?? 0),
        });
      } else {
        existing.quantity = Number(existing.quantity ?? 0) + Number(r.quantity ?? 0);
        // Keep min/max from first row (they should be consistent for this product)
      }
    }

    return NextResponse.json({ inventory: Array.from(byKey.values()) }, { status: 200 });
  } catch (error) {
    console.error('Inventory GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', { message: errorMessage });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

// PUT /api/inventory (admin-only) set absolute quantity
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
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



