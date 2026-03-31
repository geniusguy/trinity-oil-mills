import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2000-04-01';
    const endDate = searchParams.get('endDate') || new Date().toISOString().slice(0, 10);

    const connection = await createConnection();
    try {
      const [rawRows]: any = await connection.query(
        `SELECT
           COALESCE(SUM(IFNULL(gst_amount, 0)), 0) AS raw_material_gst
         FROM raw_material_purchases
         WHERE purchase_date >= ?
           AND purchase_date < DATE_ADD(?, INTERVAL 1 DAY)`,
        [`${startDate} 00:00:00`, `${endDate} 00:00:00`],
      );

      const [courierRows]: any = await connection.query(
        `SELECT
           COALESCE(SUM(IFNULL(gst_amount, 0)), 0) AS courier_gst
         FROM courier_expenses
         WHERE DATE(courier_date) >= ?
           AND DATE(courier_date) <= ?`,
        [startDate, endDate],
      );

      const [stockRows]: any = await connection.query(
        `SELECT
           mapped.product_id AS productId,
           COALESCE(p.name, mapped.product_id) AS productName,
           IFNULL(p.gst_rate, 0) AS gstRate,
           IFNULL(p.gst_included, 0) AS gstIncluded,
           COUNT(*) AS entries,
           COALESCE(SUM(
             CASE
               WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
               WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
               ELSE 0
             END
           ), 0) AS amountConsidered,
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
                         END, 0
                       ) - (
                         COALESCE(
                           CASE
                             WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
                             WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
                             ELSE 0
                           END, 0
                         ) * 100 / (100 + IFNULL(p.gst_rate, 0))
                       )
                     )
                   ELSE (
                     COALESCE(
                       CASE
                         WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
                         WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
                         ELSE 0
                       END, 0
                     ) * IFNULL(p.gst_rate, 0) / 100
                   )
                 END
             END
           ), 0) AS derivedGst
         FROM stock_purchases sp
         JOIN (
           SELECT
             id,
             CASE
               WHEN product_id COLLATE utf8mb4_general_ci IN ('55336', '68539') THEN 'castor-200ml'
               ELSE product_id
             END AS product_id
           FROM stock_purchases
         ) mapped ON mapped.id = sp.id
         LEFT JOIN products p
           ON p.id COLLATE utf8mb4_general_ci = mapped.product_id COLLATE utf8mb4_general_ci
         WHERE DATE(sp.purchase_date) >= ?
           AND DATE(sp.purchase_date) <= ?
         GROUP BY mapped.product_id, p.name, p.gst_rate, p.gst_included
         HAVING COALESCE(SUM(
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
                       END, 0
                     ) - (
                       COALESCE(
                         CASE
                           WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
                           WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
                           ELSE 0
                         END, 0
                       ) * 100 / (100 + IFNULL(p.gst_rate, 0))
                     )
                   )
                 ELSE (
                   COALESCE(
                     CASE
                       WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
                       WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
                       ELSE 0
                     END, 0
                   ) * IFNULL(p.gst_rate, 0) / 100
                 )
               END
           END
         ), 0) > 0
         ORDER BY derivedGst DESC`,
        [startDate, endDate],
      );

      const raw = Number(rawRows?.[0]?.raw_material_gst || 0);
      const courier = Number(courierRows?.[0]?.courier_gst || 0);
      const stock = (stockRows || []).reduce((sum: number, r: any) => sum + Number(r.derivedGst || 0), 0);

      return NextResponse.json({
        success: true,
        data: {
          period: { startDate, endDate },
          totals: {
            rawMaterialGst: raw,
            stockPurchaseDerivedGst: stock,
            courierGst: courier,
            gstPaidInput: raw + stock + courier,
          },
          stockPurchaseProductBreakdown: (stockRows || []).map((r: any) => ({
            productId: r.productId,
            productName: r.productName,
            gstRate: Number(r.gstRate || 0),
            gstIncluded: Boolean(r.gstIncluded),
            entries: Number(r.entries || 0),
            amountConsidered: Number(r.amountConsidered || 0),
            derivedGst: Number(r.derivedGst || 0),
          })),
        },
      });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('gst-input-reconciliation GET error', error);
    return NextResponse.json({ success: false, error: 'Failed to load GST input reconciliation' }, { status: 500 });
  }
}

