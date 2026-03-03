import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { savingsInvestments } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await db
      .select()
      .from(savingsInvestments)
      .orderBy(desc(savingsInvestments.createdAt));

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching savings/investments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch savings/investments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      title,
      description,
      amount,
      currentValue,
      investmentDate,
      maturityDate,
      interestRate,
      institution,
      accountNumber,
      status
    } = body;

    // Validate required fields
    if (!type || !title || !amount || !investmentDate) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, amount, investmentDate' },
        { status: 400 }
      );
    }

    const id = `si-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newSavingsInvestment = {
      id,
      type,
      title,
      description: description || null,
      amount: amount.toString(),
      currentValue: currentValue ? currentValue.toString() : null,
      investmentDate: new Date(investmentDate),
      maturityDate: maturityDate ? new Date(maturityDate) : null,
      interestRate: interestRate ? interestRate.toString() : null,
      institution: institution || null,
      accountNumber: accountNumber || null,
      status: status || 'active',
      userId: session.user.id,
    };

    await db.insert(savingsInvestments).values(newSavingsInvestment);

    return NextResponse.json({
      success: true,
      data: newSavingsInvestment
    });
  } catch (error) {
    console.error('Error creating savings/investment:', error);
    return NextResponse.json(
      { error: 'Failed to create savings/investment' },
      { status: 500 }
    );
  }
}
