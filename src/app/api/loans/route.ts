import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { loans } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET /api/loans - Get all loans
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // active, closed, defaulted
    const loanType = searchParams.get('loanType');

    let query = db.select({
      id: loans.id,
      loanName: loans.loanName,
      lenderName: loans.lenderName,
      loanType: loans.loanType,
      principalAmount: loans.principalAmount,
      interestRate: loans.interestRate,
      tenure: loans.tenure,
      emiAmount: loans.emiAmount,
      startDate: loans.startDate,
      endDate: loans.endDate,
      status: loans.status,
      remainingBalance: loans.remainingBalance,
      nextPaymentDate: loans.nextPaymentDate,
      purpose: loans.purpose,
      createdAt: loans.createdAt,
      updatedAt: loans.updatedAt,
    }).from(loans);

    // Apply filters
    if (status) {
      query = query.where(eq(loans.status, status));
    }
    if (loanType) {
      query = query.where(eq(loans.loanType, loanType));
    }

    const allLoans = await query.orderBy(desc(loans.createdAt));

    // Calculate summary statistics
    const totalLoans = allLoans.length;
    const activeLoans = allLoans.filter(loan => loan.status === 'active').length;
    const totalPrincipal = allLoans.reduce((sum, loan) => sum + parseFloat(loan.principalAmount), 0);
    const totalOutstanding = allLoans
      .filter(loan => loan.status === 'active')
      .reduce((sum, loan) => sum + parseFloat(loan.remainingBalance), 0);

    const monthlyEMI = allLoans
      .filter(loan => loan.status === 'active')
      .reduce((sum, loan) => sum + parseFloat(loan.emiAmount), 0);

    return NextResponse.json({
      loans: allLoans,
      summary: {
        totalLoans,
        activeLoans,
        totalPrincipal,
        totalOutstanding,
        monthlyEMI,
      }
    });

  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/loans - Create a new loan
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or accountant role
    if (!['admin', 'accountant'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      loanName,
      lenderName,
      loanType,
      principalAmount,
      interestRate,
      tenure,
      emiAmount,
      startDate,
      endDate,
      accountNumber,
      ifscCode,
      collateral,
      purpose,
      notes
    } = body;

    // Validate required fields
    if (!loanName || !lenderName || !loanType || !principalAmount || !interestRate || !tenure || !emiAmount || !startDate || !endDate || !purpose) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const loanId = uuidv4();
    
    // Calculate next payment date (typically one month from start date)
    const nextPaymentDate = new Date(startDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const newLoan = await db.insert(loans).values({
      id: loanId,
      loanName,
      lenderName,
      loanType,
      principalAmount: principalAmount.toString(),
      interestRate: interestRate.toString(),
      tenure: parseInt(tenure),
      emiAmount: emiAmount.toString(),
      startDate,
      endDate,
      accountNumber: accountNumber || null,
      ifscCode: ifscCode || null,
      collateral: collateral || null,
      purpose,
      status: 'active',
      remainingBalance: principalAmount.toString(), // Initially equal to principal
      nextPaymentDate: nextPaymentDate.toISOString().split('T')[0],
      notes: notes || null,
      createdBy: session.user.id,
    });

    return NextResponse.json({ 
      message: 'Loan created successfully', 
      loanId 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
