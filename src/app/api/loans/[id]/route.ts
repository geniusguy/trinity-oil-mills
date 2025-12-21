import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db/db';
import { loans, loanPayments } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/loans/[id] - Get a specific loan with its payment history
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

    // Get loan details
    const loan = await db.query.loans.findFirst({
      where: eq(loans.id, loanId),
      with: {
        createdByUser: {
          columns: {
            name: true,
            email: true,
          }
        }
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Get payment history for this loan
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

    // Calculate payment statistics
    const totalPaid = payments
      .filter(payment => payment.paymentStatus === 'paid')
      .reduce((sum, payment) => sum + parseFloat(payment.paymentAmount), 0);

    const totalInterestPaid = payments
      .filter(payment => payment.paymentStatus === 'paid')
      .reduce((sum, payment) => sum + parseFloat(payment.interestAmount), 0);

    const totalPrincipalPaid = payments
      .filter(payment => payment.paymentStatus === 'paid')
      .reduce((sum, payment) => sum + parseFloat(payment.principalAmount), 0);

    const paymentsCount = payments.filter(payment => payment.paymentStatus === 'paid').length;
    const remainingPayments = loan.tenure - paymentsCount;

    return NextResponse.json({
      loan,
      payments,
      paymentStats: {
        totalPaid,
        totalInterestPaid,
        totalPrincipalPaid,
        paymentsCount,
        remainingPayments,
        paymentProgress: (paymentsCount / loan.tenure) * 100,
      }
    });

  } catch (error) {
    console.error('Error fetching loan details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/loans/[id] - Update a loan
export async function PUT(
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

    // Check if loan exists
    const existingLoan = await db.query.loans.findFirst({
      where: eq(loans.id, loanId)
    });

    if (!existingLoan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Update the loan
    await db.update(loans)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(loans.id, loanId));

    return NextResponse.json({ message: 'Loan updated successfully' });

  } catch (error) {
    console.error('Error updating loan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/loans/[id] - Delete a loan (only if no payments made)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const loanId = params.id;

    // Check if loan exists
    const existingLoan = await db.query.loans.findFirst({
      where: eq(loans.id, loanId)
    });

    if (!existingLoan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Check if there are any payments for this loan
    const paymentsExist = await db.query.loanPayments.findFirst({
      where: eq(loanPayments.loanId, loanId)
    });

    if (paymentsExist) {
      return NextResponse.json({ 
        error: 'Cannot delete loan with existing payments. Mark as closed instead.' 
      }, { status: 400 });
    }

    // Delete the loan
    await db.delete(loans).where(eq(loans.id, loanId));

    return NextResponse.json({ message: 'Loan deleted successfully' });

  } catch (error) {
    console.error('Error deleting loan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
