import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';

async function ensureSalesReturnsTable(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS sales_returns (
      id VARCHAR(255) PRIMARY KEY,
      sale_id VARCHAR(255) NULL,
      sale_type VARCHAR(50) NOT NULL DEFAULT 'canteen',
      canteen_name VARCHAR(255) NULL,
      product_name VARCHAR(255) NOT NULL,
      unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
      quantity DECIMAL(12,2) NOT NULL,
      unit_price_ex_gst DECIMAL(12,2) NOT NULL,
      gst_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00,
      return_amount_ex_gst DECIMAL(12,2) NOT NULL,
      return_gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      other_expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
      return_total_amount DECIMAL(12,2) NOT NULL,
      return_nature VARCHAR(30) NOT NULL DEFAULT 'sales_return',
      accounting_impact VARCHAR(30) NOT NULL DEFAULT 'revenue_reversal',
      reason TEXT NULL,
      return_date DATE NOT NULL,
      created_by VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sales_returns_date (return_date),
      INDEX idx_sales_returns_sale_id (sale_id),
      INDEX idx_sales_returns_nature_impact (return_nature, accounting_impact)
    )
  `);

  // Backward-compatible migration for older DBs.
  try {
    const [cols]: any = await connection.query(`SHOW COLUMNS FROM sales_returns LIKE 'other_expenses'`);
    if (!Array.isArray(cols) || cols.length === 0) {
      await connection.execute(`ALTER TABLE sales_returns ADD COLUMN other_expenses DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER return_gst_amount`);
    }
  } catch (e) {
    console.warn('ensureSalesReturnsTable other_expenses migration warning:', (e as any)?.message || e);
  }
}

const toNum = (v: any) => (v === null || v === undefined || v === '' ? 0 : Number(v));

// GET /api/sales-returns?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&returnNature=expiry&saleType=canteen
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = String(searchParams.get('startDate') || '').trim();
    const endDate = String(searchParams.get('endDate') || '').trim();
    const returnNature = String(searchParams.get('returnNature') || '').trim();
    const saleType = String(searchParams.get('saleType') || '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 500), 1), 5000);

    const where: string[] = [];
    const args: unknown[] = [];
    if (startDate) {
      where.push('return_date >= ?');
      args.push(startDate);
    }
    if (endDate) {
      where.push('return_date <= ?');
      args.push(endDate);
    }
    if (returnNature) {
      where.push('return_nature = ?');
      args.push(returnNature);
    }
    if (saleType) {
      where.push('sale_type = ?');
      args.push(saleType);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const connection = await createConnection();
    try {
      await ensureSalesReturnsTable(connection);
      const [rows] = await connection.query(
        `SELECT
            id,
            sale_id as saleId,
            sale_type as saleType,
            canteen_name as canteenName,
            product_name as productName,
            unit,
            quantity,
            unit_price_ex_gst as unitPriceExGst,
            gst_rate as gstRate,
            return_amount_ex_gst as returnAmountExGst,
            return_gst_amount as returnGstAmount,
            other_expenses as otherExpenses,
            return_total_amount as returnTotalAmount,
            return_nature as returnNature,
            accounting_impact as accountingImpact,
            reason,
            return_date as returnDate,
            created_by as createdBy,
            created_at as createdAt,
            updated_at as updatedAt
          FROM sales_returns
          ${whereSql}
          ORDER BY return_date DESC, created_at DESC
          LIMIT ?`,
        [...args, limit],
      );
      return NextResponse.json({ returns: rows });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('sales-returns GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sales-returns
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !['admin', 'accountant'].includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const saleId = body.saleId ? String(body.saleId).trim() : null;
    const saleType = String(body.saleType || 'canteen').trim().toLowerCase();
    const canteenName = body.canteenName ? String(body.canteenName).trim() : null;
    const productName = String(body.productName || '').trim();
    const unit = String(body.unit || 'pcs').trim();
    const quantity = toNum(body.quantity);
    const unitPriceExGst = toNum(body.unitPriceExGst);
    const gstRate = toNum(body.gstRate || 5);
    const otherExpenses = toNum(body.otherExpenses || 0);
    const returnNature = String(body.returnNature || 'sales_return').trim().toLowerCase(); // sales_return | expiry
    const accountingImpact = String(body.accountingImpact || 'revenue_reversal').trim().toLowerCase(); // revenue_reversal | expense_writeoff | both
    const reason = body.reason == null ? null : String(body.reason).trim();
    const returnDate = String(body.returnDate || '').trim();

    if (!productName) return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    if (!returnDate) return NextResponse.json({ error: 'Return date is required' }, { status: 400 });
    if (!['canteen', 'retail'].includes(saleType)) return NextResponse.json({ error: 'Invalid saleType' }, { status: 400 });
    if (!['sales_return', 'expiry'].includes(returnNature)) return NextResponse.json({ error: 'Invalid returnNature' }, { status: 400 });
    if (!['revenue_reversal', 'expense_writeoff', 'both'].includes(accountingImpact)) {
      return NextResponse.json({ error: 'Invalid accountingImpact' }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    if (!Number.isFinite(unitPriceExGst) || unitPriceExGst < 0) return NextResponse.json({ error: 'Unit price (ex GST) must be 0 or greater' }, { status: 400 });
    if (!Number.isFinite(gstRate) || gstRate < 0) return NextResponse.json({ error: 'GST rate must be 0 or greater' }, { status: 400 });
    if (!Number.isFinite(otherExpenses) || otherExpenses < 0) return NextResponse.json({ error: 'Other expenses must be 0 or greater' }, { status: 400 });

    const returnAmountExGst = Number((quantity * unitPriceExGst).toFixed(2));
    const returnGstAmount = Number(((returnAmountExGst * gstRate) / 100).toFixed(2));
    const returnTotalAmount = Number((returnAmountExGst + returnGstAmount + otherExpenses).toFixed(2));
    const id = `sale-ret-${Date.now()}`;

    const connection = await createConnection();
    try {
      await ensureSalesReturnsTable(connection);
      await connection.execute(
        `INSERT INTO sales_returns
          (id, sale_id, sale_type, canteen_name, product_name, unit, quantity, unit_price_ex_gst, gst_rate,
           return_amount_ex_gst, return_gst_amount, other_expenses, return_total_amount, return_nature, accounting_impact, reason, return_date, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          id,
          saleId,
          saleType,
          canteenName,
          productName,
          unit,
          quantity,
          unitPriceExGst,
          gstRate,
          returnAmountExGst,
          returnGstAmount,
          otherExpenses,
          returnTotalAmount,
          returnNature,
          accountingImpact,
          reason,
          returnDate,
          session.user.id,
        ],
      );

      return NextResponse.json({
        return: {
          id,
          saleId,
          saleType,
          canteenName,
          productName,
          unit,
          quantity,
          unitPriceExGst,
          gstRate,
          returnAmountExGst,
          returnGstAmount,
          otherExpenses,
          returnTotalAmount,
          returnNature,
          accountingImpact,
          reason,
          returnDate,
        },
      }, { status: 201 });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('sales-returns POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/sales-returns
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !['admin', 'accountant'].includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const saleId = body.saleId ? String(body.saleId).trim() : null;
    const saleType = String(body.saleType || 'canteen').trim().toLowerCase();
    const canteenName = body.canteenName ? String(body.canteenName).trim() : null;
    const productName = String(body.productName || '').trim();
    const unit = String(body.unit || 'pcs').trim();
    const quantity = toNum(body.quantity);
    const unitPriceExGst = toNum(body.unitPriceExGst);
    const gstRate = toNum(body.gstRate || 5);
    const otherExpenses = toNum(body.otherExpenses || 0);
    const returnNature = String(body.returnNature || 'sales_return').trim().toLowerCase();
    const accountingImpact = String(body.accountingImpact || 'revenue_reversal').trim().toLowerCase();
    const reason = body.reason == null ? null : String(body.reason).trim();
    const returnDate = String(body.returnDate || '').trim();

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    if (!productName) return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    if (!returnDate) return NextResponse.json({ error: 'Return date is required' }, { status: 400 });
    if (!['canteen', 'retail'].includes(saleType)) return NextResponse.json({ error: 'Invalid saleType' }, { status: 400 });
    if (!['sales_return', 'expiry'].includes(returnNature)) return NextResponse.json({ error: 'Invalid returnNature' }, { status: 400 });
    if (!['revenue_reversal', 'expense_writeoff', 'both'].includes(accountingImpact)) {
      return NextResponse.json({ error: 'Invalid accountingImpact' }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    if (!Number.isFinite(unitPriceExGst) || unitPriceExGst < 0) return NextResponse.json({ error: 'Unit price (ex GST) must be 0 or greater' }, { status: 400 });
    if (!Number.isFinite(gstRate) || gstRate < 0) return NextResponse.json({ error: 'GST rate must be 0 or greater' }, { status: 400 });
    if (!Number.isFinite(otherExpenses) || otherExpenses < 0) return NextResponse.json({ error: 'Other expenses must be 0 or greater' }, { status: 400 });

    const returnAmountExGst = Number((quantity * unitPriceExGst).toFixed(2));
    const returnGstAmount = Number(((returnAmountExGst * gstRate) / 100).toFixed(2));
    const returnTotalAmount = Number((returnAmountExGst + returnGstAmount + otherExpenses).toFixed(2));

    const connection = await createConnection();
    try {
      await ensureSalesReturnsTable(connection);
      const [rows]: any = await connection.execute(
        `UPDATE sales_returns
         SET sale_id = ?, sale_type = ?, canteen_name = ?, product_name = ?, unit = ?, quantity = ?, unit_price_ex_gst = ?, gst_rate = ?,
             return_amount_ex_gst = ?, return_gst_amount = ?, other_expenses = ?, return_total_amount = ?,
             return_nature = ?, accounting_impact = ?, reason = ?, return_date = ?, updated_at = NOW()
         WHERE id = ?
         LIMIT 1`,
        [
          saleId,
          saleType,
          canteenName,
          productName,
          unit,
          quantity,
          unitPriceExGst,
          gstRate,
          returnAmountExGst,
          returnGstAmount,
          otherExpenses,
          returnTotalAmount,
          returnNature,
          accountingImpact,
          reason,
          returnDate,
          id,
        ],
      );
      const affected = Number(rows?.affectedRows ?? 0);
      if (!affected) return NextResponse.json({ error: 'Return entry not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('sales-returns PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sales-returns?id=sale-ret-...
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !['admin', 'accountant'].includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('id') || '').trim();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const connection = await createConnection();
    try {
      await ensureSalesReturnsTable(connection);
      const [rows]: any = await connection.query('DELETE FROM sales_returns WHERE id = ? LIMIT 1', [id]);
      const affected = Number(rows?.affectedRows ?? 0);
      if (!affected) return NextResponse.json({ error: 'Return entry not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('sales-returns DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
