import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate') || new Date().toISOString().slice(0, 10);
    const endExclusive = new Date(`${asOfDate}T00:00:00`);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const endExclusiveSql = endExclusive.toISOString().slice(0, 19).replace('T', ' ');
    const toNum = (v: any) => (v === null || v === undefined ? 0 : Number(v));

    // Paid cash inflow from sales (bank/cash proxy)
    const paidSalesRes = await db.execute(sql`
      SELECT COALESCE(SUM(s.total_amount), 0) AS paid_sales
      FROM sales s
      WHERE s.created_at < ${endExclusiveSql}
        AND s.payment_status = 'paid'
    `);
    const paidSales = (paidSalesRes as any)?.rows?.[0] ?? (Array.isArray(paidSalesRes) ? (paidSalesRes as any)[0] : undefined) ?? { paid_sales: 0 };

    // Outstanding receivables = pending sales
    const receivableRes = await db.execute(sql`
      SELECT COALESCE(SUM(s.total_amount), 0) AS accounts_receivable
      FROM sales s
      WHERE s.created_at < ${endExclusiveSql}
        AND s.payment_status = 'pending'
    `);
    const receivables = (receivableRes as any)?.rows?.[0] ?? (Array.isArray(receivableRes) ? (receivableRes as any)[0] : undefined) ?? { accounts_receivable: 0 };

    // Expenses paid out
    const expensesRes = await db.execute(sql`
      SELECT COALESCE(SUM(e.amount), 0) AS total_expenses
      FROM expenses e
      WHERE e.expense_date < ${endExclusiveSql}
    `);
    const expenses = (expensesRes as any)?.rows?.[0] ?? (Array.isArray(expensesRes) ? (expensesRes as any)[0] : undefined) ?? { total_expenses: 0 };

    // Stock purchases outflow (product purchases)
    const stockPurchaseRes = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
          WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
          WHEN ap.avg_unit_cost IS NOT NULL AND sp.quantity IS NOT NULL THEN ap.avg_unit_cost * sp.quantity
          WHEN p.base_price IS NOT NULL AND sp.quantity IS NOT NULL THEN p.base_price * sp.quantity
          WHEN p.retail_price IS NOT NULL AND sp.quantity IS NOT NULL THEN p.retail_price * sp.quantity
          ELSE 0
        END
      ), 0) AS stock_purchase_outflow
      FROM stock_purchases sp
      LEFT JOIN products p ON p.id = sp.product_id
      LEFT JOIN (
        SELECT
          sp2.product_id,
          AVG(
            CASE
              WHEN sp2.unit_price IS NOT NULL THEN sp2.unit_price
              WHEN sp2.total_amount IS NOT NULL AND sp2.quantity IS NOT NULL AND sp2.quantity > 0
                THEN sp2.total_amount / sp2.quantity
              ELSE NULL
            END
          ) AS avg_unit_cost
        FROM stock_purchases sp2
        GROUP BY sp2.product_id
      ) ap ON ap.product_id = sp.product_id
      WHERE DATE(sp.purchase_date) <= ${asOfDate}
    `);
    const stockPurchases = (stockPurchaseRes as any)?.rows?.[0] ?? (Array.isArray(stockPurchaseRes) ? (stockPurchaseRes as any)[0] : undefined) ?? { stock_purchase_outflow: 0 };

    // Raw material purchases outflow (base + GST)
    const rawPurchaseRes = await db.execute(sql`
      SELECT COALESCE(SUM(rmp.total_cost + IFNULL(rmp.gst_amount, 0)), 0) AS raw_purchase_outflow
      FROM raw_material_purchases rmp
      WHERE rmp.purchase_date < ${endExclusiveSql}
    `);
    const rawPurchases = (rawPurchaseRes as any)?.rows?.[0] ?? (Array.isArray(rawPurchaseRes) ? (rawPurchaseRes as any)[0] : undefined) ?? { raw_purchase_outflow: 0 };

    // Courier outflow (base + GST)
    const courierRes = await db.execute(sql`
      SELECT COALESCE(SUM(c.cost + IFNULL(c.gst_amount, 0)), 0) AS courier_outflow
      FROM courier_expenses c
      WHERE c.courier_date <= ${asOfDate}
    `);
    const courier = (courierRes as any)?.rows?.[0] ?? (Array.isArray(courierRes) ? (courierRes as any)[0] : undefined) ?? { courier_outflow: 0 };

    // Loan paid outflow (EMI payments)
    const loanPaymentRes = await db.execute(sql`
      SELECT COALESCE(SUM(lp.payment_amount), 0) AS loan_payment_outflow
      FROM loan_payments lp
      WHERE lp.payment_date <= ${asOfDate}
        AND lp.payment_status = 'paid'
    `);
    const loanPayments = (loanPaymentRes as any)?.rows?.[0] ?? (Array.isArray(loanPaymentRes) ? (loanPaymentRes as any)[0] : undefined) ?? { loan_payment_outflow: 0 };

    // Inventory valuation from current stock levels
    const inventoryRes = await db.execute(sql`
      SELECT COALESCE(SUM(
        IFNULL(i.quantity, 0) * IFNULL(i.cost_price, IFNULL(p.base_price, IFNULL(p.retail_price, 0)))
      ), 0) AS inventory_value
      FROM inventory i
      LEFT JOIN products p ON p.id = i.product_id
    `);
    const inventory = (inventoryRes as any)?.rows?.[0] ?? (Array.isArray(inventoryRes) ? (inventoryRes as any)[0] : undefined) ?? { inventory_value: 0 };

    // Outstanding loan principal as debt
    const loanBalanceRes = await db.execute(sql`
      SELECT COALESCE(SUM(l.remaining_balance), 0) AS outstanding_loan
      FROM loans l
      WHERE l.status = 'active'
    `);
    const loanBalances = (loanBalanceRes as any)?.rows?.[0] ?? (Array.isArray(loanBalanceRes) ? (loanBalanceRes as any)[0] : undefined) ?? { outstanding_loan: 0 };

    const cashAndCashEquivalents = Math.max(
      0,
      toNum(paidSales.paid_sales)
        - toNum(expenses.total_expenses)
        - toNum(stockPurchases.stock_purchase_outflow)
        - toNum(rawPurchases.raw_purchase_outflow)
        - toNum(courier.courier_outflow)
        - toNum(loanPayments.loan_payment_outflow)
    );
    const accountsReceivable = toNum(receivables.accounts_receivable);
    const inventoryValue = toNum(inventory.inventory_value);

    const totalAssets = cashAndCashEquivalents + accountsReceivable + inventoryValue;

    // AP is not tracked with payment status in current purchase tables; keep zero instead of fake estimate.
    const accountsPayable = 0;
    const shortTermDebt = 0;
    const longTermDebt = toNum(loanBalances.outstanding_loan);
    const totalLiabilities = accountsPayable + shortTermDebt + longTermDebt;
    const equity = totalAssets - totalLiabilities;

    return NextResponse.json({
      success: true,
      data: {
        asOfDate,
        assets: {
          cashAndCashEquivalents,
          accountsReceivable,
          inventory: inventoryValue,
          totalAssets
        },
        liabilities: {
          accountsPayable,
          shortTermDebt,
          longTermDebt,
          totalLiabilities
        },
        equity: {
          retainedEarnings: equity,
          ownerEquity: 0,
          totalEquity: equity
        },
        dataQuality: {
          note: 'accounts_payable is zero because vendor payable status is not tracked in purchase tables',
          basedOn: ['sales', 'expenses', 'stock_purchases', 'raw_material_purchases', 'courier_expenses', 'loan_payments', 'loans', 'inventory']
        }
      }
    });
  } catch (error) {
    console.error('balance-sheet error', error);
    return NextResponse.json({ success: false, error: 'Failed to generate Balance Sheet' }, { status: 500 });
  }
}


