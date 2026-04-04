import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';
import { formatFinancialYearLabel, getFinancialYearStartYear } from '@/lib/financialYear';

/**
 * GET /api/canteen-credit-days?fyStartYear=2024&canteenAddressId=
 * Indian FY: fyStartYear = April year (e.g. 2024 → 2024-04-01 .. 2025-03-31).
 * Invoice date = COALESCE(invoice_date, DATE(created_at)).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !['admin', 'accountant'].includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const canteenAddressId = searchParams.get('canteenAddressId')?.trim() || '';
    let fyStartYear = Number(searchParams.get('fyStartYear') || '');
    if (!Number.isFinite(fyStartYear) || fyStartYear < 2000) {
      fyStartYear = getFinancialYearStartYear(new Date());
    }

    const fyStartStr = `${fyStartYear}-04-01`;
    const fyEndStr = `${fyStartYear + 1}-03-31`;

    const connection = await createConnection();

    let hasInvoiceDate = false;
    try {
      const [invCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "invoice_date"');
      hasInvoiceDate = Array.isArray(invCols) && invCols.length > 0;
    } catch (_) {}

    let hasCreditedDate = false;
    try {
      const [cCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "credited_date"');
      hasCreditedDate = Array.isArray(cCols) && cCols.length > 0;
    } catch (_) {}

    const invoiceExpr = hasInvoiceDate
      ? 'COALESCE(s.invoice_date, DATE(s.created_at))'
      : 'DATE(s.created_at)';

    const params: unknown[] = [fyStartStr, fyEndStr];
    let canteenClause = '';
    if (canteenAddressId) {
      canteenClause = ' AND s.canteen_address_id = ? ';
      params.push(canteenAddressId);
    }

    const daysExpr = hasCreditedDate
      ? `CASE
           WHEN s.credited_date IS NULL THEN NULL
           ELSE DATEDIFF(s.credited_date, ${invoiceExpr})
         END`
      : 'NULL';

    const query = `
      SELECT
        s.id AS saleId,
        s.invoice_number AS invoiceNumber,
        COALESCE(ca.canteen_name, s.notes, '—') AS canteenName,
        ${invoiceExpr} AS invoiceDate,
        ${hasCreditedDate ? 's.credited_date' : 'NULL'} AS creditedDate,
        ${daysExpr} AS daysBetween
      FROM sales s
      LEFT JOIN canteen_addresses ca ON ca.id = s.canteen_address_id
      WHERE s.sale_type = 'canteen'
        AND ${invoiceExpr} >= ?
        AND ${invoiceExpr} <= ?
        ${canteenClause}
      ORDER BY ${invoiceExpr} DESC, s.id DESC
    `;

    const [rows] = await connection.query(query, params);
    await connection.end();

    return NextResponse.json({
      fyLabel: formatFinancialYearLabel(fyStartYear),
      fyStartYear,
      range: { start: fyStartStr, end: fyEndStr },
      rows,
    });
  } catch (error) {
    console.error('canteen-credit-days GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
