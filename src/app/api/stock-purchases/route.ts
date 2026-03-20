import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';

// GET /api/stock-purchases — list with filters: productId, supplier, dateFrom, dateTo
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const supplier = searchParams.get('supplier');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);

    const connection = await createConnection();

    const where: string[] = [];
    const params: any[] = [];
    if (productId) {
      where.push('sp.product_id COLLATE utf8mb4_general_ci = ?');
      params.push(productId);
    }
    if (supplier) {
      where.push('sp.supplier_name LIKE ?');
      params.push(`%${supplier}%`);
    }
    if (dateFrom) {
      where.push('DATE(sp.purchase_date) >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push('DATE(sp.purchase_date) <= ?');
      params.push(dateTo);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Use COLLATE so join works when stock_purchases and products have different collations (e.g. utf8mb4_general_ci vs utf8mb4_0900_ai_ci)
    const [rows] = await connection.query(
      `SELECT sp.id, sp.product_id as productId, p.name as productName, p.unit as unit,
              sp.quantity, sp.supplier_name as supplierName, sp.purchase_date as purchaseDate,
              sp.unit_price as unitPrice, sp.total_amount as totalAmount,
              sp.invoice_number as invoiceNumber, sp.notes, sp.created_at as createdAt
       FROM stock_purchases sp
       JOIN products p ON p.id COLLATE utf8mb4_general_ci = sp.product_id COLLATE utf8mb4_general_ci
       ${whereSql}
       ORDER BY sp.purchase_date DESC, sp.created_at DESC
       LIMIT ?`,
      [...params, limit]
    );

    await connection.end();
    return NextResponse.json({ purchases: rows }, { status: 200 });
  } catch (error) {
    console.error('Stock purchases GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/stock-purchases — add stock and record purchase (who, when)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      productId,
      quantity,
      supplierName,
      purchaseDate,
      unitPrice,
      totalAmount,
      invoiceNumber,
      notes,
    } = body;

    if (!productId || quantity == null || Number(quantity) <= 0 || !supplierName || !purchaseDate) {
      return NextResponse.json(
        { error: 'productId, quantity (>0), supplierName, and purchaseDate are required' },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    const connection = await createConnection();

    try {
      await connection.beginTransaction();

      const purchaseId = `sp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // Merge Castor Oil (200ml) variants into canonical inventory product id
      // so stock is not split across product_id values.
      let normalizedProductId = String(productId).trim();
      const pid = String(productId).trim();
      const isCastor200mlById = pid === '55336' || pid === '68539' || pid === 'castor-200ml';

      if (!isCastor200mlById) {
        const [prodRows]: any = await connection.query(
          'SELECT name, unit FROM products WHERE id = ? LIMIT 1',
          [productId]
        );
        const prod = prodRows?.[0];
        const prodName = String(prod?.name ?? '').toLowerCase();
        const prodUnit = String(prod?.unit ?? '').toLowerCase();
        const combined = `${prodName} ${prodUnit}`;
        const hasCastorWord = combined.includes('castor');
        const mlMatch = combined.match(/(\d+(?:\.\d+)?)\D*ml\b/);
        const ml = mlMatch ? Number(mlMatch[1]) : null;
        const isCastor200mlByContent = hasCastorWord && ml === 200;
        if (isCastor200mlByContent) normalizedProductId = 'castor-200ml';
      } else {
        normalizedProductId = 'castor-200ml';
      }

      await connection.execute(
        `INSERT INTO stock_purchases (id, product_id, quantity, supplier_name, purchase_date, unit_price, total_amount, invoice_number, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          purchaseId,
          normalizedProductId,
          qty,
          String(supplierName).trim(),
          purchaseDate,
          unitPrice != null ? Number(unitPrice) : null,
          totalAmount != null ? Number(totalAmount) : null,
          invoiceNumber ? String(invoiceNumber).trim() : null,
          notes ? String(notes).trim() : null,
          session.user.id || null,
        ]
      );

      // Ensure inventory row exists for this product, then add quantity
      const [invRows]: any = await connection.query(
        'SELECT id, quantity FROM inventory WHERE product_id = ? LIMIT 1',
        [normalizedProductId]
      );

      if (invRows && invRows.length > 0) {
        await connection.execute(
          'UPDATE inventory SET quantity = quantity + ?, updated_at = NOW() WHERE product_id = ?',
          [qty, normalizedProductId]
        );
      } else {
        const invId = `inv-${normalizedProductId}-${Date.now()}`;
        await connection.execute(
          `INSERT INTO inventory (id, product_id, quantity, min_stock, max_stock, location, created_at, updated_at)
           VALUES (?, ?, ?, 10, 1000, 'main_store', NOW(), NOW())`,
          [invId, normalizedProductId, qty]
        );
      }

      await connection.commit();
      await connection.end();

      return NextResponse.json(
        { message: 'Stock added and purchase recorded', purchaseId },
        { status: 201 }
      );
    } catch (txError) {
      await connection.rollback();
      throw txError;
    }
  } catch (error) {
    console.error('Stock purchases POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
