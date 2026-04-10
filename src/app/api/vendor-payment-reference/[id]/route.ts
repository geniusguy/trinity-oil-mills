import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { ensureVendorPaymentReferenceTables } from '@/lib/vendorPaymentReferenceDb';

const ROLES = ['admin', 'accountant', 'retail_staff'];
const canAccess = (role?: string) => Boolean(role && ROLES.includes(role));

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const connection = await createConnection();
    await ensureVendorPaymentReferenceTables(connection);

    await connection.execute(
      `UPDATE vendor_payment_reference
       SET entry_type = ?, vendor_name = ?, product_name = ?, tins_count = ?, purchased_date = ?, payment_date = ?,
           purchased_amount = ?, paid_amount = ?, payment_type = ?, payment_events = ?, notes = ?, fy_start_year = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        String(body.entryType || 'purchase'),
        String(body.vendorName || ''),
        String(body.productName || ''),
        Number(body.tinsCount || 0),
        body.purchasedDate ? String(body.purchasedDate) : null,
        body.paymentDate ? String(body.paymentDate) : null,
        Number(body.purchasedAmount || 0),
        Number(body.paidAmount || 0),
        String(body.paymentType || 'full'),
        JSON.stringify(Array.isArray(body.paymentEvents) ? body.paymentEvents : []),
        body.notes ? String(body.notes) : null,
        Number(body.fyStartYear || 0),
        String(id),
      ],
    );
    await connection.end();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('vendor-payment-reference PUT:', error);
    return NextResponse.json({ success: false, error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const connection = await createConnection();
    await ensureVendorPaymentReferenceTables(connection);
    await connection.execute('DELETE FROM vendor_payment_reference WHERE id = ?', [String(id)]);
    await connection.end();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('vendor-payment-reference DELETE:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete entry' }, { status: 500 });
  }
}

