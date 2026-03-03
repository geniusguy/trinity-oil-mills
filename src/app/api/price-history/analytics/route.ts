import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { products, productPriceHistory } from '@/db/schema';
import { eq, and, gte, count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total products
    const totalProductsResult = await db
      .select({ count: count() })
      .from(products);

    const totalProducts = totalProductsResult[0]?.count || 0;

    // Get products with price history
    const productsWithHistoryResult = await db
      .select({ count: count() })
      .from(productPriceHistory)
      .where(eq(productPriceHistory.isActive, true));

    const productsWithHistory = productsWithHistoryResult[0]?.count || 0;

    // Get recent updates (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUpdatesResult = await db
      .select({ count: count() })
      .from(productPriceHistory)
      .where(
        and(
          gte(productPriceHistory.createdAt, thirtyDaysAgo),
          eq(productPriceHistory.isActive, true)
        )
      );

    const recentUpdates = recentUpdatesResult[0]?.count || 0;

    // Calculate average margin
    const marginResult = await db
      .select({
        avgMargin: sql<number>`AVG(
          CASE 
            WHEN ${productPriceHistory.retailPrice} > 0 
            THEN ((${productPriceHistory.retailPrice} - ${productPriceHistory.basePrice}) / ${productPriceHistory.retailPrice}) * 100
            ELSE 0 
          END
        )`
      })
      .from(productPriceHistory)
      .where(eq(productPriceHistory.isActive, true));

    const averageMargin = marginResult[0]?.avgMargin || 0;

    // Get top margin products
    const marginCalculation = sql<number>`(
      CASE 
        WHEN ${productPriceHistory.retailPrice} > 0 
        THEN ((${productPriceHistory.retailPrice} - ${productPriceHistory.basePrice}) / ${productPriceHistory.retailPrice}) * 100
        ELSE 0 
      END
    )`;

    const topMarginProductsResult = await db
      .select({
        productId: productPriceHistory.productId,
        productName: products.name,
        basePrice: productPriceHistory.basePrice,
        retailPrice: productPriceHistory.retailPrice,
        margin: marginCalculation
      })
      .from(productPriceHistory)
      .innerJoin(products, eq(productPriceHistory.productId, products.id))
      .where(eq(productPriceHistory.isActive, true))
      .orderBy(sql`${marginCalculation} DESC`)
      .limit(5);

    const topMarginProducts = topMarginProductsResult.map(item => ({
      id: item.productId,
      name: item.productName,
      margin: Number(item.margin) || 0
    }));

    // Safely handle averageMargin - it might be a string or null
    const safeAverageMargin = typeof averageMargin === 'number' 
      ? Number(averageMargin.toFixed(2))
      : Number(parseFloat(averageMargin?.toString() || '0').toFixed(2));

    const analytics = {
      totalProducts,
      productsWithHistory,
      recentUpdates,
      averageMargin: safeAverageMargin,
      topMarginProducts
    };

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching price analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price analytics' },
      { status: 500 }
    );
  }
}
