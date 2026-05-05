import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { loanPayments, loans } from '@/db/schema';
import { eq, gte, lte, desc, and } from 'drizzle-orm';

// GET /api/loans/payments - Get all loan payments with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const loanId = searchParams.get('loanId');
    const paymentStatus = searchParams.get('paymentStatus');

    let query = db.select({
      id: loanPayments.id,
      loanId: loanPayments.loanId,
      paymentDate: loanPayments.paymentDate,
      paymentAmount: loanPayments.paymentAmount,
      principalAmount: loanPayments.principalAmount,
      interestAmount: loanPayments.interestAmount,
      outstandingBalance: loanPayments.outstandingBalance,
      paymentMethod: loanPayments.paymentMethod,
      transactionId: loanPayments.transactionId,
      receiptNumber: loanPayments.receiptNumber,
      paymentStatus: loanPayments.paymentStatus,
      lateFee: loanPayments.lateFee,
      notes: loanPayments.notes,
      createdAt: loanPayments.createdAt,
      // Loan details
      loanName: loans.loanName,
      lenderName: loans.lenderName,
      loanType: loans.loanType,
    }).from(loanPayments)
      .leftJoin(loans, eq(loanPayments.loanId, loans.id));

    // Apply filters
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(loanPayments.paymentDate, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(loanPayments.paymentDate, endDate));
    }
    
    if (loanId) {
      conditions.push(eq(loanPayments.loanId, loanId));
    }
    
    if (paymentStatus) {
      conditions.push(eq(loanPayments.paymentStatus, paymentStatus));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const allPayments = await query.orderBy(desc(loanPayments.paymentDate));

    // Calculate summary statistics
    const totalPayments = allPayments.length;
    const totalAmount = allPayments
      .filter(payment => payment.paymentStatus === 'paid')
      .reduce((sum, payment) => sum + parseFloat(payment.paymentAmount), 0);

    const totalPrincipal = allPayments
      .filter(payment => payment.paymentStatus === 'paid')
      .reduce((sum, payment) => sum + parseFloat(payment.principalAmount), 0);

    const totalInterest = allPayments
      .filter(payment => payment.paymentStatus === 'paid')
      .reduce((sum, payment) => sum + parseFloat(payment.interestAmount), 0);

    const totalLateFees = allPayments
      .filter(payment => payment.paymentStatus === 'paid')
      .reduce((sum, payment) => sum + parseFloat(payment.lateFee || '0'), 0);

    // Group payments by month for P&L integration
    const monthlyPayments = allPayments
      .filter(payment => payment.paymentStatus === 'paid')
      .reduce((acc, payment) => {
        const paymentDateValue = payment.paymentDate;
        const month = typeof paymentDateValue === 'string'
          ? paymentDateValue.slice(0, 7)
          : paymentDateValue instanceof Date
            ? paymentDateValue.toISOString().slice(0, 7)
            : String(paymentDateValue).slice(0, 7); // YYYY-MM format
        if (!acc[month]) {
          acc[month] = {
            totalAmount: 0,
            principalAmount: 0,
            interestAmount: 0,
            lateFees: 0,
            count: 0,
          };
        }
        acc[month].totalAmount += parseFloat(payment.paymentAmount);
        acc[month].principalAmount += parseFloat(payment.principalAmount);
        acc[month].interestAmount += parseFloat(payment.interestAmount);
        acc[month].lateFees += parseFloat(payment.lateFee || '0');
        acc[month].count += 1;
        return acc;
      }, {} as Record<string, any>);

    return NextResponse.json({
      payments: allPayments,
      summary: {
        totalPayments,
        totalAmount,
        totalPrincipal,
        totalInterest,
        totalLateFees,
      },
      monthlyBreakdown: monthlyPayments,
    });

  } catch (error) {
    console.error('Error fetching loan payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
