import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/products
// Optional query params: category, type, isActive
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');

    const connection = await createConnection();

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Always exclude raw materials from products page
    whereClauses.push('category != ?');
    params.push('raw_material');

    if (category) {
      whereClauses.push('category = ?');
      params.push(category);
    }
    if (type) {
      whereClauses.push('type = ?');
      params.push(type);
    }
    if (isActive === 'true' || isActive === 'false') {
      whereClauses.push('is_active = ?');
      params.push(isActive === 'true');
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [rows] = await connection.query(
      `SELECT id, name, category, type, description, base_price as basePrice, retail_price as retailPrice, gst_rate as gstRate, gst_included as gstIncluded, unit, barcode, is_active as isActive, created_at as createdAt, updated_at as updatedAt
       FROM products ${whereSql}
       ORDER BY name ASC`,
      params,
    );

    await connection.end();

    return NextResponse.json({ products: rows }, { status: 200 });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/products (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, category, type, description, basePrice, retailPrice, gstRate, gstIncluded, unit, barcode, isActive } = body;

    if (!name || !category || !type || basePrice == null || retailPrice == null || !unit) {
      return NextResponse.json({ error: 'Missing required fields (name, category, type, basePrice, retailPrice, unit)' }, { status: 400 });
    }

    const connection = await createConnection();

    const productId = id || `prod-${Date.now()}`;

    await connection.execute(
      `INSERT INTO products (id, name, category, type, description, base_price, retail_price, gst_rate, gst_included, unit, barcode, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        productId,
        name,
        category,
        type,
        description ?? null,
        basePrice,
        retailPrice,
        gstRate ?? 5.00,
        Boolean(gstIncluded),
        unit,
        barcode ?? null,
        isActive ?? true,
      ],
    );

    await connection.end();

    return NextResponse.json(
      {
        product: {
          id: productId,
          name,
          category,
          type,
          description: description ?? null,
          basePrice,
          retailPrice,
          gstRate,
          gstIncluded: Boolean(gstIncluded),
          unit,
          barcode: barcode ?? null,
          isActive: isActive ?? true,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


