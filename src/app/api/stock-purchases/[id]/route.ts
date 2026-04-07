import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { ensureStockPurchasePaymentsTable } from '@/lib/stockPurchasePaymentsDb';
import { ensureSuppliersTable } from '@/lib/suppliersDb';

// PUT /api/stock-purchases/:id — edit purchase details without inventory correction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !['admin', 'retail_staff', 'accountant'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, quantity, supplierName, purchaseDate, unitPrice, totalAmount, invoiceNumber, notes } = body;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Purchase id is required' }, { status: 400 });
    }
    if (!productId || quantity == null || !supplierName || !purchaseDate) {
      return NextResponse.json(
        { error: 'productId, quantity (>0), supplierName, and purchaseDate are required' },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: 'quantity must be > 0' }, { status: 400 });
    }

    // Accept ISO (YYYY-MM-DD) or datetime strings; store only the date part.
    const purchaseDateStr = String(purchaseDate).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDateStr)) {
      return NextResponse.json({ error: 'purchaseDate must be a valid date' }, { status: 400 });
    }

    const connection = await createConnection();
    try {
      await ensureSuppliersTable(connection);
      const supplierNameNormalized = String(supplierName).trim();
      const [supRows]: any = await connection.query(
        'SELECT id FROM suppliers WHERE name COLLATE utf8mb4_general_ci = ? COLLATE utf8mb4_general_ci LIMIT 1',
        [supplierNameNormalized]
      );
      if (!supRows?.length) {
        return NextResponse.json({ error: 'Supplier is not in master list. Add supplier first.' }, { status: 400 });
      }

      // Normalize Castor Oil (200ml) variants to canonical inventory product id.
      // This keeps inventory and tin/ltr calculations consistent.
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

      const [result]: any = await connection.execute(
        `UPDATE stock_purchases
         SET product_id = ?,
             quantity = ?,
             supplier_name = ?,
             purchase_date = ?,
             unit_price = ?,
             total_amount = ?,
             invoice_number = ?,
             notes = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [
          normalizedProductId,
          qty,
          supplierNameNormalized,
          purchaseDateStr,
          unitPrice != null && unitPrice !== '' ? Number(unitPrice) : null,
          totalAmount != null && totalAmount !== '' ? Number(totalAmount) : null,
          invoiceNumber ? String(invoiceNumber).trim() : null,
          notes ? String(notes).trim() : null,
          id,
        ]
      );

      // mysql2 returns OkPacket-like result
      const affectedRows = typeof result?.affectedRows === 'number' ? result.affectedRows : 0;
      if (!affectedRows) {
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Purchase updated successfully' }, { status: 200 });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Stock purchases PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/stock-purchases/:id — delete purchase and revert inventory
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !['admin', 'retail_staff', 'accountant'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    void body; // no body expected

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Purchase id is required' }, { status: 400 });

    const connection = await createConnection();
    try {
      await ensureStockPurchasePaymentsTable(connection);
      await connection.beginTransaction();

      const [rows]: any = await connection.query(
        'SELECT product_id as productId, quantity FROM stock_purchases WHERE id = ? LIMIT 1',
        [id]
      );

      if (!rows || rows.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
      }

      const purchaseProductId = String(rows[0].productId ?? '').trim();
      const qty = Number(rows[0].quantity);

      if (!Number.isFinite(qty) || qty <= 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Invalid purchase quantity' }, { status: 400 });
      }

      const lookupCastor = ['castor-200ml', '55336', '68539'];
      const isCastor = lookupCastor.includes(purchaseProductId);

      // Prefer exact inventory row (same product_id as the purchase row)
      let invId: string | null = null;
      const [invExact]: any = await connection.query(
        'SELECT id FROM inventory WHERE product_id = ? ORDER BY updated_at DESC LIMIT 1',
        [purchaseProductId]
      );
      if (invExact && invExact[0]?.id) invId = invExact[0].id;

      // If not found, and it is Castor 200ml variant, deduct from the row with highest quantity among castor ids
      if (!invId && isCastor) {
        const unique = Array.from(new Set([...lookupCastor, purchaseProductId]));
        const placeholders = unique.map(() => '?').join(', ');
        const [invRows]: any = await connection.query(
          `SELECT id FROM inventory WHERE product_id IN (${placeholders}) ORDER BY quantity DESC LIMIT 1`,
          unique
        );
        if (invRows && invRows[0]?.id) invId = invRows[0].id;
      }

      if (invId) {
        await connection.execute(
          'UPDATE inventory SET quantity = GREATEST(0, quantity - ?) , updated_at = NOW() WHERE id = ?',
          [qty, invId]
        );
      }

      await connection.execute('DELETE FROM stock_purchase_payments WHERE stock_purchase_id = ?', [id]);
      await connection.execute('DELETE FROM stock_purchases WHERE id = ?', [id]);

      await connection.commit();
      return NextResponse.json({ message: 'Purchase deleted successfully' }, { status: 200 });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Stock purchases DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

