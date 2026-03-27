import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
    const endDate = searchParams.get('endDate') || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0,10);
    const startAt = new Date(`${startDate}T00:00:00`);
    const endExclusive = new Date(`${endDate}T00:00:00`);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const toSqlDateTime = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
    const startSql = toSqlDateTime(startAt);
    const endExclusiveSql = toSqlDateTime(endExclusive);

    const inflowRes = await db.execute(sql`
      SELECT COALESCE(SUM(s.total_amount), 0) AS cash_in
      FROM sales s
      WHERE s.created_at >= ${startSql} AND s.created_at < ${endExclusiveSql}
        AND s.payment_status = 'paid'
    `);
    const inflow = (inflowRes as any)?.rows?.[0] ?? (Array.isArray(inflowRes) ? (inflowRes as any)[0] : undefined) ?? { cash_in: 0 };

    const expenseRes = await db.execute(sql`
      SELECT COALESCE(SUM(e.amount), 0) AS cash_out
      FROM expenses e
      WHERE e.expense_date >= ${startSql} AND e.expense_date < ${endExclusiveSql}
    `);
    const expenseOutflow = (expenseRes as any)?.rows?.[0] ?? (Array.isArray(expenseRes) ? (expenseRes as any)[0] : undefined) ?? { cash_out: 0 };

    const stockPurchaseRes = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
          WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
          WHEN p.base_price IS NOT NULL AND sp.quantity IS NOT NULL THEN p.base_price * sp.quantity
          WHEN p.retail_price IS NOT NULL AND sp.quantity IS NOT NULL THEN p.retail_price * sp.quantity
          ELSE 0
        END
      ), 0) AS cash_out
      FROM stock_purchases sp
      LEFT JOIN products p ON p.id = sp.product_id
      WHERE sp.purchase_date >= ${startSql} AND sp.purchase_date < ${endExclusiveSql}
    `);
    const stockOutflow = (stockPurchaseRes as any)?.rows?.[0] ?? (Array.isArray(stockPurchaseRes) ? (stockPurchaseRes as any)[0] : undefined) ?? { cash_out: 0 };

    const courierRes = await db.execute(sql`
      SELECT COALESCE(SUM(c.cost + IFNULL(c.gst_amount, 0)), 0) AS cash_out
      FROM courier_expenses c
      WHERE c.courier_date >= ${startDate} AND c.courier_date <= ${endDate}
    `);
    const courierOutflow = (courierRes as any)?.rows?.[0] ?? (Array.isArray(courierRes) ? (courierRes as any)[0] : undefined) ?? { cash_out: 0 };

    const loanRes = await db.execute(sql`
      SELECT COALESCE(SUM(lp.payment_amount), 0) AS cash_out
      FROM loan_payments lp
      WHERE lp.payment_date >= ${startDate} AND lp.payment_date <= ${endDate}
        AND lp.payment_status = 'paid'
    `);
    const loanOutflow = (loanRes as any)?.rows?.[0] ?? (Array.isArray(loanRes) ? (loanRes as any)[0] : undefined) ?? { cash_out: 0 };

    const toNum = (v: any) => (v === null || v === undefined ? 0 : Number(v));
    const cashIn = toNum(inflow.cash_in);
    const cashOut = toNum(expenseOutflow.cash_out) + toNum(stockOutflow.cash_out) + toNum(courierOutflow.cash_out) + toNum(loanOutflow.cash_out);
    const netCash = cashIn - cashOut;

    return NextResponse.json({
      success: true,
      data: {
        period: { startDate, endDate },
        operatingActivities: {
          cashIn,
          cashOut,
          netCash
        },
        investingActivities: { cashIn: 0, cashOut: 0, netCash: 0 },
        financingActivities: { cashIn: 0, cashOut: 0, netCash: 0 },
        netChangeInCash: netCash
      }
    });
  } catch (error) {
    console.error('cash-flow error', error);
    return NextResponse.json({ success: false, error: 'Failed to generate Cash Flow' }, { status: 500 });
  }
}


