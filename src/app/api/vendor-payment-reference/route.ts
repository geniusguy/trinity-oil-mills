import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { ensureVendorPaymentReferenceTables } from '@/lib/vendorPaymentReferenceDb';

const ROLES = ['admin', 'accountant', 'retail_staff'];
const canAccess = (role?: string) => Boolean(role && ROLES.includes(role));
const PAYMENT_TYPES = new Set(['full', 'partial', 'pending']);
const normalizePaymentType = (value: unknown): 'full' | 'partial' | 'pending' => {
  const normalized = String(value || 'full').trim().toLowerCase();
  return PAYMENT_TYPES.has(normalized) ? (normalized as 'full' | 'partial' | 'pending') : 'full';
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await createConnection();
    await ensureVendorPaymentReferenceTables(connection);

    const [entryRows]: any = await connection.query(
      `SELECT id, entry_type AS entryType, vendor_name AS vendorName, product_name AS productName,
              tins_count AS tinsCount, purchased_date AS purchasedDate, payment_date AS paymentDate,
              purchased_amount AS purchasedAmount, paid_amount AS paidAmount, payment_type AS paymentType,
              payment_events AS paymentEvents, notes, fy_start_year AS fyStartYear, created_at AS createdAt
       FROM vendor_payment_reference
       ORDER BY created_at DESC`,
    );
    const [balRows]: any = await connection.query(
      `SELECT fy_start_year AS fyStartYear, previous_balance AS previousBalance
       FROM vendor_payment_reference_fy_balance
       ORDER BY fy_start_year DESC`,
    );
    await connection.end();

    return NextResponse.json({
      success: true,
      entries: (entryRows || []).map((r: any) => ({
        ...r,
        paymentEvents: (() => {
          try {
            const parsed = JSON.parse(String(r.paymentEvents || '[]'));
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
      })),
      fyBalances: balRows || [],
    });
  } catch (error) {
    console.error('vendor-payment-reference GET:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch vendor payment references' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const id = `vpr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const paymentType = normalizePaymentType(body.paymentType);
    const connection = await createConnection();
    await ensureVendorPaymentReferenceTables(connection);

    await connection.execute(
      `INSERT INTO vendor_payment_reference
       (id, entry_type, vendor_name, product_name, tins_count, purchased_date, payment_date,
        purchased_amount, paid_amount, payment_type, payment_events, notes, fy_start_year, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        String(body.entryType || 'purchase'),
        String(body.vendorName || ''),
        String(body.productName || ''),
        Number(body.tinsCount || 0),
        body.purchasedDate ? String(body.purchasedDate) : null,
        body.paymentDate ? String(body.paymentDate) : null,
        Number(body.purchasedAmount || 0),
        Number(body.paidAmount || 0),
        paymentType,
        JSON.stringify(Array.isArray(body.paymentEvents) ? body.paymentEvents : []),
        body.notes ? String(body.notes) : null,
        Number(body.fyStartYear || 0),
        session.user.id || null,
      ],
    );
    await connection.end();

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('vendor-payment-reference POST:', error);
    return NextResponse.json({ success: false, error: 'Failed to create entry' }, { status: 500 });
  }
}

