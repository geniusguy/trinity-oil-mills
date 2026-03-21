import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';

const CASTOR_200ML_VARIANT_IDS = new Set(['55336', '68539', 'castor-200ml']);

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
    const { name, category, type, description, basePrice, retailPrice, gstRate, gstIncluded, unit, barcode, isActive } = body;

    // Validation
    if (!name || !category || !type || basePrice === undefined || retailPrice === undefined || !unit) {
      return NextResponse.json(
        { error: 'Name, category, type, basePrice, retailPrice, and unit are required' },
        { status: 400 }
      );
    }

    const connection = await createConnection();

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
      Boolean(isActive),
    ];

    const pid = String(productId || '').trim();
    if (CASTOR_200ML_VARIANT_IDS.has(pid)) {
      await connection.execute(
        `UPDATE products
         SET name = ?, category = ?, type = ?, description = ?, base_price = ?, retail_price = ?, gst_rate = ?, gst_included = ?, unit = ?, barcode = ?, is_active = ?, updated_at = NOW()
         WHERE id IN ('55336', '68539', 'castor-200ml')
            OR (LOWER(name) LIKE '%castor%' AND LOWER(unit) LIKE '%200ml%')`,
        values,
      );
    } else {
      await connection.execute(
        `UPDATE products
         SET name = ?, category = ?, type = ?, description = ?, base_price = ?, retail_price = ?, gst_rate = ?, gst_included = ?, unit = ?, barcode = ?, is_active = ?, updated_at = NOW()
         WHERE id = ?`,
        [...values, productId],
      );
    }

    await connection.end();

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
    if (CASTOR_200ML_VARIANT_IDS.has(pid)) {
      await connection.execute(
        `DELETE FROM products
         WHERE id IN ('55336', '68539', 'castor-200ml')
            OR (LOWER(name) LIKE '%castor%' AND LOWER(unit) LIKE '%200ml%')`,
      );
    } else {
      await connection.execute('DELETE FROM products WHERE id = ?', [productId]);
    }
    await connection.end();

    return NextResponse.json({ message: 'Product deleted' }, { status: 200 });
  } catch (error) {
    console.error('Products DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


