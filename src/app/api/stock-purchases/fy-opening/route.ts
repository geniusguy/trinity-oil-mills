import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';
import { ensureStockPurchaseFyOpeningTable } from '@/lib/stockPurchaseFyOpeningDb';

const ROLES = ['admin', 'retail_staff', 'accountant'];

function canAccess(role: string | undefined) {
  return role && ROLES.includes(role);
}

// GET ?fyStartYear=2025
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let fyStartYear = Number(new URL(request.url).searchParams.get('fyStartYear') || '');
    if (!Number.isFinite(fyStartYear) || fyStartYear < 2000 || fyStartYear > 2100) {
      return NextResponse.json({ error: 'Invalid fyStartYear' }, { status: 400 });
    }

    const connection = await createConnection();
    await ensureStockPurchaseFyOpeningTable(connection);

    const [rows] = await connection.query(
      `SELECT fy_start_year as fyStartYear,
              opening_balance_payable as openingBalancePayable,
              notes,
              updated_at as updatedAt
       FROM stock_purchase_fy_opening
       WHERE fy_start_year = ?
       LIMIT 1`,
      [fyStartYear]
    );

    await connection.end();

    const row = Array.isArray(rows) && rows.length ? (rows as any[])[0] : null;
    return NextResponse.json(
      {
        fyStartYear,
        openingBalancePayable: row ? Number(row.openingBalancePayable) || 0 : 0,
        notes: row?.notes ?? '',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('fy-opening GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT { fyStartYear, openingBalancePayable, notes? }
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !canAccess(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const fyStartYear = Number(body?.fyStartYear);
    const openingBalancePayable = Number(body?.openingBalancePayable);
    const notes = body?.notes != null ? String(body.notes).slice(0, 500) : null;

    if (!Number.isFinite(fyStartYear) || fyStartYear < 2000 || fyStartYear > 2100) {
      return NextResponse.json({ error: 'Invalid fyStartYear' }, { status: 400 });
    }
    if (!Number.isFinite(openingBalancePayable) || openingBalancePayable < 0) {
      return NextResponse.json({ error: 'Invalid openingBalancePayable' }, { status: 400 });
    }

    const connection = await createConnection();
    await ensureStockPurchaseFyOpeningTable(connection);

    await connection.query(
      `INSERT INTO stock_purchase_fy_opening (fy_start_year, opening_balance_payable, notes)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         opening_balance_payable = VALUES(opening_balance_payable),
         notes = VALUES(notes)`,
      [fyStartYear, openingBalancePayable.toFixed(2), notes]
    );

    await connection.end();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('fy-opening PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
