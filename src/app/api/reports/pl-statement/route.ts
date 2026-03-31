import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
import { createConnection } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const fyStartYearParam = searchParams.get('fyStartYear');

    const now = new Date();
    const isAllFy = String(fyStartYearParam || '').toLowerCase() === 'all';
    const parsedFyStart = fyStartYearParam && /^\d{4}$/.test(fyStartYearParam) ? Number(fyStartYearParam) : null;
    const defaultStart = startDate || (isAllFy
      ? '2000-04-01'
      : parsedFyStart != null
      ? `${parsedFyStart}-04-01`
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const defaultEnd = endDate || (isAllFy
      ? new Date().toISOString().slice(0, 10)
      : parsedFyStart != null
      ? `${parsedFyStart + 1}-03-31`
      : new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
    const toNum = (v: any) => (v === null || v === undefined ? 0 : Number(v));

    // Build an inclusive date range [start, end] by using an exclusive end boundary.
    const periodStart = new Date(`${defaultStart}T00:00:00`);
    const periodEndExclusive = new Date(`${defaultEnd}T00:00:00`);
    periodEndExclusive.setDate(periodEndExclusive.getDate() + 1);
    const periodEndInclusive = new Date(periodEndExclusive.getTime() - 1);
    const toSqlDateTime = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
    const periodStartSql = toSqlDateTime(periodStart);
    const periodEndExclusiveSql = toSqlDateTime(periodEndExclusive);
    const queryWarnings: string[] = [];

    // Revenue from live invoices (same business view as Sales pages):
    // - include paid + pending invoices
    // - use invoice_date when present, otherwise created_at
    let revenue: any = { gross_revenue: 0, gst_collected: 0, total_revenue: 0 };
    let revenuePaid: any = { gross_revenue_paid: 0, gst_collected_paid: 0, total_revenue_paid: 0 };
    let revenuePending: any = { gross_revenue_pending: 0, gst_collected_pending: 0, total_revenue_pending: 0 };
    try {
      const revenueRes = await db.execute(sql`
        SELECT 
          COALESCE(SUM(s.subtotal), 0) AS gross_revenue,
          COALESCE(SUM(s.gst_amount), 0) AS gst_collected,
          COALESCE(SUM(s.total_amount), 0) AS total_revenue
        FROM sales s
        WHERE COALESCE(s.invoice_date, DATE(s.created_at)) >= ${defaultStart}
          AND COALESCE(s.invoice_date, DATE(s.created_at)) <= ${defaultEnd}
      `);
      const revenueRow = (revenueRes as any)?.rows?.[0] ?? (Array.isArray(revenueRes) ? (revenueRes as any)[0] : undefined);
      if (revenueRow) revenue = revenueRow;

      const revenuePaidRes = await db.execute(sql`
        SELECT
          COALESCE(SUM(s.subtotal), 0) AS gross_revenue_paid,
          COALESCE(SUM(s.gst_amount), 0) AS gst_collected_paid,
          COALESCE(SUM(s.total_amount), 0) AS total_revenue_paid
        FROM sales s
        WHERE COALESCE(s.invoice_date, DATE(s.created_at)) >= ${defaultStart}
          AND COALESCE(s.invoice_date, DATE(s.created_at)) <= ${defaultEnd}
          AND s.payment_status = 'paid'
      `);
      const paidRow = (revenuePaidRes as any)?.rows?.[0] ?? (Array.isArray(revenuePaidRes) ? (revenuePaidRes as any)[0] : undefined);
      if (paidRow) revenuePaid = paidRow;

      const revenuePendingRes = await db.execute(sql`
        SELECT
          COALESCE(SUM(s.subtotal), 0) AS gross_revenue_pending,
          COALESCE(SUM(s.gst_amount), 0) AS gst_collected_pending,
          COALESCE(SUM(s.total_amount), 0) AS total_revenue_pending
        FROM sales s
        WHERE COALESCE(s.invoice_date, DATE(s.created_at)) >= ${defaultStart}
          AND COALESCE(s.invoice_date, DATE(s.created_at)) <= ${defaultEnd}
          AND s.payment_status <> 'paid'
      `);
      const pendingRow = (revenuePendingRes as any)?.rows?.[0] ?? (Array.isArray(revenuePendingRes) ? (revenuePendingRes as any)[0] : undefined);
      if (pendingRow) revenuePending = pendingRow;
    } catch (e) {
      console.warn('pl-statement revenue query failed, defaulting to 0s');
    }

    // Revenue/GST connection fallback (same DB path as sales module).
    // Also derive GST from total-subtotal when gst_amount is missing/zero.
    try {
      if (toNum(revenue.gross_revenue) <= 0 || toNum(revenue.gst_collected) <= 0) {
        const connection = await createConnection();
        try {
          const [rowsAll]: any = await connection.query(
            `SELECT
               COALESCE(SUM(COALESCE(s.subtotal, 0)), 0) AS gross_revenue,
               COALESCE(SUM(
                 CASE
                   WHEN COALESCE(s.gst_amount, 0) > 0 THEN s.gst_amount
                   WHEN COALESCE(s.total_amount, 0) > COALESCE(s.subtotal, 0) THEN (s.total_amount - s.subtotal)
                   ELSE 0
                 END
               ), 0) AS gst_collected,
               COALESCE(SUM(
                 CASE
                   WHEN COALESCE(s.total_amount, 0) > 0 THEN s.total_amount
                   ELSE COALESCE(s.subtotal, 0) + (
                     CASE
                       WHEN COALESCE(s.gst_amount, 0) > 0 THEN s.gst_amount
                       WHEN COALESCE(s.total_amount, 0) > COALESCE(s.subtotal, 0) THEN (s.total_amount - s.subtotal)
                       ELSE 0
                     END
                   )
                 END
               ), 0) AS total_revenue
             FROM sales s
             WHERE COALESCE(s.invoice_date, DATE(s.created_at)) >= ?
               AND COALESCE(s.invoice_date, DATE(s.created_at)) <= ?`,
            [defaultStart, defaultEnd],
          );
          const allRow = Array.isArray(rowsAll) ? rowsAll[0] : null;
          if (allRow && (toNum(allRow.gross_revenue) > 0 || toNum(allRow.gst_collected) > 0)) {
            revenue = allRow;
            queryWarnings.push('using sales connection fallback (all invoices)');
          }
        } finally {
          await connection.end();
        }
      }
    } catch {
      queryWarnings.push('sales revenue/gst connection fallback failed');
    }

    // Ensure paid/pending split is also derived from live connection path.
    try {
      if (toNum(revenuePaid.total_revenue_paid) <= 0 && toNum(revenuePending.total_revenue_pending) <= 0) {
        const connection = await createConnection();
        try {
          const [paidRows]: any = await connection.query(
            `SELECT
               COALESCE(SUM(s.subtotal), 0) AS gross_revenue_paid,
               COALESCE(SUM(s.gst_amount), 0) AS gst_collected_paid,
               COALESCE(SUM(s.total_amount), 0) AS total_revenue_paid
             FROM sales s
             WHERE COALESCE(s.invoice_date, DATE(s.created_at)) >= ?
               AND COALESCE(s.invoice_date, DATE(s.created_at)) <= ?
               AND s.payment_status = 'paid'`,
            [defaultStart, defaultEnd],
          );
          const paidRow = Array.isArray(paidRows) ? paidRows[0] : null;
          if (paidRow) revenuePaid = paidRow;

          const [pendingRows]: any = await connection.query(
            `SELECT
               COALESCE(SUM(s.subtotal), 0) AS gross_revenue_pending,
               COALESCE(SUM(s.gst_amount), 0) AS gst_collected_pending,
               COALESCE(SUM(s.total_amount), 0) AS total_revenue_pending
             FROM sales s
             WHERE COALESCE(s.invoice_date, DATE(s.created_at)) >= ?
               AND COALESCE(s.invoice_date, DATE(s.created_at)) <= ?
               AND s.payment_status <> 'paid'`,
            [defaultStart, defaultEnd],
          );
          const pendingRow = Array.isArray(pendingRows) ? pendingRows[0] : null;
          if (pendingRow) revenuePending = pendingRow;
          queryWarnings.push('using revenue paid/pending connection fallback');
        } finally {
          await connection.end();
        }
      }
    } catch {
      queryWarnings.push('revenue paid/pending connection fallback failed');
    }

    // Sales returns / expiry adjustments
    let returnsRevenueReversalExGst = 0;
    let returnsRevenueReversalGst = 0;
    let expiryWriteoffExGst = 0;
    try {
      const returnsRes = await db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN accounting_impact IN ('revenue_reversal', 'both') THEN return_amount_ex_gst ELSE 0 END), 0) AS return_reversal_ex_gst,
          COALESCE(SUM(CASE WHEN accounting_impact IN ('revenue_reversal', 'both') THEN return_gst_amount ELSE 0 END), 0) AS return_reversal_gst,
          COALESCE(SUM(CASE WHEN accounting_impact IN ('expense_writeoff', 'both') AND return_nature = 'expiry' THEN return_amount_ex_gst ELSE 0 END), 0) AS expiry_writeoff_ex_gst
        FROM sales_returns
        WHERE return_date >= ${defaultStart} AND return_date <= ${defaultEnd}
      `);
      const returnsRow =
        (returnsRes as any)?.rows?.[0] ??
        (Array.isArray(returnsRes) ? (returnsRes as any)[0] : undefined);
      if (returnsRow) {
        returnsRevenueReversalExGst = toNum((returnsRow as any).return_reversal_ex_gst);
        returnsRevenueReversalGst = toNum((returnsRow as any).return_reversal_gst);
        expiryWriteoffExGst = toNum((returnsRow as any).expiry_writeoff_ex_gst);
      }
    } catch (e) {
      console.warn('pl-statement sales_returns query failed (table may be missing)');
    }

    // Strict live-source mode: do not use historical simulated costing in P&L.
    const historicalCOGS = 0;
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
      queryWarnings.push('raw_material_purchases query failed');
    }

    // Secondary fallback for setups using stock_purchases screen instead of raw_material_purchases.
    let stockPurchaseCost = 0;
    let stockPurchaseDerivedGst = 0;
    let stockPurchaseRows = 0;
    let stockPurchaseRowsWithAmount = 0;
    try {
      const stockPurchaseRes = await db.execute(sql`
        SELECT
          COALESCE(SUM(
            CASE
              WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
              WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
              ELSE 0
            END
          ), 0) AS total_stock_purchase_cost,
          COALESCE(SUM(
            CASE
              -- Prefer explicit GST difference when total and base are both available
              WHEN sp.total_amount IS NOT NULL
                   AND sp.unit_price IS NOT NULL
                   AND sp.quantity IS NOT NULL
                   AND sp.total_amount > (sp.unit_price * sp.quantity)
                THEN (sp.total_amount - (sp.unit_price * sp.quantity))
              ELSE
                CASE
                  -- If GST is included in stored amount, back-calculate GST component
                  WHEN IFNULL(p.gst_included, 0) = 1
                    THEN (
                      COALESCE(
                        CASE
                          WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
                          WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
                          ELSE 0
                        END,
                        0
                      ) - (
                        COALESCE(
                          CASE
                            WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
                            WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
                            ELSE 0
                          END,
                          0
                        ) * 100 / (100 + IFNULL(p.gst_rate, 0))
                      )
                    )
                  -- Otherwise treat amount as ex-GST and apply product GST rate
                  ELSE (
                    COALESCE(
                      CASE
                        WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
                        WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
                        ELSE 0
                      END,
                      0
                    ) * IFNULL(p.gst_rate, 0) / 100
                  )
                END
            END
          ), 0) AS total_stock_purchase_gst_derived,
          COUNT(*) AS total_rows,
          SUM(CASE WHEN sp.total_amount IS NOT NULL OR sp.unit_price IS NOT NULL THEN 1 ELSE 0 END) AS rows_with_amount
        FROM stock_purchases sp
        LEFT JOIN products p ON p.id = sp.product_id
        WHERE DATE(sp.purchase_date) >= ${defaultStart} AND DATE(sp.purchase_date) <= ${defaultEnd}
      `);
      const stockPurchaseRow =
        (stockPurchaseRes as any)?.rows?.[0] ??
        (Array.isArray(stockPurchaseRes) ? (stockPurchaseRes as any)[0] : undefined);
      if (stockPurchaseRow) {
        stockPurchaseCost = toNum((stockPurchaseRow as any).total_stock_purchase_cost);
        stockPurchaseDerivedGst = toNum((stockPurchaseRow as any).total_stock_purchase_gst_derived);
        stockPurchaseRows = toNum((stockPurchaseRow as any).total_rows);
        stockPurchaseRowsWithAmount = toNum((stockPurchaseRow as any).rows_with_amount);
      }

      // No all-time fallback in live-source mode (strictly selected period only).
    } catch (e) {
      console.warn('pl-statement stock_purchases query failed, secondary fallback COGS unavailable');
      queryWarnings.push('stock_purchases query failed');
    }

    // Connection-level fallback (same DB path as stock-purchases module) to avoid pool/env mismatch.
    try {
      if (stockPurchaseCost <= 0 || stockPurchaseRows <= 0) {
        const connection = await createConnection();
        try {
          const [rows]: any = await connection.query(
            `SELECT
               COALESCE(SUM(
                 CASE
                   WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
                   WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
                   ELSE 0
                 END
               ), 0) AS total_stock_purchase_cost,
               COALESCE(SUM(
                 CASE
                   WHEN sp.total_amount IS NOT NULL
                        AND sp.unit_price IS NOT NULL
                        AND sp.quantity IS NOT NULL
                        AND sp.total_amount > (sp.unit_price * sp.quantity)
                     THEN (sp.total_amount - (sp.unit_price * sp.quantity))
                   ELSE
                     CASE
                       WHEN IFNULL(p.gst_included, 0) = 1
                         THEN (
                           COALESCE(
                             CASE
                               WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
                               WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
                               ELSE 0
                             END,
                             0
                           ) - (
                             COALESCE(
                               CASE
                                 WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
                                 WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
                                 ELSE 0
                               END,
                               0
                             ) * 100 / (100 + IFNULL(p.gst_rate, 0))
                           )
                         )
                       ELSE (
                         COALESCE(
                           CASE
                             WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
                             WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
                             ELSE 0
                           END,
                           0
                         ) * IFNULL(p.gst_rate, 0) / 100
                       )
                     END
                 END
               ), 0) AS total_stock_purchase_gst_derived,
               COUNT(*) AS total_rows,
               SUM(CASE WHEN sp.total_amount IS NOT NULL OR sp.unit_price IS NOT NULL THEN 1 ELSE 0 END) AS rows_with_amount
             FROM stock_purchases sp
             LEFT JOIN products p ON p.id = sp.product_id
             WHERE DATE(sp.purchase_date) >= ? AND DATE(sp.purchase_date) <= ?`,
            [defaultStart, defaultEnd],
          );
          const row = Array.isArray(rows) ? rows[0] : null;
          if (row && toNum(row.total_stock_purchase_cost) > 0) {
            stockPurchaseCost = toNum(row.total_stock_purchase_cost);
            stockPurchaseDerivedGst = toNum(row.total_stock_purchase_gst_derived);
            stockPurchaseRows = toNum(row.total_rows);
            stockPurchaseRowsWithAmount = toNum(row.rows_with_amount);
            queryWarnings.push('using stock_purchases connection fallback (period)');
          }

          // No all-time connection fallback in live-source mode.
        } finally {
          await connection.end();
        }
      }
    } catch {
      queryWarnings.push('stock_purchases connection fallback failed');
    }

    // Prefer the most complete COGS source:
    // 1) stock_purchases / raw_material_purchases are treated as authoritative when they exceed historical
      // 2) historical is disabled in live-source mode
    const purchaseBackedCogs = purchaseCOGSExGst > 0 ? purchaseCOGSExGst : stockPurchaseCost;
    const shouldPreferPurchaseBackedCogs =
      purchaseBackedCogs > 0 &&
      (historicalCOGS <= 0 || purchaseBackedCogs > historicalCOGS);

    if (shouldPreferPurchaseBackedCogs) {
      queryWarnings.push('using purchase-backed COGS over historical');
    }

    const usingHistoricalCogs = !shouldPreferPurchaseBackedCogs && historicalCOGS > 0;
    const usingRawMaterialPurchasesFallback =
      !usingHistoricalCogs && purchaseCOGSExGst > 0;

    const computedCOGSExGst = usingHistoricalCogs
      ? historicalCOGS
      : purchaseBackedCogs;

    const computedCogsGstPaid = usingHistoricalCogs
      ? 0
      : (purchaseCOGSExGst > 0 ? purchaseGstPaid : stockPurchaseDerivedGst);
    // Do not invent cost splits. Keep COGS transparent and deterministic.
    const cogs: any = {
      // No itemized BOM split is available in DB reports today; treat total as production/COGS line.
      production_costs: computedCOGSExGst,
      material_costs: 0,
      labor_costs: 0,
      overhead_costs: 0
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
          COALESCE(SUM(CASE WHEN e.category IN ('other', 'transportation') THEN e.amount ELSE 0 END), 0) AS other_expenses
        FROM expenses e
        WHERE DATE(e.expense_date) >= ${defaultStart} AND DATE(e.expense_date) <= ${defaultEnd}
      `);
      const opxRow = (opxRes as any)?.rows?.[0] ?? (Array.isArray(opxRes) ? (opxRes as any)[0] : undefined);
      if (opxRow) opx = opxRow;
    } catch (e) {
      console.warn('pl-statement operating expenses query failed, defaulting to 0s');
      queryWarnings.push('expenses query failed');
    }

    // No all-time expense fallback in live-source mode.

    // Connection-level fallback (same DB path as Expenses module)
    try {
      if (toNum(opx.total_expenses) <= 0) {
        const connection = await createConnection();
        try {
          const [rows]: any = await connection.query(
            `SELECT
               COALESCE(SUM(e.amount), 0) AS total_expenses,
               COALESCE(SUM(CASE WHEN e.category = 'marketing' THEN e.amount ELSE 0 END), 0) AS marketing_expenses,
               COALESCE(SUM(CASE WHEN e.category = 'administrative' THEN e.amount ELSE 0 END), 0) AS admin_expenses,
               COALESCE(SUM(CASE WHEN e.category = 'utilities' THEN e.amount ELSE 0 END), 0) AS utility_expenses,
               COALESCE(SUM(CASE WHEN e.category = 'maintenance' THEN e.amount ELSE 0 END), 0) AS maintenance_expenses,
               COALESCE(SUM(CASE WHEN e.category IN ('other','transportation') THEN e.amount ELSE 0 END), 0) AS other_expenses
             FROM expenses e
             WHERE DATE(e.expense_date) >= ? AND DATE(e.expense_date) <= ?`,
            [defaultStart, defaultEnd],
          );
          const row = Array.isArray(rows) ? rows[0] : null;
          if (row && toNum(row.total_expenses) > 0) {
            opx = row;
            queryWarnings.push('using expenses connection fallback (period)');
          }

          // No all-time connection fallback in live-source mode.
        } finally {
          await connection.end();
        }
      }
    } catch {
      queryWarnings.push('expenses connection fallback failed');
    }

    // Courier expenses (canteen shipping — Courier Expenses module totals)
    let courierShippingExGst = 0;
    let courierGstPaid = 0;
    try {
      const courierRes = await db.execute(sql`
        SELECT
          COALESCE(SUM(cost + IFNULL(gst_amount, 0)), 0) AS total_courier_ex_gst,
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

    // Connection fallback using same DB path as courier module.
    try {
      if (courierShippingExGst <= 0 && courierGstPaid <= 0) {
        const connection = await createConnection();
        try {
          const [rows]: any = await connection.query(
            `SELECT
               COALESCE(SUM(cost + IFNULL(gst_amount, 0)), 0) AS total_courier_ex_gst,
               COALESCE(SUM(gst_amount), 0) AS total_courier_gst
             FROM courier_expenses
             WHERE DATE(courier_date) >= ? AND DATE(courier_date) <= ?`,
            [defaultStart, defaultEnd],
          );
          const row = Array.isArray(rows) ? rows[0] : null;
          if (row) {
            courierShippingExGst = toNum((row as any).total_courier_ex_gst);
            courierGstPaid = toNum((row as any).total_courier_gst);
            if (courierShippingExGst > 0 || courierGstPaid > 0) {
              queryWarnings.push('using courier_expenses connection fallback');
            }
          }
        } finally {
          await connection.end();
        }
      }
    } catch {
      queryWarnings.push('courier_expenses connection fallback failed');
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

    // Live-source totals only
    const grossRevenueExGst = toNum(revenue.gross_revenue);
    const totalInvoiceRevenue = toNum(revenue.total_revenue);
    const gstCollected = toNum(revenue.gst_collected);
    const adjustedGrossRevenueExGst = Math.max(0, grossRevenueExGst - returnsRevenueReversalExGst);
    const adjustedGstCollected = gstCollected - returnsRevenueReversalGst;
    const adjustedTotalInvoiceRevenue = adjustedGrossRevenueExGst + adjustedGstCollected;
    const totalRevenue = adjustedTotalInvoiceRevenue;
    const totalCOGS = computedCOGSExGst;
    const totalOpExBase = toNum(opx.total_expenses);
    const totalOpEx = totalOpExBase + courierShippingExGst + expiryWriteoffExGst;
    const loanInterestExpense = toNum(loanData.interest_expense);
    const gstPaidToGovernment = computedCogsGstPaid + courierGstPaid;
    const netGstPayable = adjustedGstCollected - gstPaidToGovernment;

    // Business profitability is calculated EX GST.
    const revenueForProfit = adjustedGrossRevenueExGst > 0 ? adjustedGrossRevenueExGst : (totalRevenue - adjustedGstCollected);
    const grossProfit = revenueForProfit - totalCOGS;
    const operatingProfit = grossProfit - totalOpEx;
    const netProfit = operatingProfit - loanInterestExpense; // Interest is deducted after operating profit

    const pct = (num: number) => (revenueForProfit > 0 ? (num / revenueForProfit) * 100 : 0);

    return NextResponse.json({
      success: true,
      data: {
        period: {
          startDate: defaultStart,
          endDate: defaultEnd,
          generatedAt: new Date().toISOString(),
          fyStartYear: isAllFy ? 'all' : (parsedFyStart != null ? parsedFyStart : null),
        },
        revenue: {
          grossRevenue: revenueForProfit,
          gstCollected: adjustedGstCollected,
          totalRevenue,
          grossRevenuePaid: toNum(revenuePaid.gross_revenue_paid),
          gstCollectedPaid: toNum(revenuePaid.gst_collected_paid),
          totalRevenuePaid: toNum(revenuePaid.total_revenue_paid),
          grossRevenuePending: toNum(revenuePending.gross_revenue_pending),
          gstCollectedPending: toNum(revenuePending.gst_collected_pending),
          totalRevenuePending: toNum(revenuePending.total_revenue_pending),
        },
        taxes: {
          gstCollected: adjustedGstCollected,
          gstPaidFromRawMaterialPurchases: purchaseGstPaid,
          gstPaidFromStockPurchasesDerived: purchaseCOGSExGst > 0 ? 0 : stockPurchaseDerivedGst,
          gstPaidFromCourier: courierGstPaid,
          gstPaidToGovernment,
          netGstPayable
        },
        returnsAndExpiry: {
          salesReturnReversalExGst: returnsRevenueReversalExGst,
          salesReturnGstReversal: returnsRevenueReversalGst,
          expiryWriteoffExGst,
        },
        dataSource: {
          cogs: usingRawMaterialPurchasesFallback ? 'raw_material_purchases' : 'stock_purchases',
          mode: 'live-source',
        },
        diagnostics: {
          stockPurchaseRows,
          stockPurchaseRowsWithAmount,
          derivedStockCost: stockPurchaseCost,
          derivedStockPurchaseGst: stockPurchaseDerivedGst,
          queryWarnings
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
          expiryWriteoff: expiryWriteoffExGst,
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


