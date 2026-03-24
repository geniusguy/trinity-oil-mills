import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { courierExpenses } from '@/db/schema';
import { eq } from 'drizzle-orm';

const ROLES = ['admin', 'accountant'] as const;

function canAccess(role: string | undefined) {
  return role && ROLES.includes(role as (typeof ROLES)[number]);
}

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
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    const body = await request.json();
    const {
      courierDate,
      quantity,
      cost,
      gstRate,
      gstAmount,
      canteenAddressId,
      destinationNote,
      notes,
      paymentMethod,
      referenceNo,
      referencePdfPath,
      referencePdfOriginalName,
    } = body as Record<string, unknown>;

    if (!courierDate || String(courierDate).trim() === '') {
      return NextResponse.json({ success: false, error: 'Courier date is required' }, { status: 400 });
    }

    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty < 0) {
      return NextResponse.json({ success: false, error: 'Quantity must be zero or positive' }, { status: 400 });
    }

    const costNum = Number(cost);
    if (Number.isNaN(costNum) || costNum <= 0) {
      return NextResponse.json({ success: false, error: 'Cost must be greater than 0' }, { status: 400 });
    }

    const gstRateNum =
      gstRate == null || String(gstRate).trim() === '' ? 0 : Number(gstRate);
    if (Number.isNaN(gstRateNum) || gstRateNum < 0) {
      return NextResponse.json({ success: false, error: 'GST rate must be 0 or positive' }, { status: 400 });
    }

    const gstAmountNum =
      gstAmount == null || String(gstAmount).trim() === '' ? (costNum * gstRateNum) / 100 : Number(gstAmount);
    if (Number.isNaN(gstAmountNum) || gstAmountNum < 0) {
      return NextResponse.json({ success: false, error: 'GST amount must be 0 or positive' }, { status: 400 });
    }

    // Intra-state split: GST = CGST + SGST (typically 50/50 for standard CGST/SGST bills).
    const cgstAmountNum = Math.round((gstAmountNum / 2) * 100) / 100;
    const sgstAmountNum = Math.round((gstAmountNum - cgstAmountNum) * 100) / 100;

    const cantId = canteenAddressId && String(canteenAddressId).trim() ? String(canteenAddressId).trim() : null;
    const dest = destinationNote != null ? String(destinationNote).trim() : '';
    if (!cantId && !dest) {
      return NextResponse.json(
        { success: false, error: 'Select a canteen or enter destination / address note' },
        { status: 400 },
      );
    }

    await db
      .update(courierExpenses)
      .set({
        courierDate: String(courierDate).slice(0, 10),
        quantity: String(qty),
        cost: String(costNum),
        gstRate: String(gstRateNum),
        gstAmount: String(gstAmountNum),
        cgstAmount: String(cgstAmountNum),
        sgstAmount: String(sgstAmountNum),
        canteenAddressId: cantId,
        destinationNote: dest || null,
        notes: notes != null && String(notes).trim() ? String(notes).trim() : null,
        paymentMethod: (paymentMethod && String(paymentMethod)) || 'cash',
        referenceNo: referenceNo != null && String(referenceNo).trim() ? String(referenceNo).trim() : null,
        referencePdfPath:
          referencePdfPath != null && String(referencePdfPath).trim() ? String(referencePdfPath).trim() : null,
        referencePdfOriginalName:
          referencePdfOriginalName != null && String(referencePdfOriginalName).trim()
            ? String(referencePdfOriginalName).trim()
            : null,
        updatedAt: new Date(),
      })
      .where(eq(courierExpenses.id, id));

    return NextResponse.json({ success: true, message: 'Updated' });
  } catch (error) {
    console.error('courier-expenses PUT:', error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
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
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    await db.delete(courierExpenses).where(eq(courierExpenses.id, id));

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('courier-expenses DELETE:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
