import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { ensureStockPurchasePaymentsTable } from '@/lib/stockPurchasePaymentsDb';
import {
  formatFinancialYearLabel,
  getFinancialYearEndDate,
  getFinancialYearStartDate,
  parseFinancialYearLabelToStartYear,
} from '@/lib/financialYear';

function canViewPayments(role: string | undefined) {
  return ['admin', 'retail_staff', 'accountant'].includes(role || '');
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function formatYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseMonthKeyToBounds(monthKey: string): { start: string; end: string } | null {
  const t = String(monthKey).trim();
  const m = t.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  const start = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate(); // month is 1-12 here
  const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  return { start, end };
}

function monthLabelFromKey(monthKey: string) {
  const m = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!m) return monthKey;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${names[month - 1] ?? monthKey} ${year}`;
}

// GET /api/stock-purchase-payments?fy=2024-25&month=YYYY-MM&search=...
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!canViewPayments((session as any)?.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fy = searchParams.get('fy')?.trim() || '';
    const month = searchParams.get('month')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 2000);

    const fyStartYear = fy ? parseFinancialYearLabelToStartYear(fy) : null;
    const monthBounds = month ? parseMonthKeyToBounds(month) : null;

    const connection = await createConnection();
    await ensureStockPurchasePaymentsTable(connection);

    const whereBase: string[] = [];
    const paramsBase: any[] = [];

    if (search) {
      const q = `%${search}%`;
      whereBase.push(
        `(spp.id LIKE ? OR spp.notes LIKE ? OR sp.supplier_name LIKE ? OR sp.invoice_number LIKE ? OR COALESCE(p.name,'') LIKE ? OR COALESCE(sp.notes,'') LIKE ?)`,
      );
      paramsBase.push(q, q, q, q, q, q);
    }

    const whereBaseSql = whereBase.length ? `WHERE ${whereBase.join(' AND ')}` : '';

    // FY options (ignore fy/month filters, but apply search).
    const fyWhereSql = whereBaseSql;
    const [fyRows]: any = await connection.query(
      `
        SELECT DISTINCT
          CASE
            WHEN MONTH(spp.paid_on) >= 4 THEN YEAR(spp.paid_on)
            ELSE YEAR(spp.paid_on) - 1
          END AS fyStartYear
        FROM stock_purchase_payments spp
        JOIN stock_purchases sp
          ON sp.id COLLATE utf8mb4_general_ci = spp.stock_purchase_id COLLATE utf8mb4_general_ci
        LEFT JOIN products p
          ON p.id COLLATE utf8mb4_general_ci = (
            CASE
              WHEN sp.product_id COLLATE utf8mb4_general_ci IN ('55336', '68539') THEN 'castor-200ml'
              ELSE sp.product_id
            END
          ) COLLATE utf8mb4_general_ci
        ${fyWhereSql}
        ORDER BY fyStartYear DESC
        LIMIT 10
      `,
      paramsBase,
    );

    const availableFys: { value: string; label: string }[] = (fyRows || [])
      .map((r: any) => {
        const startYear = Number(r.fyStartYear);
        if (!Number.isFinite(startYear)) return null;
        return { value: formatFinancialYearLabel(startYear), label: `FY ${formatFinancialYearLabel(startYear)}` };
      })
      .filter(Boolean) as any;

    // Month options (respect FY if provided; otherwise show last ~18 months).
    const monthWhere: string[] = [...whereBase];
    const paramsMonth: any[] = [...paramsBase];

    if (fyStartYear != null) {
      const start = getFinancialYearStartDate(fyStartYear);
      const end = getFinancialYearEndDate(fyStartYear);
      monthWhere.push('spp.paid_on >= ?');
      paramsMonth.push(formatYMD(start));
      monthWhere.push('spp.paid_on <= ?');
      paramsMonth.push(formatYMD(end));
    } else {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 17, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthWhere.push('spp.paid_on >= ?');
      paramsMonth.push(formatYMD(start));
      monthWhere.push('spp.paid_on <= ?');
      paramsMonth.push(formatYMD(end));
    }

    const monthWhereSql = monthWhere.length ? `WHERE ${monthWhere.join(' AND ')}` : '';
    const [monthRows]: any = await connection.query(
      `
        SELECT DATE_FORMAT(spp.paid_on, '%Y-%m') AS monthKey
        FROM stock_purchase_payments spp
        JOIN stock_purchases sp
          ON sp.id COLLATE utf8mb4_general_ci = spp.stock_purchase_id COLLATE utf8mb4_general_ci
        LEFT JOIN products p
          ON p.id COLLATE utf8mb4_general_ci = (
            CASE
              WHEN sp.product_id COLLATE utf8mb4_general_ci IN ('55336', '68539') THEN 'castor-200ml'
              ELSE sp.product_id
            END
          ) COLLATE utf8mb4_general_ci
        ${monthWhereSql}
        GROUP BY monthKey
        ORDER BY monthKey DESC
        LIMIT 24
      `,
      paramsMonth,
    );

    const availableMonths: { value: string; label: string }[] = (monthRows || [])
      .map((r: any) => {
        const key = String(r.monthKey || '').trim();
        if (!key) return null;
        return { value: key, label: monthLabelFromKey(key) };
      })
      .filter(Boolean) as any;

    // Payments query (respect fy/month/search).
    const where: string[] = [...whereBase];
    const params: any[] = [...paramsBase];

    if (fyStartYear != null) {
      const start = getFinancialYearStartDate(fyStartYear);
      const end = getFinancialYearEndDate(fyStartYear);
      where.push('spp.paid_on >= ?');
      params.push(formatYMD(start));
      where.push('spp.paid_on <= ?');
      params.push(formatYMD(end));
    }

    if (monthBounds) {
      where.push('spp.paid_on >= ?');
      params.push(monthBounds.start);
      where.push('spp.paid_on <= ?');
      params.push(monthBounds.end);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows]: any = await connection.query(
      `
        SELECT
          spp.id AS paymentId,
          spp.amount AS amount,
          spp.paid_on AS paidOn,
          spp.notes AS notes,
          spp.created_at AS createdAt,
          sp.id AS stockPurchaseId,
          sp.purchase_date AS purchaseDate,
          sp.supplier_name AS supplierName,
          sp.invoice_number AS invoiceNumber,
          p.name AS productName,
          p.unit AS unit,
          CASE
            WHEN MONTH(spp.paid_on) >= 4 THEN YEAR(spp.paid_on)
            ELSE YEAR(spp.paid_on) - 1
          END AS fyStartYear,
          DATE_FORMAT(spp.paid_on, '%Y-%m') AS monthKey
        FROM stock_purchase_payments spp
        JOIN stock_purchases sp
          ON sp.id COLLATE utf8mb4_general_ci = spp.stock_purchase_id COLLATE utf8mb4_general_ci
        LEFT JOIN products p
          ON p.id COLLATE utf8mb4_general_ci = (
            CASE
              WHEN sp.product_id COLLATE utf8mb4_general_ci IN ('55336', '68539') THEN 'castor-200ml'
              ELSE sp.product_id
            END
          ) COLLATE utf8mb4_general_ci
        ${whereSql}
        ORDER BY spp.paid_on DESC, spp.created_at DESC
        LIMIT ?
      `,
      [...params, limit],
    );

    await connection.end();
    return NextResponse.json(
      {
        payments: rows || [],
        availableFys,
        availableMonths,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('stock-purchase-payments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

