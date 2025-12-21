import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sales, expenses, production, saleItems, products } from '@/db/schema';
import { gte, lte, and, sum, count, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    // Get product-wise profitability analysis
    const productProfitability = await db
      .select({
        productId: saleItems.productId,
        productName: products.name,
        productCategory: products.category,
        productType: products.type,
        totalQuantity: sum(saleItems.quantity),
        totalRevenue: sum(saleItems.totalAmount),
        averagePrice: sum(saleItems.unitPrice),
        salesCount: count(saleItems.id)
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(
        and(
          gte(sales.createdAt, startDateTime),
          lte(sales.createdAt, endDateTime)
        )
      )
      .groupBy(saleItems.productId, products.name, products.category, products.type);

    // Get monthly revenue trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i, 1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const monthlyData = await db
        .select({
          revenue: sum(sales.totalAmount),
          salesCount: count(sales.id),
          expenses: sum(expenses.amount)
        })
        .from(sales)
        .leftJoin(expenses, and(
          gte(expenses.expenseDate, monthStart),
          lte(expenses.expenseDate, monthEnd)
        ))
        .where(
          and(
            gte(sales.createdAt, monthStart),
            lte(sales.createdAt, monthEnd)
          )
        );

      const data = monthlyData[0] || {};
      monthlyTrends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        revenue: parseFloat(data.revenue?.toString() || '0'),
        expenses: parseFloat(data.expenses?.toString() || '0'),
        profit: parseFloat(data.revenue?.toString() || '0') - parseFloat(data.expenses?.toString() || '0'),
        salesCount: parseInt(data.salesCount?.toString() || '0')
      });
    }

    // Get expense category analysis
    const expenseAnalysis = await db
      .select({
        category: expenses.category,
        totalAmount: sum(expenses.amount),
        transactionCount: count(expenses.id),
        avgAmount: sum(expenses.amount)
      })
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, startDateTime),
          lte(expenses.expenseDate, endDateTime)
        )
      )
      .groupBy(expenses.category);

    // Calculate financial ratios and KPIs
    const totalRevenue = productProfitability.reduce((sum, item) => 
      sum + parseFloat(item.totalRevenue?.toString() || '0'), 0);
    
    const totalExpenses = expenseAnalysis.reduce((sum, item) => 
      sum + parseFloat(item.totalAmount?.toString() || '0'), 0);

    const grossProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Customer analysis (simplified)
    const customerAnalysis = await db
      .select({
        saleType: sales.saleType,
        totalSales: count(sales.id),
        totalRevenue: sum(sales.totalAmount),
        avgOrderValue: sum(sales.totalAmount)
      })
      .from(sales)
      .where(
        and(
          gte(sales.createdAt, startDateTime),
          lte(sales.createdAt, endDateTime)
        )
      )
      .groupBy(sales.saleType);

    // Process and format data
    const processedProductData = productProfitability.map(item => ({
      productId: item.productId,
      productName: item.productName,
      category: item.productCategory,
      type: item.productType,
      totalQuantity: parseFloat(item.totalQuantity?.toString() || '0'),
      totalRevenue: parseFloat(item.totalRevenue?.toString() || '0'),
      averagePrice: parseFloat(item.averagePrice?.toString() || '0'),
      salesCount: parseInt(item.salesCount?.toString() || '0'),
      profitMargin: 25 + Math.random() * 15 // Placeholder calculation
    }));

    const processedExpenseData = expenseAnalysis.map(item => ({
      category: item.category,
      amount: parseFloat(item.totalAmount?.toString() || '0'),
      count: parseInt(item.transactionCount?.toString() || '0'),
      percentage: totalExpenses > 0 ? (parseFloat(item.totalAmount?.toString() || '0') / totalExpenses) * 100 : 0
    }));

    const processedCustomerData = customerAnalysis.map(item => ({
      type: item.saleType,
      salesCount: parseInt(item.totalSales?.toString() || '0'),
      revenue: parseFloat(item.totalRevenue?.toString() || '0'),
      avgOrderValue: parseInt(item.totalSales?.toString() || '0') > 0 
        ? parseFloat(item.totalRevenue?.toString() || '0') / parseInt(item.totalSales?.toString() || '0')
        : 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: {
          totalRevenue,
          totalExpenses,
          grossProfit,
          profitMargin,
          totalTransactions: processedProductData.reduce((sum, item) => sum + item.salesCount, 0)
        },
        productAnalysis: processedProductData,
        expenseAnalysis: processedExpenseData,
        customerAnalysis: processedCustomerData,
        trends: {
          monthly: monthlyTrends,
          growth: monthlyTrends.length > 1 
            ? ((monthlyTrends[monthlyTrends.length - 1].revenue - monthlyTrends[monthlyTrends.length - 2].revenue) / monthlyTrends[monthlyTrends.length - 2].revenue) * 100
            : 0
        },
        insights: {
          topPerformingProduct: processedProductData.reduce((max, item) => 
            item.totalRevenue > max.totalRevenue ? item : max, 
            processedProductData[0] || {}
          ),
          highestExpenseCategory: processedExpenseData.reduce((max, item) => 
            item.amount > max.amount ? item : max, 
            processedExpenseData[0] || {}
          ),
          recommendations: [
            profitMargin < 15 ? 'Consider reducing operating expenses or increasing prices' : null,
            processedProductData.some(p => p.salesCount < 5) ? 'Some products have low sales - consider promotion or discontinuation' : null,
            totalExpenses > totalRevenue * 0.7 ? 'Expense ratio is high - implement cost control measures' : null
          ].filter(Boolean)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial analytics' },
      { status: 500 }
    );
  }
}

