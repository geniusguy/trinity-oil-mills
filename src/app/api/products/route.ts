import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';
import { textIndicates200ml, isPosPackagingComponent, isTruthyActive } from '@/lib/posCatalog';

/** Avoid stale product lists behind reverse proxies / CDN */
export const dynamic = 'force-dynamic';

const CASTOR_200ML_VARIANT_IDS = new Set(['55336', '68539', 'castor-200ml']);

function isCastor200mlVariant(row: any): boolean {
  const id = String(row?.id ?? '').trim();
  if (CASTOR_200ML_VARIANT_IDS.has(id)) return true;

  const name = String(row?.name ?? '').toLowerCase();
  const unit = String(row?.unit ?? '').toLowerCase();
  return (
    name.includes('castor') &&
    (name.includes('200') || textIndicates200ml(name) || textIndicates200ml(unit))
  );
}

function castorPriority(row: any): number {
  const id = String(row?.id ?? '').trim();
  if (id === 'castor-200ml') return 3;
  if (id === '68539') return 2;
  if (id === '55336') return 1;
  return 0;
}

/** Prefer active billing rows over inactive legacy `castor-200ml`, then id priority. */
function shouldReplaceCastorMerge(current: any, candidate: any): boolean {
  const cAct = isTruthyActive(current?.isActive);
  const nAct = isTruthyActive(candidate?.isActive);
  if (nAct && !cAct) return true;
  if (cAct && !nAct) return false;
  return castorPriority(candidate) > castorPriority(current);
}

// GET /api/products
// Optional query params: category, type, isActive
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const forPos =
      searchParams.get('forPos') === '1' ||
      searchParams.get('forPos') === 'true';

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

    const selectSql = `SELECT id, name, category, type, description, base_price as basePrice, retail_price as retailPrice, gst_rate as gstRate, gst_included as gstIncluded, unit, barcode, is_active as isActive, created_at as createdAt, updated_at as updatedAt
       FROM products ${whereSql}
       ORDER BY name ASC`;

    const [rows] = await connection.query(selectSql, params);

    // Merge known Castor 200ml variants into one row for UI / POS.
    // This avoids duplicate display of 55336 / 68539 / castor-200ml.
    let castorRow: any = null;
    const merged: any[] = [];
    for (const row of rows as any[]) {
      if (!isCastor200mlVariant(row)) {
        merged.push(row);
        continue;
      }
      if (!castorRow) {
        castorRow = row;
        continue;
      }
      if (shouldReplaceCastorMerge(castorRow, row)) {
        castorRow = row;
      }
    }
    if (castorRow) merged.push(castorRow);

    const mergedHasCastor = merged.some((r) => isCastor200mlVariant(r));
    if (!mergedHasCastor) {
      const [castorExtra] = await connection.query(
        `SELECT id, name, category, type, description, base_price as basePrice, retail_price as retailPrice, gst_rate as gstRate, gst_included as gstIncluded, unit, barcode, is_active as isActive, created_at as createdAt, updated_at as updatedAt
         FROM products WHERE id IN (?, ?, ?) AND LOWER(category) <> ?`,
        ['55336', '68539', 'castor-200ml', 'raw_material'],
      );
      let extraCastor: any = null;
      for (const row of castorExtra as any[]) {
        if (!isCastor200mlVariant(row)) continue;
        if (!extraCastor || shouldReplaceCastorMerge(extraCastor, row)) {
          extraCastor = row;
        }
      }
      if (extraCastor) merged.push(extraCastor);
    }

    await connection.end();

    let out = merged;
    if (forPos) {
      out = merged.filter((p) => !isPosPackagingComponent(p));
    }

    return NextResponse.json(
      { products: out },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('Products GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

// POST /api/products (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, category, type, description, basePrice, retailPrice, gstRate, gstIncluded, unit, barcode, isActive } = body;

    if (!name || !category || !type || basePrice == null || retailPrice == null || !unit) {
      return NextResponse.json({ error: 'Missing required fields (name, category, type, basePrice, retailPrice, unit)' }, { status: 400 });
    }

    const connection = await createConnection();

    // Prevent accidental duplicate product rows for Castor 200ml variants.
    const castorByPayload =
      String(type || '').toLowerCase().includes('castor') &&
      String(unit || '').toLowerCase().includes('200ml');
    if (castorByPayload) {
      const [existingCastor] = await connection.query(
        `SELECT id FROM products
         WHERE (id IN ('55336','68539','castor-200ml'))
            OR (LOWER(name) LIKE '%castor%' AND LOWER(unit) LIKE '%200ml%')
         LIMIT 1`,
      );
      if (Array.isArray(existingCastor) && existingCastor.length > 0) {
        await connection.end();
        return NextResponse.json(
          { error: 'Castor 200ml already exists. Please edit the existing product instead of creating a duplicate.' },
          { status: 400 },
        );
      }
    }

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


