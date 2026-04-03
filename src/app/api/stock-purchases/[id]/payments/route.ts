import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { ensureStockPurchasePaymentsTable } from '@/lib/stockPurchasePaymentsDb';

const paidOnSql = (raw: unknown) => {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

function canEditPayments(role: string | undefined) {
  return ['admin', 'retail_staff', 'accountant'].includes(role || '');
}

// GET /api/stock-purchases/:id/payments
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !canEditPayments(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Purchase id is required' }, { status: 400 });

    const connection = await createConnection();
    try {
      await ensureStockPurchasePaymentsTable(connection);
      const [exists]: any = await connection.query(
        'SELECT id FROM stock_purchases WHERE id = ? LIMIT 1',
        [id],
      );
      if (!exists?.length) {
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
      }

      const [rows] = await connection.query(
        `SELECT id, amount, paid_on as paidOn, notes, created_by as createdBy, created_at as createdAt
         FROM stock_purchase_payments
         WHERE stock_purchase_id = ?
         ORDER BY paid_on ASC, created_at ASC`,
        [id],
      );
      return NextResponse.json({ payments: rows }, { status: 200 });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('stock-purchases payments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/stock-purchases/:id/payments  body: { amount, paidOn, notes? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !canEditPayments(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Purchase id is required' }, { status: 400 });

    const body = await request.json();
    const amount = Number(body.amount);
    const paidOn = paidOnSql(body.paidOn);
    const notes = body.notes == null || body.notes === '' ? null : String(body.notes).trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 });
    }
    if (!paidOn) {
      return NextResponse.json({ error: 'paidOn must be a valid date (YYYY-MM-DD)' }, { status: 400 });
    }

    const connection = await createConnection();
    try {
      await ensureStockPurchasePaymentsTable(connection);

      const [purRows]: any = await connection.query(
        'SELECT total_amount as totalAmount FROM stock_purchases WHERE id = ? LIMIT 1',
        [id],
      );
      if (!purRows?.length) {
        return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
      }

      const billTotal = purRows[0].totalAmount != null ? Number(purRows[0].totalAmount) : null;

      const [sumRows]: any = await connection.query(
        'SELECT COALESCE(SUM(amount), 0) as s FROM stock_purchase_payments WHERE stock_purchase_id = ?',
        [id],
      );
      const already = Number(sumRows?.[0]?.s ?? 0);

      if (billTotal != null && Number.isFinite(billTotal) && already + amount > billTotal + 0.01) {
        return NextResponse.json(
          {
            error: `Payment exceeds remaining balance. Bill ₹${billTotal.toFixed(2)}, already paid ₹${already.toFixed(2)}, remaining ₹${(billTotal - already).toFixed(2)}.`,
          },
          { status: 400 },
        );
      }

      const payId = `spp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await connection.execute(
        `INSERT INTO stock_purchase_payments (id, stock_purchase_id, amount, paid_on, notes, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [payId, id, amount, paidOn, notes, session.user.id || null],
      );

      return NextResponse.json(
        { success: true, payment: { id: payId, amount, paidOn, notes } },
        { status: 201 },
      );
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('stock-purchases payments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/stock-purchases/:id/payments?paymentId=...
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.role || !canEditPayments(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const paymentId = String(new URL(request.url).searchParams.get('paymentId') || '').trim();
    if (!id || !paymentId) {
      return NextResponse.json({ error: 'purchase id and paymentId are required' }, { status: 400 });
    }

    const connection = await createConnection();
    try {
      await ensureStockPurchasePaymentsTable(connection);
      const [res]: any = await connection.execute(
        'DELETE FROM stock_purchase_payments WHERE id = ? AND stock_purchase_id = ? LIMIT 1',
        [paymentId, id],
      );
      const affected = Number(res?.affectedRows ?? 0);
      if (!affected) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true }, { status: 200 });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('stock-purchases payments DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
