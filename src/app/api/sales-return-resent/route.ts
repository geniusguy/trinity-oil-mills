import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import {
  isCastor200mlProduct,
  CASTOR_200ML_LOOKUP_IDS,
} from '@/lib/canteenSupply';

async function ensureSalesReturnResentTable(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS sales_return_resent (
      id VARCHAR(255) PRIMARY KEY,
      sale_type VARCHAR(50) NOT NULL DEFAULT 'canteen',
      canteen_name VARCHAR(255) NULL,
      product_id VARCHAR(255) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      unit VARCHAR(50) NOT NULL DEFAULT 'bottles',
      returned_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
      return_date DATE NOT NULL,
      resent_quantity DECIMAL(12,2) NOT NULL,
      resent_date DATE NOT NULL,
      reason TEXT NULL,
      created_by VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_srr_resent_date (resent_date),
      INDEX idx_srr_product (product_id)
    )
  `);
}

const toNum = (v: any) => (v === null || v === undefined || v === '' ? 0 : Number(v));
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeMySqlDate(input: unknown): string {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  if (DATE_ONLY_RE.test(raw)) return raw;
  const leading = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (leading && DATE_ONLY_RE.test(leading[1])) return leading[1];
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

/**
 * Adjust inventory by signed delta: negative reduces stock (sent out), positive restores stock.
 * Uses the same Castor / multi-id resolution as POST /api/sales deductInventory.
 */
async function adjustInventoryQuantity(
  connection: any,
  productId: string,
  signedDelta: number,
  productName?: string | null,
  productUnit?: string | null
): Promise<void> {
  const pid = String(productId).trim();
  if (!Number.isFinite(signedDelta) || signedDelta === 0) return;

  const isCastor = isCastor200mlProduct({ name: productName ?? '', unit: productUnit ?? '' }, pid);
  const lookupIds = isCastor
    ? Array.from(new Set([...CASTOR_200ML_LOOKUP_IDS, pid]))
    : [pid];

  let invId: string | null = null;

  if (lookupIds.length === 1) {
    const [rows]: any = await connection.query('SELECT id FROM inventory WHERE product_id = ? LIMIT 1', [
      lookupIds[0],
    ]);
    if (rows && rows[0]) invId = rows[0].id;
  } else {
    let best: { id: string; quantity: number } | null = null;
    for (const id of lookupIds) {
      const [rows]: any = await connection.query('SELECT id, quantity FROM inventory WHERE product_id = ? LIMIT 1', [
        id,
      ]);
      if (rows && rows[0]) {
        const q = Number(rows[0].quantity ?? 0);
        if (!best || q > best.quantity) best = { id: rows[0].id, quantity: q };
      }
    }
    if (best) invId = best.id;
  }

  if (!invId) {
    const insertProductId = isCastor ? 'castor-200ml' : pid;
    invId = `inv-${insertProductId}-${Date.now()}`;
    await connection.execute(
      `INSERT INTO inventory (id, product_id, quantity, min_stock, max_stock, location, created_at, updated_at)
       VALUES (?, ?, 0, 10, 1000, 'main_store', NOW(), NOW())`,
      [invId, insertProductId],
    );
  }

  await connection.execute('UPDATE inventory SET quantity = GREATEST(0, quantity + ?), updated_at = NOW() WHERE id = ?', [
    signedDelta,
    invId,
  ]);
}

async function deductInventory(
  connection: any,
  productId: string,
  quantity: number,
  productName?: string | null,
  productUnit?: string | null
): Promise<void> {
  if (!Number.isFinite(quantity) || quantity <= 0) return;
  await adjustInventoryQuantity(connection, productId, -quantity, productName, productUnit);
}

async function restoreInventory(
  connection: any,
  productId: string,
  quantity: number,
  productName?: string | null,
  productUnit?: string | null
): Promise<void> {
  if (!Number.isFinite(quantity) || quantity <= 0) return;
  await adjustInventoryQuantity(connection, productId, quantity, productName, productUnit);
}

function canEdit(role: string | undefined) {
  return ['admin', 'accountant'].includes(role || '');
}

// GET /api/sales-return-resent?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&search=...
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const startDate = String(searchParams.get('startDate') || '').trim();
    const endDate = String(searchParams.get('endDate') || '').trim();
    const search = String(searchParams.get('search') || '').trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '200', 10), 1), 5000);

    if (!canEdit((session as any)?.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await createConnection();
    try {
      await ensureSalesReturnResentTable(connection);

      const where: string[] = [];
      const args: any[] = [];
      if (startDate) {
        where.push('resent_date >= ?');
        args.push(startDate);
      }
      if (endDate) {
        where.push('resent_date <= ?');
        args.push(endDate);
      }
      if (search) {
        where.push('(product_name LIKE ? OR reason LIKE ?)');
        const q = `%${search}%`;
        args.push(q, q);
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const [rows] = await connection.query(
        `
          SELECT
            id,
            sale_type as saleType,
            canteen_name as canteenName,
            product_id as productId,
            product_name as productName,
            unit,
            returned_quantity as returnedQuantity,
            return_date as returnDate,
            resent_quantity as resentQuantity,
            resent_date as resentDate,
            reason,
            created_by as createdBy,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as createdAt
          FROM sales_return_resent
          ${whereSql}
          ORDER BY resent_date DESC, created_at DESC
          LIMIT ?
        `,
        [...args, limit],
      );

      return NextResponse.json({ rows: rows || [] });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('sales-return-resent GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sales-return-resent
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session as any)?.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const saleType = String(body.saleType || 'canteen').trim().toLowerCase();
    const canteenName = body.canteenName ? String(body.canteenName).trim() : null;
    const productId = String(body.productId || '').trim();
    const productName = String(body.productName || '').trim();
    const unit = String(body.unit || 'bottles').trim();
    const returnedQuantity = toNum(body.returnedQuantity ?? body.returnQuantity ?? 0);
    const returnDate = normalizeMySqlDate(body.returnDate);
    const resentQuantity = toNum(body.resentQuantity ?? body.resentQty ?? 0);
    const resentDate = normalizeMySqlDate(body.resentDate);
    const reason = body.reason == null || body.reason === '' ? null : String(body.reason).trim();

    if (!['canteen', 'retail'].includes(saleType)) {
      return NextResponse.json({ error: 'Invalid saleType' }, { status: 400 });
    }
    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    if (!productName) return NextResponse.json({ error: 'productName is required' }, { status: 400 });
    if (!returnDate) return NextResponse.json({ error: 'Valid returnDate is required' }, { status: 400 });
    if (!resentDate) return NextResponse.json({ error: 'Valid resentDate is required' }, { status: 400 });
    if (!Number.isFinite(returnedQuantity) || returnedQuantity < 0) {
      return NextResponse.json({ error: 'returnedQuantity must be >= 0' }, { status: 400 });
    }
    if (!Number.isFinite(resentQuantity) || resentQuantity <= 0) {
      return NextResponse.json({ error: 'resentQuantity must be > 0' }, { status: 400 });
    }

    const connection = await createConnection();
    try {
      await connection.beginTransaction();
      await ensureSalesReturnResentTable(connection);

      const id = `srr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await connection.execute(
        `
          INSERT INTO sales_return_resent
            (id, sale_type, canteen_name, product_id, product_name, unit, returned_quantity, return_date,
             resent_quantity, resent_date, reason, created_by, created_at, updated_at)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [
          id,
          saleType,
          canteenName,
          productId,
          productName,
          unit,
          returnedQuantity,
          returnDate,
          resentQuantity,
          resentDate,
          reason,
          session.user.id,
        ],
      );

      // Deduct only the "resent fresh" quantity (replacement sent to customer).
      await deductInventory(connection, productId, resentQuantity, productName, unit);

      await connection.commit();
      return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (e) {
      try {
        await connection.rollback();
      } catch (_) {}
      throw e;
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('sales-return-resent POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/sales-return-resent — body includes id; reverses old stock impact then applies new
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session as any)?.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const saleType = String(body.saleType || 'canteen').trim().toLowerCase();
    const canteenName = body.canteenName ? String(body.canteenName).trim() : null;
    const productId = String(body.productId || '').trim();
    const productName = String(body.productName || '').trim();
    const unit = String(body.unit || 'bottles').trim();
    const returnedQuantity = toNum(body.returnedQuantity ?? body.returnQuantity ?? 0);
    const returnDate = normalizeMySqlDate(body.returnDate);
    const resentQuantity = toNum(body.resentQuantity ?? body.resentQty ?? 0);
    const resentDate = normalizeMySqlDate(body.resentDate);
    const reason = body.reason == null || body.reason === '' ? null : String(body.reason).trim();

    if (!['canteen', 'retail'].includes(saleType)) {
      return NextResponse.json({ error: 'Invalid saleType' }, { status: 400 });
    }
    if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    if (!productName) return NextResponse.json({ error: 'productName is required' }, { status: 400 });
    if (!returnDate) return NextResponse.json({ error: 'Valid returnDate is required' }, { status: 400 });
    if (!resentDate) return NextResponse.json({ error: 'Valid resentDate is required' }, { status: 400 });
    if (!Number.isFinite(returnedQuantity) || returnedQuantity < 0) {
      return NextResponse.json({ error: 'returnedQuantity must be >= 0' }, { status: 400 });
    }
    if (!Number.isFinite(resentQuantity) || resentQuantity <= 0) {
      return NextResponse.json({ error: 'resentQuantity must be > 0' }, { status: 400 });
    }

    const connection = await createConnection();
    try {
      await connection.beginTransaction();
      await ensureSalesReturnResentTable(connection);

      const [existingRows]: any = await connection.query(
        `SELECT product_id as productId, product_name as productName, unit, resent_quantity as resentQuantity
         FROM sales_return_resent WHERE id = ? LIMIT 1`,
        [id],
      );
      const old = existingRows?.[0];
      if (!old) {
        await connection.rollback();
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      const oldQty = Number(old.resentQuantity ?? 0);
      const oldPid = String(old.productId || '').trim();
      const oldName = String(old.productName || '');
      const oldUnit = String(old.unit || 'bottles');

      await restoreInventory(connection, oldPid, oldQty, oldName, oldUnit);
      await deductInventory(connection, productId, resentQuantity, productName, unit);

      await connection.execute(
        `UPDATE sales_return_resent SET
          sale_type = ?, canteen_name = ?, product_id = ?, product_name = ?, unit = ?,
          returned_quantity = ?, return_date = ?, resent_quantity = ?, resent_date = ?,
          reason = ?, updated_at = NOW()
         WHERE id = ? LIMIT 1`,
        [
          saleType,
          canteenName,
          productId,
          productName,
          unit,
          returnedQuantity,
          returnDate,
          resentQuantity,
          resentDate,
          reason,
          id,
        ],
      );

      await connection.commit();
      return NextResponse.json({ success: true, id });
    } catch (e) {
      try {
        await connection.rollback();
      } catch (_) {}
      throw e;
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('sales-return-resent PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sales-return-resent?id=srr-...
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session as any)?.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('id') || '').trim();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const connection = await createConnection();
    try {
      await connection.beginTransaction();
      await ensureSalesReturnResentTable(connection);

      const [existingRows]: any = await connection.query(
        `SELECT product_id as productId, product_name as productName, unit, resent_quantity as resentQuantity
         FROM sales_return_resent WHERE id = ? LIMIT 1`,
        [id],
      );
      const old = existingRows?.[0];
      if (!old) {
        await connection.rollback();
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      const oldQty = Number(old.resentQuantity ?? 0);
      await restoreInventory(
        connection,
        String(old.productId || '').trim(),
        oldQty,
        String(old.productName || ''),
        String(old.unit || 'bottles'),
      );

      const [delRes]: any = await connection.execute('DELETE FROM sales_return_resent WHERE id = ? LIMIT 1', [id]);
      const affected = Number(delRes?.affectedRows ?? 0);
      if (!affected) {
        await connection.rollback();
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      }

      await connection.commit();
      return NextResponse.json({ success: true });
    } catch (e) {
      try {
        await connection.rollback();
      } catch (_) {}
      throw e;
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('sales-return-resent DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
