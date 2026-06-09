import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';

const PRODUCT_SELECT = `SELECT id, name, category, type, description,
  base_price as basePrice, retail_price as retailPrice, gst_rate as gstRate,
  gst_included as gstIncluded, unit, barcode, hsn_code as hsnCode,
  is_active as isActive, created_at as createdAt, updated_at as updatedAt
  FROM products`;

// GET /api/products/:id — single product (direct DB row, not merged list)
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: productId } = await context.params;
    const pid = String(productId || '').trim();
    if (!pid) {
      return NextResponse.json({ error: 'Invalid product id' }, { status: 400 });
    }

    const connection = await createConnection();
    const [rows] = await connection.query(`${PRODUCT_SELECT} WHERE id = ? LIMIT 1`, [pid]);
    await connection.end();

    const product = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(
      { product },
      {
        status: 200,
        headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' },
      },
    );
  } catch (error) {
    console.error('Products GET by id error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/products/:id (admin only)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: productId } = await context.params;
    const body = await request.json();
    const { name, category, type, description, basePrice, retailPrice, gstRate, gstIncluded, unit, barcode, hsnCode, isActive } = body;

    // Validation
    if (!name || !category || !type || basePrice === undefined || retailPrice === undefined || !unit) {
      return NextResponse.json(
        { error: 'Name, category, type, basePrice, retailPrice, and unit are required' },
        { status: 400 }
      );
    }

    const connection = await createConnection();

    const hsnNormalized = hsnCode != null && String(hsnCode).trim() !== '' ? String(hsnCode).trim() : null;

    const values = [
      name,
      category,
      type,
      description || null,
      Number(basePrice),
      Number(retailPrice),
      Number(gstRate) || 5.0,
      Boolean(gstIncluded),
      unit,
      barcode || null,
      hsnNormalized,
      Boolean(isActive),
    ];

    const pid = String(productId || '').trim();
    const [result] = await connection.execute(
      `UPDATE products
       SET name = ?, category = ?, type = ?, description = ?, base_price = ?, retail_price = ?, gst_rate = ?, gst_included = ?, unit = ?, barcode = ?, hsn_code = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [...values, pid],
    );

    await connection.end();

    if (!result?.affectedRows) {
      return NextResponse.json({ error: 'Product not found or not updated' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product updated' }, { status: 200 });
  } catch (error) {
    console.error('Products PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/products/:id (admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: productId } = await context.params;

    const connection = await createConnection();
    const pid = String(productId || '').trim();
    const [result] = await connection.execute('DELETE FROM products WHERE id = ?', [pid]);
    await connection.end();

    if (!(result as { affectedRows?: number })?.affectedRows) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Product deleted' }, { status: 200 });
  } catch (error) {
    console.error('Products DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


