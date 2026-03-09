import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { expenses } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const body = await request.json();
    const { category, amount, description, expenseDate, paymentMethod, receiptNumber } = body;
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!category || !amount || !description || !expenseDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: category, amount, description, expenseDate' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Update expense in database
    await db
      .update(expenses)
      .set({
        category,
        amount: parseFloat(amount),
        description,
        expenseDate: new Date(expenseDate),
        paymentMethod: paymentMethod || 'cash',
        receiptNumber: receiptNumber || null,
        updatedAt: new Date()
      })
      .where(eq(expenses.id, id));

    // Return updated expense data
    const updatedExpense = {
      id,
      category,
      amount: parseFloat(amount),
      description,
      expenseDate,
      paymentMethod: paymentMethod || 'cash',
      receiptNumber: receiptNumber || null,
      userId: session?.user?.id || 'user_admin_001',
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully',
      data: updatedExpense
    });

  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    // Delete expense from database
    await db
      .delete(expenses)
      .where(eq(expenses.id, id));

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
