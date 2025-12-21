import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db/db';
import { loans, loanPayments } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET /api/loans/[id]/payments - Get all payments for a specific loan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loanId = params.id;

    // Verify loan exists
    const loan = await db.query.loans.findFirst({
      where: eq(loans.id, loanId)
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Get all payments for this loan
    const payments = await db.query.loanPayments.findMany({
      where: eq(loanPayments.loanId, loanId),
      orderBy: [desc(loanPayments.paymentDate)],
      with: {
        createdByUser: {
          columns: {
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json({ payments });

  } catch (error) {
    console.error('Error fetching loan payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/loans/[id]/payments - Record a new loan payment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or accountant role
    if (!['admin', 'accountant'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const loanId = params.id;
    const body = await request.json();
    const {
      paymentDate,
      paymentAmount,
      principalAmount,
      interestAmount,
      paymentMethod,
      transactionId,
      receiptNumber,
      lateFee = 0,
      notes
    } = body;

    // Validate required fields
    if (!paymentDate || !paymentAmount || !principalAmount || !interestAmount) {
      return NextResponse.json({ error: 'Missing required payment fields' }, { status: 400 });
    }

    // Verify loan exists and is active
    const loan = await db.query.loans.findFirst({
      where: eq(loans.id, loanId)
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    if (loan.status !== 'active') {
      return NextResponse.json({ error: 'Cannot add payment to inactive loan' }, { status: 400 });
    }

    // Calculate new outstanding balance
    const currentBalance = parseFloat(loan.remainingBalance);
    const newBalance = currentBalance - parseFloat(principalAmount);
    
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Payment amount exceeds remaining balance' }, { status: 400 });
    }

    const paymentId = uuidv4();

    // Insert the payment record
    await db.insert(loanPayments).values({
      id: paymentId,
      loanId,
      paymentDate,
      paymentAmount: paymentAmount.toString(),
      principalAmount: principalAmount.toString(),
      interestAmount: interestAmount.toString(),
      outstandingBalance: newBalance.toString(),
      paymentMethod: paymentMethod || 'bank_transfer',
      transactionId: transactionId || null,
      receiptNumber: receiptNumber || null,
      paymentStatus: 'paid',
      lateFee: lateFee.toString(),
      notes: notes || null,
      createdBy: session.user.id,
    });

    // Update loan's remaining balance and next payment date
    const nextPaymentDate = new Date(paymentDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const updateData: any = {
      remainingBalance: newBalance.toString(),
      nextPaymentDate: nextPaymentDate.toISOString().split('T')[0],
      updatedAt: new Date(),
    };

    // If balance is zero, mark loan as closed
    if (newBalance === 0) {
      updateData.status = 'closed';
      updateData.nextPaymentDate = null;
    }

    await db.update(loans)
      .set(updateData)
      .where(eq(loans.id, loanId));

    return NextResponse.json({ 
      message: 'Payment recorded successfully',
      paymentId,
      newBalance,
      loanStatus: newBalance === 0 ? 'closed' : 'active'
    }, { status: 201 });

  } catch (error) {
    console.error('Error recording loan payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
