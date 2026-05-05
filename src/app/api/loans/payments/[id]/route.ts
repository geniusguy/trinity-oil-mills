import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { loans, loanPayments } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

/** Avoid dev/build trying to pre-render static paths for this handler (can fail JSON.parse on stale manifests). */
export const dynamic = 'force-dynamic';

function paymentDateToString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value).slice(0, 10);
}

async function rebuildLoanAfterPaymentMutation(loanId: string) {
  const loan = await db.query.loans.findFirst({
    where: eq(loans.id, loanId),
  });
  if (!loan) return;

  const payments = await db.query.loanPayments.findMany({
    where: eq(loanPayments.loanId, loanId),
    orderBy: [asc(loanPayments.paymentDate), asc(loanPayments.createdAt)],
  });

  let running = parseFloat(loan.principalAmount);
  for (const p of payments) {
    running -= parseFloat(p.principalAmount);
    const ob = Math.max(running, 0).toFixed(2);
    await db
      .update(loanPayments)
      .set({ outstandingBalance: ob, updatedAt: new Date() })
      .where(eq(loanPayments.id, p.id));
  }

  const totalPrincipalPaid = payments.reduce(
    (s, p) => s + parseFloat(p.principalAmount),
    0
  );
  const remaining = Math.max(
    parseFloat(loan.principalAmount) - totalPrincipalPaid,
    0
  );

  const last = payments[payments.length - 1];
  let nextPaymentDate: string | null = null;
  if (remaining > 0) {
    if (last) {
      const d = new Date(paymentDateToString(last.paymentDate));
      d.setMonth(d.getMonth() + 1);
      nextPaymentDate = d.toISOString().split('T')[0];
    } else {
      nextPaymentDate = loan.nextPaymentDate ?? null;
    }
  }

  await db
    .update(loans)
    .set({
      remainingBalance: remaining.toFixed(2),
      status: remaining <= 0 ? 'closed' : 'active',
      nextPaymentDate,
      updatedAt: new Date(),
    })
    .where(eq(loans.id, loanId));
}

function parseBodyDecimal(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

// PATCH /api/loans/payments/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'accountant'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id: paymentId } = await params;
    const existing = await db.query.loanPayments.findFirst({
      where: eq(loanPayments.id, paymentId),
    });
    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const body = await request.json();
    const paymentDate = body.paymentDate ?? paymentDateToString(existing.paymentDate);
    const paymentAmount =
      parseBodyDecimal(body.paymentAmount) ?? parseFloat(existing.paymentAmount);
    const principalAmount =
      parseBodyDecimal(body.principalAmount) ?? parseFloat(existing.principalAmount);
    const interestAmount =
      parseBodyDecimal(body.interestAmount) ?? parseFloat(existing.interestAmount);
    const paymentMethod = body.paymentMethod ?? existing.paymentMethod;
    const transactionId =
      body.transactionId !== undefined ? body.transactionId : existing.transactionId;
    const receiptNumber =
      body.receiptNumber !== undefined ? body.receiptNumber : existing.receiptNumber;
    const lateFee =
      parseBodyDecimal(body.lateFee) ?? parseFloat(existing.lateFee || '0');
    const notes = body.notes !== undefined ? body.notes : existing.notes;

    if (!paymentDate || paymentAmount < 0 || principalAmount < 0 || interestAmount < 0) {
      return NextResponse.json({ error: 'Invalid payment fields' }, { status: 400 });
    }

    const loan = await db.query.loans.findFirst({
      where: eq(loans.id, existing.loanId),
    });
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const siblingRows = await db
      .select({
        id: loanPayments.id,
        principalAmount: loanPayments.principalAmount,
      })
      .from(loanPayments)
      .where(eq(loanPayments.loanId, existing.loanId));

    const sumOthers = siblingRows
      .filter((row) => row.id !== paymentId)
      .reduce((s, row) => s + parseFloat(row.principalAmount), 0);

    const totalPrincipal = sumOthers + principalAmount;
    if (totalPrincipal > parseFloat(loan.principalAmount) + 0.001) {
      return NextResponse.json(
        { error: 'Total principal repaid cannot exceed original principal' },
        { status: 400 }
      );
    }

    await db
      .update(loanPayments)
      .set({
        paymentDate,
        paymentAmount: paymentAmount.toFixed(2),
        principalAmount: principalAmount.toFixed(2),
        interestAmount: interestAmount.toFixed(2),
        paymentMethod,
        transactionId: transactionId || null,
        receiptNumber: receiptNumber || null,
        lateFee: lateFee.toFixed(2),
        notes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(loanPayments.id, paymentId));

    await rebuildLoanAfterPaymentMutation(existing.loanId);

    return NextResponse.json({ message: 'Payment updated successfully' });
  } catch (error) {
    console.error('Error updating loan payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/loans/payments/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'accountant'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id: paymentId } = await params;
    const existing = await db.query.loanPayments.findFirst({
      where: eq(loanPayments.id, paymentId),
    });
    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const loanId = existing.loanId;
    await db.delete(loanPayments).where(eq(loanPayments.id, paymentId));
    await rebuildLoanAfterPaymentMutation(loanId);

    return NextResponse.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting loan payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
