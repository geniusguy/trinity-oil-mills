import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { ensureVendorPaymentReferenceTables } from '@/lib/vendorPaymentReferenceDb';

const ROLES = ['admin', 'accountant', 'retail_staff'];
const canAccess = (role?: string) => Boolean(role && ROLES.includes(role));

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const fyStartYear = Number(body.fyStartYear || 0);
    const previousBalance = Number(body.previousBalance || 0);
    if (!Number.isFinite(fyStartYear) || fyStartYear < 2000) {
      return NextResponse.json({ success: false, error: 'Invalid fyStartYear' }, { status: 400 });
    }
    if (!Number.isFinite(previousBalance) || previousBalance < 0) {
      return NextResponse.json({ success: false, error: 'Invalid previousBalance' }, { status: 400 });
    }

    const connection = await createConnection();
    await ensureVendorPaymentReferenceTables(connection);
    await connection.execute(
      `INSERT INTO vendor_payment_reference_fy_balance (fy_start_year, previous_balance, updated_by, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE previous_balance = VALUES(previous_balance), updated_by = VALUES(updated_by), updated_at = NOW()`,
      [fyStartYear, previousBalance, session.user.id || null],
    );
    await connection.end();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('vendor-payment-reference fy-balance PUT:', error);
    return NextResponse.json({ success: false, error: 'Failed to save FY previous balance' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const fyStartYear = Number(searchParams.get('fyStartYear') || 0);
    if (!Number.isFinite(fyStartYear) || fyStartYear < 2000) {
      return NextResponse.json({ success: false, error: 'Invalid fyStartYear' }, { status: 400 });
    }
    const connection = await createConnection();
    await ensureVendorPaymentReferenceTables(connection);
    await connection.execute('DELETE FROM vendor_payment_reference_fy_balance WHERE fy_start_year = ?', [fyStartYear]);
    await connection.end();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('vendor-payment-reference fy-balance DELETE:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete FY previous balance' }, { status: 500 });
  }
}

