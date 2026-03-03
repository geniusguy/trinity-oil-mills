import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { expenses } from '@/db/schema';
import { desc, eq, and, gte, lte, like } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    
    if (search) {
      conditions.push(like(expenses.description, `%${search}%`));
    }
    
    if (category) {
      conditions.push(eq(expenses.category, category));
    }
    
    if (startDate) {
      conditions.push(gte(expenses.expenseDate, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(expenses.expenseDate, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get expenses with pagination
    const expensesList = await db
      .select()
      .from(expenses)
      .where(whereClause)
      .orderBy(desc(expenses.expenseDate))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: expensesList,
      pagination: {
        page,
        limit,
        total: expensesList.length,
        pages: Math.ceil(expensesList.length / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const { category, amount, description, expenseDate, paymentMethod, receiptNumber } = body;

    // Validate required fields
    if (!category || !amount || !description || !expenseDate) {
      return NextResponse.json(
        { error: 'Missing required fields: category, amount, description, expenseDate' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Create new expense in database
    const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db
      .insert(expenses)
      .values({
        id: expenseId,
        category,
        amount: parseFloat(amount),
        description,
        expenseDate: new Date(expenseDate),
        paymentMethod: paymentMethod || 'cash',
        receiptNumber: receiptNumber || null,
        userId: session?.user?.id || 'user_admin_001',
        createdAt: new Date(),
        updatedAt: new Date()
      });

    // Return the created expense data
    const newExpense = {
      id: expenseId,
      category,
      amount: parseFloat(amount),
      description,
      expenseDate,
      paymentMethod: paymentMethod || 'cash',
      receiptNumber: receiptNumber || null,
      userId: session?.user?.id || 'user_admin_001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Expense created successfully',
      data: newExpense
    });

  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

// PUT and DELETE methods are handled in /api/expenses/[id]/route.ts
