import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db/db';
import { products, productPriceHistory } from '@/db/schema';
import { count, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test 1: Check if products table exists and has data
    const productsResult = await db
      .select({ count: count() })
      .from(products);

    // Test 2: Check if product_price_history table exists
    let priceHistoryResult;
    try {
      priceHistoryResult = await db
        .select({ count: count() })
        .from(productPriceHistory);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'product_price_history table does not exist',
        details: error,
        productsCount: productsResult[0]?.count || 0
      });
    }

    // Test 3: Check for active price history
    const activePriceHistoryResult = await db
      .select({ count: count() })
      .from(productPriceHistory)
      .where(eq(productPriceHistory.isActive, true));

    return NextResponse.json({
      success: true,
      data: {
        productsCount: productsResult[0]?.count || 0,
        priceHistoryCount: priceHistoryResult[0]?.count || 0,
        activePriceHistoryCount: activePriceHistoryResult[0]?.count || 0
      }
    });

  } catch (error) {
    console.error('Error testing price history:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Database test failed',
        details: error 
      },
      { status: 500 }
    );
  }
}
