import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().slice(0, 10);

    // Very simple illustrative balance sheet using available tables
    // Assets proxy: cash from paid sales - expenses paid - production costs to date
    const revenueRes = await db.execute(sql`
      SELECT COALESCE(SUM(s.total_amount), 0) AS total_revenue
      FROM sales s
      WHERE s.created_at <= ${asOfDate} AND s.payment_status = 'paid'
    `);
    const revenue = (revenueRes as any)?.rows?.[0] ?? (Array.isArray(revenueRes) ? (revenueRes as any)[0] : undefined) ?? { total_revenue: 0 };

    const expensesRes = await db.execute(sql`
      SELECT COALESCE(SUM(e.amount), 0) AS total_expenses
      FROM expenses e
      WHERE e.expense_date <= ${asOfDate}
    `);
    const expenses = (expensesRes as any)?.rows?.[0] ?? (Array.isArray(expensesRes) ? (expensesRes as any)[0] : undefined) ?? { total_expenses: 0 };

    const prodRes = await db.execute(sql`
      SELECT COALESCE(SUM(p.total_cost), 0) AS total_production_cost
      FROM production p
      WHERE p.production_date <= ${asOfDate}
    `);
    const production = (prodRes as any)?.rows?.[0] ?? (Array.isArray(prodRes) ? (prodRes as any)[0] : undefined) ?? { total_production_cost: 0 };

    const toNum = (v: any) => (v === null || v === undefined ? 0 : Number(v));
    const totalAssets = Math.max(0, toNum(revenue.total_revenue) - toNum(expenses.total_expenses));
    const totalLiabilities = toNum(production.total_production_cost) * 0.2; // placeholder assumption
    const equity = totalAssets - totalLiabilities;

    return NextResponse.json({
      success: true,
      data: {
        asOfDate,
        assets: {
          cashAndCashEquivalents: totalAssets,
          accountsReceivable: 0,
          inventory: Math.max(0, toNum(production.total_production_cost) * 0.8),
          totalAssets
        },
        liabilities: {
          accountsPayable: totalLiabilities,
          shortTermDebt: 0,
          longTermDebt: 0,
          totalLiabilities
        },
        equity: {
          retainedEarnings: equity,
          ownerEquity: 0,
          totalEquity: equity
        }
      }
    });
  } catch (error) {
    console.error('balance-sheet error', error);
    return NextResponse.json({ success: false, error: 'Failed to generate Balance Sheet' }, { status: 500 });
  }
}


