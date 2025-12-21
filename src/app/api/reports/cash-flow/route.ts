import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
    const endDate = searchParams.get('endDate') || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0,10);

    const inflowRes = await db.execute(sql`
      SELECT COALESCE(SUM(s.total_amount), 0) AS cash_in
      FROM sales s
      WHERE s.created_at >= ${startDate} AND s.created_at <= ${endDate}
        AND s.payment_status = 'paid'
    `);
    const inflow = (inflowRes as any)?.rows?.[0] ?? (Array.isArray(inflowRes) ? (inflowRes as any)[0] : undefined) ?? { cash_in: 0 };

    const expenseRes = await db.execute(sql`
      SELECT COALESCE(SUM(e.amount), 0) AS cash_out
      FROM expenses e
      WHERE e.expense_date >= ${startDate} AND e.expense_date <= ${endDate}
    `);
    const outflow = (expenseRes as any)?.rows?.[0] ?? (Array.isArray(expenseRes) ? (expenseRes as any)[0] : undefined) ?? { cash_out: 0 };

    const toNum = (v: any) => (v === null || v === undefined ? 0 : Number(v));
    const cashIn = toNum(inflow.cash_in);
    const cashOut = toNum(outflow.cash_out);
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


