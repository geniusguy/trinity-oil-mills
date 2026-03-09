import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { sales, saleItems, products } from '@/db/schema';
import { eq, and, gte, lte, desc, sql, sum, count, avg } from 'drizzle-orm';

// GET /api/reports/gst-collection - GST Collection Reports (FIXED VERSION)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!['admin', 'accountant'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const saleType = searchParams.get('saleType'); // 'retail' or 'canteen'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'day'; // 'day', 'month', 'quarter', 'year'

    if (!saleType) {
      return NextResponse.json({ 
        error: 'Sale type (retail/canteen) is required' 
      }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Start date and end date are required' 
      }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start >= end) {
      return NextResponse.json({ 
        error: 'Start date must be before end date' 
      }, { status: 400 });
    }

    console.log('GST Collection Request:', {
      saleType,
      startDate,
      endDate,
      groupBy
    });

    // Debug: Get basic stats using Drizzle ORM
    const totalSalesCount = await db
      .select({ count: count() })
      .from(sales);

    const salesByType = await db
      .select({ count: count() })
      .from(sales)
      .where(eq(sales.saleType, saleType));

    const paidSales = await db
      .select({ count: count() })
      .from(sales)
      .where(eq(sales.paymentStatus, 'paid'));

    console.log('Database Stats:', {
      totalSales: totalSalesCount[0]?.count || 0,
      salesOfType: salesByType[0]?.count || 0,
      paidSales: paidSales[0]?.count || 0
    });

    // Get sales in the specified period using Drizzle ORM
    const salesInPeriod = await db
      .select({
        id: sales.id,
        saleType: sales.saleType,
        subtotal: sales.subtotal,
        gstAmount: sales.gstAmount,
        totalAmount: sales.totalAmount,
        paymentStatus: sales.paymentStatus,
        createdAt: sales.createdAt
      })
      .from(sales)
      .where(
        and(
          gte(sales.createdAt, start),
          lte(sales.createdAt, end),
          eq(sales.saleType, saleType),
          eq(sales.paymentStatus, 'paid')
        )
      )
      .orderBy(desc(sales.createdAt));

    console.log('Sales in Period:', {
      count: salesInPeriod.length,
      sampleSale: salesInPeriod[0] ? {
        id: salesInPeriod[0].id,
        gstAmount: salesInPeriod[0].gstAmount,
        totalAmount: salesInPeriod[0].totalAmount,
        createdAt: salesInPeriod[0].createdAt
      } : null
    });

    // Group sales by period
    const groupedSales = new Map();
    
    salesInPeriod.forEach(sale => {
      let periodKey = '';
      const saleDate = new Date(sale.createdAt);
      
      switch (groupBy) {
        case 'day':
          periodKey = saleDate.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'month':
          periodKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(saleDate.getMonth() / 3) + 1;
          periodKey = `${saleDate.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          periodKey = saleDate.getFullYear().toString();
          break;
        default:
          periodKey = saleDate.toISOString().split('T')[0];
      }
      
      if (!groupedSales.has(periodKey)) {
        groupedSales.set(periodKey, {
          period: periodKey,
          formattedPeriod: periodKey,
          totalSales: 0,
          totalSubtotal: 0,
          totalGstCollected: 0,
          totalAmount: 0,
          sales: []
        });
      }
      
      const periodData = groupedSales.get(periodKey);
      periodData.totalSales += 1;
      periodData.totalSubtotal += parseFloat(sale.subtotal.toString());
      periodData.totalGstCollected += parseFloat(sale.gstAmount.toString());
      periodData.totalAmount += parseFloat(sale.totalAmount.toString());
      periodData.sales.push(sale);
    });

    // Convert Map to Array and calculate averages
    const gstCollection = Array.from(groupedSales.values()).map(period => ({
      ...period,
      avgGstPerSale: period.totalSales > 0 ? period.totalGstCollected / period.totalSales : 0,
      periodStart: period.sales[0]?.createdAt || start,
      periodEnd: period.sales[period.sales.length - 1]?.createdAt || end
    }));

    // Calculate summary statistics
    const totalGstCollected = gstCollection.reduce((sum, item) => sum + item.totalGstCollected, 0);
    const totalSales = gstCollection.reduce((sum, item) => sum + item.totalSales, 0);
    const totalRevenue = gstCollection.reduce((sum, item) => sum + item.totalAmount, 0);
    const avgGstPerSale = totalSales > 0 ? totalGstCollected / totalSales : 0;
    const gstPercentageOfRevenue = totalRevenue > 0 ? (totalGstCollected / totalRevenue) * 100 : 0;

    console.log('Calculated Summary:', {
      totalGstCollected,
      totalSales,
      totalRevenue,
      avgGstPerSale,
      gstPercentageOfRevenue
    });

    // Get product breakdown using Drizzle ORM
    const productBreakdown = await db
      .select({
        productName: products.name,
        productType: products.type,
        gstRate: products.gstRate,
        itemsSold: count(saleItems.id),
        totalQuantity: sum(saleItems.quantity),
        totalGstCollected: sum(saleItems.gstAmount),
        totalRevenue: sum(saleItems.totalAmount)
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(
        and(
          gte(sales.createdAt, start),
          lte(sales.createdAt, end),
          eq(sales.saleType, saleType),
          eq(sales.paymentStatus, 'paid')
        )
      )
      .groupBy(products.id, products.name, products.type, products.gstRate)
      .orderBy(desc(sum(saleItems.gstAmount)));

    // Get GST rate breakdown
    const gstRateBreakdown = await db
      .select({
        gstRate: products.gstRate,
        salesCount: count(sales.id),
        itemsCount: count(saleItems.id),
        totalQuantity: sum(saleItems.quantity),
        totalGstCollected: sum(saleItems.gstAmount),
        totalRevenue: sum(saleItems.totalAmount)
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(
        and(
          gte(sales.createdAt, start),
          lte(sales.createdAt, end),
          eq(sales.saleType, saleType),
          eq(sales.paymentStatus, 'paid')
        )
      )
      .groupBy(products.gstRate)
      .orderBy(products.gstRate);

    // Format the response
    const isEmpty = gstCollection.length === 0;
    let debugMessage = '';
    
    if (totalSalesCount[0]?.count === 0) {
      debugMessage = 'No sales data found in the database. Please create some sales first.';
    } else if (isEmpty) {
      debugMessage = `Found ${totalSalesCount[0]?.count || 0} total sales, ${salesByType[0]?.count || 0} ${saleType} sales, ${paidSales[0]?.count || 0} paid sales. No data in selected period ${startDate} to ${endDate}.`;
    }

    const response = {
      saleType,
      period: {
        startDate,
        endDate,
        groupBy
      },
      summary: {
        totalGstCollected,
        totalSales,
        totalRevenue,
        avgGstPerSale,
        gstPercentageOfRevenue,
        periodsCount: gstCollection.length
      },
      gstCollection: gstCollection.sort((a, b) => b.period.localeCompare(a.period)),
      productBreakdown: productBreakdown.map(item => ({
        productName: item.productName,
        productType: item.productType,
        gstRate: parseFloat(item.gstRate?.toString() || '0'),
        itemsSold: parseInt(item.itemsSold?.toString() || '0'),
        totalQuantity: parseFloat(item.totalQuantity?.toString() || '0'),
        totalGstCollected: parseFloat(item.totalGstCollected?.toString() || '0'),
        totalRevenue: parseFloat(item.totalRevenue?.toString() || '0')
      })),
      gstRateBreakdown: gstRateBreakdown.map(item => ({
        gstRate: parseFloat(item.gstRate?.toString() || '0'),
        salesCount: parseInt(item.salesCount?.toString() || '0'),
        itemsCount: parseInt(item.itemsCount?.toString() || '0'),
        totalQuantity: parseFloat(item.totalQuantity?.toString() || '0'),
        totalGstCollected: parseFloat(item.totalGstCollected?.toString() || '0'),
        totalRevenue: parseFloat(item.totalRevenue?.toString() || '0')
      })),
      isEmpty,
      debugInfo: {
        hasAnyData: (totalSalesCount[0]?.count || 0) > 0,
        debugMessage,
        totalSalesInDb: totalSalesCount[0]?.count || 0,
        salesOfTypeInDb: salesByType[0]?.count || 0,
        paidSalesInDb: paidSales[0]?.count || 0,
        salesInPeriod: salesInPeriod.length
      }
    };

    return NextResponse.json({ 
      success: true, 
      data: response 
    });
  } catch (error) {
    console.error('Error fetching GST collection report:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}