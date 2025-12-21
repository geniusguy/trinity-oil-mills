import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// PUT /api/products/:id (admin only)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
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

    await connection.execute(
      `UPDATE products SET name = ?, category = ?, type = ?, description = ?, base_price = ?, retail_price = ?, gst_rate = ?, gst_included = ?, unit = ?, barcode = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        name,
        category,
        type,
        description || null,
        Number(basePrice),
        Number(retailPrice),
        Number(gstRate) || 5.00,
        Boolean(gstIncluded),
        unit,
        barcode || null,
        Boolean(isActive),
        productId,
      ],
    );

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: productId } = await context.params;

    const connection = await createConnection();
    await connection.execute('DELETE FROM products WHERE id = ?', [productId]);
    await connection.end();

    return NextResponse.json({ message: 'Product deleted' }, { status: 200 });
  } catch (error) {
    console.error('Products DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


