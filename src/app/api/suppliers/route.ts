import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { ensureSuppliersTable } from '@/lib/suppliersDb';

const ROLES = ['admin', 'accountant', 'retail_staff'];

function isAllowed(role: string | undefined) {
  return !!role && ROLES.includes(role);
}

// GET /api/suppliers
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAllowed(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const q = new URL(request.url).searchParams.get('q')?.trim() || '';
    const connection = await createConnection();
    await ensureSuppliersTable(connection);
    await connection.execute(
      `INSERT IGNORE INTO suppliers (id, name, created_by)
       SELECT
         CONCAT('sup-mig-', LOWER(HEX(MD5(TRIM(sp.supplier_name))))),
         TRIM(sp.supplier_name),
         NULL
       FROM stock_purchases sp
       WHERE TRIM(COALESCE(sp.supplier_name, '')) <> ''`
    );

    const where: string[] = [];
    const params: unknown[] = [];
    if (q) {
      where.push('(s.name LIKE ? OR s.supplier_type LIKE ? OR s.contact_number LIKE ? OR s.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await connection.query(
      `SELECT
        s.id,
        s.name,
        s.supplier_type as supplierType,
        s.contact_number as contactNumber,
        s.email,
        COALESCE(month_pay.this_month_paid, 0) as thisMonthPaid,
        COALESCE(remaining.remaining_amount, 0) as remainingAmountToPay
      FROM suppliers s
      LEFT JOIN (
        SELECT
          sp.supplier_name COLLATE utf8mb4_general_ci as supplier_name,
          COALESCE(SUM(pay.amount), 0) as this_month_paid
        FROM stock_purchase_payments pay
        JOIN stock_purchases sp ON sp.id COLLATE utf8mb4_general_ci = pay.stock_purchase_id COLLATE utf8mb4_general_ci
        WHERE DATE(pay.paid_on) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
          AND DATE(pay.paid_on) <= LAST_DAY(CURDATE())
        GROUP BY sp.supplier_name
      ) month_pay ON month_pay.supplier_name COLLATE utf8mb4_general_ci = s.name COLLATE utf8mb4_general_ci
      LEFT JOIN (
        SELECT
          sp.supplier_name COLLATE utf8mb4_general_ci as supplier_name,
          ROUND(
            COALESCE(SUM(CAST(sp.total_amount AS DECIMAL(14,2))), 0)
            - COALESCE(SUM(pay2.total_paid), 0),
            2
          ) as remaining_amount
        FROM stock_purchases sp
        LEFT JOIN (
          SELECT stock_purchase_id, COALESCE(SUM(amount), 0) as total_paid
          FROM stock_purchase_payments
          GROUP BY stock_purchase_id
        ) pay2 ON pay2.stock_purchase_id COLLATE utf8mb4_general_ci = sp.id COLLATE utf8mb4_general_ci
        GROUP BY sp.supplier_name
      ) remaining ON remaining.supplier_name COLLATE utf8mb4_general_ci = s.name COLLATE utf8mb4_general_ci
      ${whereSql}
      ORDER BY s.name ASC`,
      params
    );

    await connection.end();
    return NextResponse.json({ suppliers: rows }, { status: 200 });
  } catch (error) {
    console.error('Suppliers GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/suppliers
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAllowed(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();

    const name = String(body?.name || '').trim();
    const supplierType = body?.supplierType ? String(body.supplierType).trim() : null;
    const contactNumber = body?.contactNumber ? String(body.contactNumber).trim() : null;
    const email = body?.email ? String(body.email).trim() : null;

    if (!name) return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });

    const connection = await createConnection();
    await ensureSuppliersTable(connection);

    const id = `sup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await connection.execute(
      `INSERT INTO suppliers (id, name, supplier_type, contact_number, email, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, supplierType, contactNumber, email, session.user.id || null]
    );
    await connection.end();
    return NextResponse.json({ id, message: 'Supplier created' }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.toLowerCase().includes('duplicate')) {
      return NextResponse.json({ error: 'Supplier name already exists' }, { status: 409 });
    }
    console.error('Suppliers POST error:', error);
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}
