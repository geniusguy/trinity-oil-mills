import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sales, expenses, production } from '@/db/schema';
import { gte, lte, and, sum, count, eq } from 'drizzle-orm';
import { HistoricalPNLCalculator } from '@/lib/priceHistory';
import { jsPDF } from 'jspdf/dist/jspdf.es.min.js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999); // End of day

    // Get historical P&L data for accurate pricing
    const historicalPNL = await HistoricalPNLCalculator.calculatePNLForPeriod(
      startDateTime, 
      endDateTime
    );

    // Get sales data
    const salesResult = await db
      .select({
        totalSales: count(sales.id),
        totalRevenue: sum(sales.totalAmount),
        totalGST: sum(sales.gstAmount)
      })
      .from(sales)
      .where(
        and(
          gte(sales.createdAt, startDateTime),
          lte(sales.createdAt, endDateTime)
        )
      );

    // Get expenses data
    const expensesResult = await db
      .select({
        totalExpenses: count(expenses.id),
        totalExpenseAmount: sum(expenses.amount)
      })
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, startDateTime),
          lte(expenses.expenseDate, endDateTime)
        )
      );

    // Get production costs
    const productionResult = await db
      .select({
        totalProduction: count(production.id),
        totalProductionCost: sum(production.totalCost)
      })
      .from(production)
      .where(
        and(
          gte(production.productionDate, startDateTime),
          lte(production.productionDate, endDateTime)
        )
      );

    // Get sales by type
    const retailSalesResult = await db
      .select({
        count: count(sales.id),
        revenue: sum(sales.totalAmount)
      })
      .from(sales)
      .where(
        and(
          gte(sales.createdAt, startDateTime),
          lte(sales.createdAt, endDateTime),
          eq(sales.saleType, 'retail')
        )
      );

    const canteenSalesResult = await db
      .select({
        count: count(sales.id),
        revenue: sum(sales.totalAmount)
      })
      .from(sales)
      .where(
        and(
          gte(sales.createdAt, startDateTime),
          lte(sales.createdAt, endDateTime),
          eq(sales.saleType, 'canteen')
        )
      );

    // Get expenses by category
    const expensesByCategory = await db
      .select({
        category: expenses.category,
        totalAmount: sum(expenses.amount),
        count: count(expenses.id)
      })
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, startDateTime),
          lte(expenses.expenseDate, endDateTime)
        )
      )
      .groupBy(expenses.category);

    // Parse results and handle potential null values
    const salesData = salesResult[0] || {};
    const expensesData = expensesResult[0] || {};
    const productionData = productionResult[0] || {};
    const retailData = retailSalesResult[0] || {};
    const canteenData = canteenSalesResult[0] || {};

    // Use historical pricing for accurate calculations
    const totalRevenue = historicalPNL.summary.totalRevenue || parseFloat(salesData.totalRevenue?.toString() || '0');
    const totalExpenseAmount = parseFloat(expensesData.totalExpenseAmount?.toString() || '0');
    const totalHistoricalCost = historicalPNL.summary.totalCost; // Historical cost of goods sold
    const totalCOGS = totalHistoricalCost; // Use historical costs

    // Calculate financial metrics with historical pricing
    const grossProfit = totalRevenue - totalCOGS;
    const operatingProfit = grossProfit - totalExpenseAmount;
    const profitMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;

    const financialData = {
      dateRange: {
        startDate,
        endDate
      },
      revenue: {
        total: totalRevenue,
        retail: parseFloat(retailData.revenue?.toString() || '0'),
        canteen: parseFloat(canteenData.revenue?.toString() || '0'),
        gst: parseFloat(salesData.totalGST?.toString() || '0')
      },
      expenses: {
        total: totalExpenseAmount,
        count: parseInt(expensesData.totalExpenses?.toString() || '0'),
        byCategory: expensesByCategory.map(item => ({
          category: item.category,
          amount: parseFloat(item.totalAmount?.toString() || '0'),
          count: parseInt(item.count?.toString() || '0')
        }))
      },
      production: {
        totalCost: totalHistoricalCost,
        historicalCost: totalHistoricalCost,
        count: parseInt(productionData.totalProduction?.toString() || '0')
      },
      profitability: {
        grossProfit,
        operatingProfit,
        profitMargin,
        cogs: totalCOGS,
        historicalCogs: totalHistoricalCost
      },
      sales: {
        totalCount: parseInt(salesData.totalSales?.toString() || '0'),
        retail: {
          count: parseInt(retailData.count?.toString() || '0'),
          revenue: parseFloat(retailData.revenue?.toString() || '0')
        },
        canteen: {
          count: parseInt(canteenData.count?.toString() || '0'),
          revenue: parseFloat(canteenData.revenue?.toString() || '0')
        }
      }
    };

    // If PDF format requested, generate PDF
    if (format === 'pdf') {
      const pdfBuffer = generateFinancialReportPDF(financialData);
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="financial-report-${startDate}-to-${endDate}.pdf"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: financialData
    });

  } catch (error) {
    console.error('Error fetching financial report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial report' },
      { status: 500 }
    );
  }
}

