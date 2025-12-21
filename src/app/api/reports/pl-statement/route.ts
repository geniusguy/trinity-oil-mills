import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { HistoricalPNLCalculator } from '@/lib/priceHistory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const now = new Date();
    const defaultStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const defaultEnd = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    // Use historical P&L calculation for accurate costs
    const historicalPNL = await HistoricalPNLCalculator.calculatePNLForPeriod(
      new Date(defaultStart), 
      new Date(defaultEnd)
    );

    // Also get traditional revenue data for consistency
    let revenue: any = { gross_revenue: 0, gst_collected: 0, total_revenue: 0 };
    try {
      const revenueRes = await db.execute(sql`
        SELECT 
          COALESCE(SUM(s.subtotal), 0) AS gross_revenue,
          COALESCE(SUM(s.gst_amount), 0) AS gst_collected,
          COALESCE(SUM(s.total_amount), 0) AS total_revenue
        FROM sales s
        WHERE s.created_at >= ${defaultStart} AND s.created_at <= ${defaultEnd}
          AND s.payment_status = 'paid'
      `);
      const revenueRow = (revenueRes as any)?.rows?.[0] ?? (Array.isArray(revenueRes) ? (revenueRes as any)[0] : undefined);
      if (revenueRow) revenue = revenueRow;
    } catch (e) {
      console.warn('pl-statement revenue query failed, defaulting to 0s');
    }

    // Use historical cost data instead of simple production costs
    const historicalCOGS = historicalPNL.summary.totalCost;
    let cogs: any = { 
      production_costs: historicalCOGS, 
      material_costs: historicalCOGS * 0.6, // Estimated breakdown
      labor_costs: historicalCOGS * 0.2, 
      overhead_costs: historicalCOGS * 0.2 
    };

    // Operating expenses
    let opx: any = { total_expenses: 0, marketing_expenses: 0, admin_expenses: 0, utility_expenses: 0, maintenance_expenses: 0, other_expenses: 0 };
    try {
      const opxRes = await db.execute(sql`
        SELECT 
          COALESCE(SUM(e.amount), 0) AS total_expenses,
          COALESCE(SUM(CASE WHEN e.category = 'marketing' THEN e.amount ELSE 0 END), 0) AS marketing_expenses,
          COALESCE(SUM(CASE WHEN e.category = 'administrative' THEN e.amount ELSE 0 END), 0) AS admin_expenses,
          COALESCE(SUM(CASE WHEN e.category = 'utilities' THEN e.amount ELSE 0 END), 0) AS utility_expenses,
          COALESCE(SUM(CASE WHEN e.category = 'maintenance' THEN e.amount ELSE 0 END), 0) AS maintenance_expenses,
          COALESCE(SUM(CASE WHEN e.category = 'other' THEN e.amount ELSE 0 END), 0) AS other_expenses
        FROM expenses e
        WHERE e.expense_date >= ${defaultStart} AND e.expense_date <= ${defaultEnd}
      `);
      const opxRow = (opxRes as any)?.rows?.[0] ?? (Array.isArray(opxRes) ? (opxRes as any)[0] : undefined);
      if (opxRow) opx = opxRow;
    } catch (e) {
      console.warn('pl-statement operating expenses query failed, defaulting to 0s');
    }

    // Loan payments (interest expense + principal payment tracking)
    let loanData: any = { total_payments: 0, interest_expense: 0, principal_payments: 0, loan_count: 0 };
    try {
      const loanRes = await db.execute(sql`
        SELECT 
          COALESCE(SUM(lp.payment_amount), 0) AS total_payments,
          COALESCE(SUM(lp.interest_amount), 0) AS interest_expense,
          COALESCE(SUM(lp.principal_amount), 0) AS principal_payments,
          COUNT(DISTINCT lp.loan_id) AS loan_count
        FROM loan_payments lp
        WHERE lp.payment_date >= ${defaultStart} AND lp.payment_date <= ${defaultEnd}
          AND lp.payment_status = 'paid'
      `);
      const loanRow = (loanRes as any)?.rows?.[0] ?? (Array.isArray(loanRes) ? (loanRes as any)[0] : undefined);
      if (loanRow) loanData = loanRow;
    } catch (e) {
      console.warn('pl-statement loan payments query failed, defaulting to 0s');
    }

    const toNum = (v: any) => (v === null || v === undefined ? 0 : Number(v));
    
    // Use historical P&L data for accurate calculations
    const totalRevenue = historicalPNL.summary.totalRevenue || toNum(revenue.total_revenue);
    const totalCOGS = historicalPNL.summary.totalCost;
    const totalOpEx = toNum(opx.total_expenses);
    const loanInterestExpense = toNum(loanData.interest_expense);

    const grossProfit = totalRevenue - totalCOGS;
    const operatingProfit = grossProfit - totalOpEx;
    const netProfit = operatingProfit - loanInterestExpense; // Interest is deducted after operating profit

    const pct = (num: number) => (totalRevenue > 0 ? (num / totalRevenue) * 100 : 0);

    return NextResponse.json({
      success: true,
      data: {
        period: { startDate: defaultStart, endDate: defaultEnd, generatedAt: new Date().toISOString() },
        revenue: {
          grossRevenue: toNum(revenue.gross_revenue),
          gstCollected: toNum(revenue.gst_collected),
          totalRevenue
        },
        costOfGoodsSold: {
          productionCosts: toNum(cogs.production_costs),
          materialCosts: toNum(cogs.material_costs),
          laborCosts: toNum(cogs.labor_costs),
          overheadCosts: toNum(cogs.overhead_costs),
          totalCOGS
        },
        grossProfit: { amount: grossProfit, margin: pct(grossProfit) },
        operatingExpenses: {
          marketing: toNum(opx.marketing_expenses),
          administrative: toNum(opx.admin_expenses),
          utilities: toNum(opx.utility_expenses),
          maintenance: toNum(opx.maintenance_expenses),
          other: toNum(opx.other_expenses),
          totalOperatingExpenses: totalOpEx
        },
        operatingProfit: { amount: operatingProfit, margin: pct(operatingProfit) },
        loanPayments: {
          totalPayments: toNum(loanData.total_payments),
          interestExpense: loanInterestExpense,
          principalPayments: toNum(loanData.principal_payments),
          loanCount: toNum(loanData.loan_count)
        },
        netProfit: { amount: netProfit, margin: pct(netProfit) },
        summary: {
          totalRevenue,
          totalExpenses: totalCOGS + totalOpEx + loanInterestExpense,
          netProfit,
          profitMargin: pct(netProfit)
        }
      }
    });
  } catch (error) {
    console.error('pl-statement error', error);
    return NextResponse.json({ success: false, error: 'Failed to generate P&L' }, { status: 500 });
  }
}


