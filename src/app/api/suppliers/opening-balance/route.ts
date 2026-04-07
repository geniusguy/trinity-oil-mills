import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { ensureSuppliersTable } from '@/lib/suppliersDb';
import { ensureSupplierFyOpeningTable } from '@/lib/supplierFyOpeningDb';

const ROLES = ['admin', 'accountant', 'retail_staff'];
const isAllowed = (role?: string) => !!role && ROLES.includes(role);

// GET /api/suppliers/opening-balance?supplierName=...&fyStartYear=2024
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAllowed(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const supplierName = String(searchParams.get('supplierName') || '').trim();
    const fyStartYear = Number(searchParams.get('fyStartYear') || '');
    if (!supplierName) return NextResponse.json({ error: 'supplierName is required' }, { status: 400 });
    if (!Number.isFinite(fyStartYear) || fyStartYear < 2000 || fyStartYear > 2100) {
      return NextResponse.json({ error: 'Invalid fyStartYear' }, { status: 400 });
    }

    const connection = await createConnection();
    await ensureSuppliersTable(connection);
    await ensureSupplierFyOpeningTable(connection);

    const [rows]: any = await connection.query(
      `SELECT opening_balance_payable as openingBalancePayable, notes
       FROM supplier_fy_opening_balance
       WHERE supplier_name COLLATE utf8mb4_general_ci = ? COLLATE utf8mb4_general_ci
         AND fy_start_year = ?
       LIMIT 1`,
      [supplierName, fyStartYear]
    );
    await connection.end();
    const row = rows?.[0];
    return NextResponse.json(
      {
        supplierName,
        fyStartYear,
        openingBalancePayable: row ? Number(row.openingBalancePayable) || 0 : 0,
        notes: row?.notes || '',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('supplier opening-balance GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/suppliers/opening-balance
// { supplierName, fyStartYear, openingBalancePayable, notes? }
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAllowed(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const supplierName = String(body?.supplierName || '').trim();
    const fyStartYear = Number(body?.fyStartYear);
    const openingBalancePayable = Number(body?.openingBalancePayable);
    const notes = body?.notes != null ? String(body.notes).slice(0, 500) : null;
    if (!supplierName) return NextResponse.json({ error: 'supplierName is required' }, { status: 400 });
    if (!Number.isFinite(fyStartYear) || fyStartYear < 2000 || fyStartYear > 2100) {
      return NextResponse.json({ error: 'Invalid fyStartYear' }, { status: 400 });
    }
    if (!Number.isFinite(openingBalancePayable) || openingBalancePayable < 0) {
      return NextResponse.json({ error: 'Invalid openingBalancePayable' }, { status: 400 });
    }

    const connection = await createConnection();
    await ensureSuppliersTable(connection);
    await ensureSupplierFyOpeningTable(connection);

    await connection.query(
      `INSERT INTO supplier_fy_opening_balance (supplier_name, fy_start_year, opening_balance_payable, notes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         opening_balance_payable = VALUES(opening_balance_payable),
         notes = VALUES(notes)`,
      [supplierName, fyStartYear, openingBalancePayable.toFixed(2), notes]
    );
    await connection.end();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('supplier opening-balance PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

