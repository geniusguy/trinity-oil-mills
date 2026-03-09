import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { savingsInvestments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const updateData: any = {};
    
    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = amount.toString();
    if (currentValue !== undefined) updateData.currentValue = currentValue ? currentValue.toString() : null;
    if (investmentDate !== undefined) updateData.investmentDate = new Date(investmentDate);
    if (maturityDate !== undefined) updateData.maturityDate = maturityDate ? new Date(maturityDate) : null;
    if (interestRate !== undefined) updateData.interestRate = interestRate ? interestRate.toString() : null;
    if (institution !== undefined) updateData.institution = institution;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    if (status !== undefined) updateData.status = status;

    await db
      .update(savingsInvestments)
      .set(updateData)
      .where(eq(savingsInvestments.id, params.id));

    return NextResponse.json({
      success: true,
      message: 'Savings/Investment updated successfully'
    });
  } catch (error) {
    console.error('Error updating savings/investment:', error);
    return NextResponse.json(
      { error: 'Failed to update savings/investment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db
      .delete(savingsInvestments)
      .where(eq(savingsInvestments.id, params.id));

    return NextResponse.json({
      success: true,
      message: 'Savings/Investment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting savings/investment:', error);
    return NextResponse.json(
      { error: 'Failed to delete savings/investment' },
      { status: 500 }
    );
  }
}