function generateFinancialReportPDF(financialData: any): Buffer {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Trinity Oil Mills', 20, 20);
  
  doc.setFontSize(14);
  doc.text('Financial Report', 20, 30);
  
  // Date range
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${financialData.dateRange.startDate} to ${financialData.dateRange.endDate}`, 20, 40);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 20, 45);
  
  // Revenue Section
  let yPos = 60;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Revenue Summary', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Total Revenue: ₹${financialData.revenue.total.toLocaleString('en-IN')}`, 20, yPos);
  yPos += 8;
  doc.text(`Retail Revenue: ₹${financialData.revenue.retail.toLocaleString('en-IN')}`, 20, yPos);
  yPos += 8;
  doc.text(`Canteen Revenue: ₹${financialData.revenue.canteen.toLocaleString('en-IN')}`, 20, yPos);
  yPos += 8;
  doc.text(`GST Collected: ₹${financialData.revenue.gst.toLocaleString('en-IN')}`, 20, yPos);
  
  // Expenses Section
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Expenses Summary', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Total Expenses: ₹${financialData.expenses.total.toLocaleString('en-IN')}`, 20, yPos);
  yPos += 8;
  doc.text(`Number of Expenses: ${financialData.expenses.count}`, 20, yPos);
  
  // Expenses by Category
  if (financialData.expenses.byCategory && financialData.expenses.byCategory.length > 0) {
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Expenses by Category:', 20, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'normal');
    financialData.expenses.byCategory.forEach((expense: any) => {
      doc.text(`${expense.category}: ₹${expense.amount.toLocaleString('en-IN')} (${expense.count} items)`, 30, yPos);
      yPos += 8;
    });
  }
  
  // Production Costs
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Production Costs', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Total Production Cost: ₹${financialData.production.totalCost.toLocaleString('en-IN')}`, 20, yPos);
  yPos += 8;
  doc.text(`Historical Cost: ₹${financialData.production.historicalCost.toLocaleString('en-IN')}`, 20, yPos);
  yPos += 8;
  doc.text(`Production Batches: ${financialData.production.count}`, 20, yPos);
  
  // Profitability Analysis
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Profitability Analysis', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Gross Profit: ₹${financialData.profitability.grossProfit.toLocaleString('en-IN')}`, 20, yPos);
  yPos += 8;
  doc.text(`Operating Profit: ₹${financialData.profitability.operatingProfit.toLocaleString('en-IN')}`, 20, yPos);
  yPos += 8;
  doc.text(`Profit Margin: ${financialData.profitability.profitMargin.toFixed(2)}%`, 20, yPos);
  yPos += 8;
  doc.text(`Cost of Goods Sold: ₹${financialData.profitability.cogs.toLocaleString('en-IN')}`, 20, yPos);
  
  // Sales Summary
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Sales Summary', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Total Sales: ${financialData.sales.totalCount}`, 20, yPos);
  yPos += 8;
  doc.text(`Retail Sales: ${financialData.sales.retail.count} (₹${financialData.sales.retail.revenue.toLocaleString('en-IN')})`, 20, yPos);
  yPos += 8;
  doc.text(`Canteen Sales: ${financialData.sales.canteen.count} (₹${financialData.sales.canteen.revenue.toLocaleString('en-IN')})`, 20, yPos);
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, 20, 290);
    doc.text('Trinity Oil Mills - Financial Report', 150, 290);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}
