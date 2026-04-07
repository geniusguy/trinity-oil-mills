import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { ensureStockPurchasePaymentsTable } from '@/lib/stockPurchasePaymentsDb';
import { ensureSuppliersTable } from '@/lib/suppliersDb';

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

/**
 * POST /api/stock-purchase-payments/vendor-bulk
 * Body:
 * {
 *   supplierName: string,
 *   paidOn: 'YYYY-MM-DD',
 *   totalAmount: number,
 *   notes?: string,
 *   allocations: [{ stockPurchaseId: string, amount: number }]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.role || !canEditPayments(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supplierName = String(body?.supplierName || '').trim();
    const paidOn = paidOnSql(body?.paidOn);
    const totalAmount = Number(body?.totalAmount);
    const notes = body?.notes == null || body?.notes === '' ? null : String(body.notes).trim();
    const allocationsRaw = Array.isArray(body?.allocations) ? body.allocations : [];

    if (!supplierName) return NextResponse.json({ error: 'supplierName is required' }, { status: 400 });
    if (!paidOn) return NextResponse.json({ error: 'paidOn must be a valid date (YYYY-MM-DD)' }, { status: 400 });
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: 'totalAmount must be greater than 0' }, { status: 400 });
    }
    if (!allocationsRaw.length) return NextResponse.json({ error: 'allocations are required' }, { status: 400 });

    const allocations = allocationsRaw
      .map((a: any) => ({
        stockPurchaseId: String(a?.stockPurchaseId || '').trim(),
        amount: Number(a?.amount),
      }))
      .filter((a: any) => a.stockPurchaseId && Number.isFinite(a.amount) && a.amount > 0);

    if (!allocations.length) return NextResponse.json({ error: 'At least one allocation amount is required' }, { status: 400 });

    const sum = allocations.reduce((acc: number, a: any) => acc + Number(a.amount || 0), 0);
    if (Math.abs(sum - totalAmount) > 0.01) {
      return NextResponse.json(
        { error: `Allocated total ₹${sum.toFixed(2)} must match lumpsum total ₹${totalAmount.toFixed(2)}.` },
        { status: 400 }
      );
    }

    const connection = await createConnection();
    try {
      await ensureStockPurchasePaymentsTable(connection);
      await ensureSuppliersTable(connection);
      await connection.beginTransaction();

      const [supRows]: any = await connection.query(
        'SELECT id FROM suppliers WHERE name COLLATE utf8mb4_general_ci = ? COLLATE utf8mb4_general_ci LIMIT 1',
        [supplierName]
      );
      if (!supRows?.length) {
        await connection.rollback();
        return NextResponse.json({ error: 'Supplier is not in master list. Add supplier first.' }, { status: 400 });
      }

      const ids = allocations.map((a: any) => a.stockPurchaseId);
      const placeholders = ids.map(() => '?').join(', ');
      const [purRows]: any = await connection.query(
        `SELECT sp.id, sp.supplier_name as supplierName, sp.total_amount as totalAmount
         FROM stock_purchases sp
         WHERE sp.id IN (${placeholders})`,
        ids
      );
      const purchaseMap = new Map<string, any>((purRows || []).map((r: any) => [String(r.id), r]));

      // Validate each allocation belongs to supplier + does not exceed remaining.
      for (const a of allocations) {
        const r = purchaseMap.get(a.stockPurchaseId);
        if (!r) {
          await connection.rollback();
          return NextResponse.json({ error: `Purchase not found: ${a.stockPurchaseId}` }, { status: 400 });
        }
        if (String(r.supplierName || '').trim().toLowerCase() !== supplierName.toLowerCase()) {
          await connection.rollback();
          return NextResponse.json({ error: `Purchase ${a.stockPurchaseId} is not for supplier ${supplierName}.` }, { status: 400 });
        }
        const billTotal = r.totalAmount != null ? Number(r.totalAmount) : null;
        if (billTotal == null || !Number.isFinite(billTotal)) {
          await connection.rollback();
          return NextResponse.json({ error: `Purchase ${a.stockPurchaseId} has no total amount. Set bill total first.` }, { status: 400 });
        }
        const [sumRows]: any = await connection.query(
          'SELECT COALESCE(SUM(amount), 0) as s FROM stock_purchase_payments WHERE stock_purchase_id = ?',
          [a.stockPurchaseId]
        );
        const already = Number(sumRows?.[0]?.s ?? 0);
        const remaining = billTotal - already;
        if (a.amount > remaining + 0.01) {
          await connection.rollback();
          return NextResponse.json(
            { error: `Allocation exceeds remaining for purchase ${a.stockPurchaseId}. Remaining ₹${remaining.toFixed(2)}.` },
            { status: 400 }
          );
        }
      }

      const createdPaymentIds: string[] = [];
      for (const a of allocations) {
        const payId = `spp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        createdPaymentIds.push(payId);
        await connection.execute(
          `INSERT INTO stock_purchase_payments (id, stock_purchase_id, amount, paid_on, notes, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [payId, a.stockPurchaseId, Number(a.amount), paidOn, notes, session.user.id || null]
        );
      }

      await connection.commit();
      return NextResponse.json({ success: true, paymentIds: createdPaymentIds }, { status: 201 });
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('vendor-bulk payment POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

