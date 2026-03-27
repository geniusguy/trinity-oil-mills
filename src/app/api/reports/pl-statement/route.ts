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
    const toNum = (v: any) => (v === null || v === undefined ? 0 : Number(v));

    // Build an inclusive date range [start, end] by using an exclusive end boundary.
    const periodStart = new Date(`${defaultStart}T00:00:00`);
    const periodEndExclusive = new Date(`${defaultEnd}T00:00:00`);
    periodEndExclusive.setDate(periodEndExclusive.getDate() + 1);
    const periodEndInclusive = new Date(periodEndExclusive.getTime() - 1);
    const toSqlDateTime = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
    const periodStartSql = toSqlDateTime(periodStart);
    const periodEndExclusiveSql = toSqlDateTime(periodEndExclusive);

    // Use historical P&L calculation for accurate costs
    const historicalPNL = await HistoricalPNLCalculator.calculatePNLForPeriod(
      periodStart,
      periodEndInclusive,
      { paidOnly: true }
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
        WHERE s.created_at >= ${periodStartSql} AND s.created_at < ${periodEndExclusiveSql}
          AND s.payment_status = 'paid'
      `);
      const revenueRow = (revenueRes as any)?.rows?.[0] ?? (Array.isArray(revenueRes) ? (revenueRes as any)[0] : undefined);
      if (revenueRow) revenue = revenueRow;
    } catch (e) {
      console.warn('pl-statement revenue query failed, defaulting to 0s');
    }

    // Historical COGS from sale-items/recipes.
    const historicalCOGS = toNum(historicalPNL?.summary?.totalCost);
    // Fallback COGS from raw material purchases for deployments where historical sale-item
    // costing is not fully wired yet.
    let purchaseCOGSExGst = 0;
    let purchaseGstPaid = 0;
    try {
      const purchaseRes = await db.execute(sql`
        SELECT
          COALESCE(SUM(rmp.total_cost), 0) AS total_purchase_ex_gst,
          COALESCE(SUM(IFNULL(rmp.gst_amount, 0)), 0) AS total_purchase_gst
        FROM raw_material_purchases rmp
        WHERE rmp.purchase_date >= ${periodStartSql} AND rmp.purchase_date < ${periodEndExclusiveSql}
      `);
      const purchaseRow =
        (purchaseRes as any)?.rows?.[0] ??
        (Array.isArray(purchaseRes) ? (purchaseRes as any)[0] : undefined);
      if (purchaseRow) {
        purchaseCOGSExGst = toNum((purchaseRow as any).total_purchase_ex_gst);
        purchaseGstPaid = toNum((purchaseRow as any).total_purchase_gst);
      }
    } catch (e) {
      console.warn('pl-statement raw_material_purchases query failed, fallback COGS unavailable');
    }

    // Secondary fallback for setups using stock_purchases screen instead of raw_material_purchases.
    let stockPurchaseCost = 0;
    try {
      const stockPurchaseRes = await db.execute(sql`
        SELECT COALESCE(SUM(
          CASE
            WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
            WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
            ELSE 0
          END
        ), 0) AS total_stock_purchase_cost
        FROM stock_purchases sp
        WHERE sp.purchase_date >= ${periodStartSql} AND sp.purchase_date < ${periodEndExclusiveSql}
      `);
      const stockPurchaseRow =
        (stockPurchaseRes as any)?.rows?.[0] ??
        (Array.isArray(stockPurchaseRes) ? (stockPurchaseRes as any)[0] : undefined);
      if (stockPurchaseRow) {
        stockPurchaseCost = toNum((stockPurchaseRow as any).total_stock_purchase_cost);
      }
    } catch (e) {
      console.warn('pl-statement stock_purchases query failed, secondary fallback COGS unavailable');
    }

    const usingHistoricalCogs = historicalCOGS > 0;
    const usingRawMaterialPurchasesFallback = !usingHistoricalCogs && purchaseCOGSExGst > 0;
    const computedCOGSExGst = usingHistoricalCogs
      ? historicalCOGS
      : (purchaseCOGSExGst > 0 ? purchaseCOGSExGst : stockPurchaseCost);
    const computedCogsGstPaid = usingHistoricalCogs
      ? 0
      : (purchaseCOGSExGst > 0 ? purchaseGstPaid : 0);
    let cogs: any = { 
      production_costs: computedCOGSExGst, 
      material_costs: computedCOGSExGst * 0.6, // Estimated breakdown
      labor_costs: computedCOGSExGst * 0.2, 
      overhead_costs: computedCOGSExGst * 0.2 
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
        WHERE e.expense_date >= ${periodStartSql} AND e.expense_date < ${periodEndExclusiveSql}
      `);
      const opxRow = (opxRes as any)?.rows?.[0] ?? (Array.isArray(opxRes) ? (opxRes as any)[0] : undefined);
      if (opxRow) opx = opxRow;
    } catch (e) {
      console.warn('pl-statement operating expenses query failed, defaulting to 0s');
    }

    // Courier expenses (canteen shipping — separate table)
    let courierShippingExGst = 0;
    let courierGstPaid = 0;
    try {
      const courierRes = await db.execute(sql`
        SELECT
          COALESCE(SUM(cost), 0) AS total_courier_ex_gst,
          COALESCE(SUM(gst_amount), 0) AS total_courier_gst
        FROM courier_expenses
        WHERE courier_date >= ${defaultStart} AND courier_date <= ${defaultEnd}
      `);
      const courierRow =
        (courierRes as any)?.rows?.[0] ??
        (Array.isArray(courierRes) ? (courierRes as any)[0] : undefined);
      if (courierRow) {
        courierShippingExGst = toNum((courierRow as any).total_courier_ex_gst);
        courierGstPaid = toNum((courierRow as any).total_courier_gst);
      }
    } catch (e) {
      console.warn('pl-statement courier_expenses query failed (table may be missing)');
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

    // Use historical P&L data for accurate calculations
    const grossRevenueExGst = toNum(revenue.gross_revenue);
    const totalInvoiceRevenue = toNum(revenue.total_revenue);
    const gstCollected = toNum(revenue.gst_collected);
    const fallbackRevenue = historicalPNL.summary.totalRevenue || totalInvoiceRevenue;
    const totalRevenue = totalInvoiceRevenue > 0 ? totalInvoiceRevenue : fallbackRevenue;
    const totalCOGS = computedCOGSExGst;
    const totalOpExBase = toNum(opx.total_expenses);
    const totalOpEx = totalOpExBase + courierShippingExGst;
    const loanInterestExpense = toNum(loanData.interest_expense);
    const gstPaidToGovernment = computedCogsGstPaid + courierGstPaid;
    const netGstPayable = gstCollected - gstPaidToGovernment;

    // Business profitability is calculated EX GST.
    const revenueForProfit = grossRevenueExGst > 0 ? grossRevenueExGst : (totalRevenue - gstCollected);
    const grossProfit = revenueForProfit - totalCOGS;
    const operatingProfit = grossProfit - totalOpEx;
    const netProfit = operatingProfit - loanInterestExpense; // Interest is deducted after operating profit

    const pct = (num: number) => (revenueForProfit > 0 ? (num / revenueForProfit) * 100 : 0);

    return NextResponse.json({
      success: true,
      data: {
        period: { startDate: defaultStart, endDate: defaultEnd, generatedAt: new Date().toISOString() },
        revenue: {
          grossRevenue: revenueForProfit,
          gstCollected,
          totalRevenue
        },
        taxes: {
          gstCollected,
          gstPaidToGovernment,
          netGstPayable
        },
        dataSource: {
          cogs:
            usingHistoricalCogs
              ? 'historical-sales-costing'
              : (usingRawMaterialPurchasesFallback ? 'raw_material_purchases' : 'stock_purchases')
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
          courierShipping: courierShippingExGst,
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
          totalRevenue: revenueForProfit,
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


