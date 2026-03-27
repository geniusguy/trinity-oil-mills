import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sql } from 'drizzle-orm';
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

    const startDateTime = new Date(`${startDate}T00:00:00`);
    const endDateExclusive = new Date(`${endDate}T00:00:00`);
    endDateExclusive.setDate(endDateExclusive.getDate() + 1);
    const endDateInclusive = new Date(endDateExclusive.getTime() - 1);
    const toSqlDateTime = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
    const startSql = toSqlDateTime(startDateTime);
    const endExclusiveSql = toSqlDateTime(endDateExclusive);

    // Get historical P&L data for accurate pricing
    const historicalPNL = await HistoricalPNLCalculator.calculatePNLForPeriod(
      startDateTime, 
      endDateInclusive,
      { paidOnly: true }
    );

    const salesRes = await db.execute(sql`
      SELECT
        COUNT(s.id) AS total_sales,
        COALESCE(SUM(s.subtotal), 0) AS total_revenue_ex_gst,
        COALESCE(SUM(s.gst_amount), 0) AS total_gst,
        COALESCE(SUM(s.total_amount), 0) AS total_revenue_incl_gst
      FROM sales s
      WHERE s.created_at >= ${startSql}
        AND s.created_at < ${endExclusiveSql}
        AND s.payment_status = 'paid'
    `);
    const salesData = (salesRes as any)?.rows?.[0] ?? (Array.isArray(salesRes) ? (salesRes as any)[0] : {}) ?? {};

    const expensesRes = await db.execute(sql`
      SELECT COUNT(e.id) AS total_expenses, COALESCE(SUM(e.amount), 0) AS total_expense_amount
      FROM expenses e
      WHERE e.expense_date >= ${startSql}
        AND e.expense_date < ${endExclusiveSql}
    `);
    const expensesData = (expensesRes as any)?.rows?.[0] ?? (Array.isArray(expensesRes) ? (expensesRes as any)[0] : {}) ?? {};

    const expensesByCategoryRes = await db.execute(sql`
      SELECT e.category, COALESCE(SUM(e.amount), 0) AS total_amount, COUNT(e.id) AS count
      FROM expenses e
      WHERE e.expense_date >= ${startSql}
        AND e.expense_date < ${endExclusiveSql}
      GROUP BY e.category
    `);
    const expensesByCategory = ((expensesByCategoryRes as any)?.rows ?? (Array.isArray(expensesByCategoryRes) ? expensesByCategoryRes : [])) as any[];

    const salesByTypeRes = await db.execute(sql`
      SELECT s.sale_type, COUNT(s.id) AS count, COALESCE(SUM(s.total_amount), 0) AS revenue
      FROM sales s
      WHERE s.created_at >= ${startSql}
        AND s.created_at < ${endExclusiveSql}
        AND s.payment_status = 'paid'
      GROUP BY s.sale_type
    `);
    const salesByType = ((salesByTypeRes as any)?.rows ?? (Array.isArray(salesByTypeRes) ? salesByTypeRes : [])) as any[];
    const retailData = salesByType.find((r) => String(r.sale_type || '') === 'retail') || {};
    const canteenData = salesByType.find((r) => String(r.sale_type || '') === 'canteen') || {};

    const courierRes = await db.execute(sql`
      SELECT COALESCE(SUM(c.cost), 0) AS courier_ex_gst
      FROM courier_expenses c
      WHERE c.courier_date >= ${startDate}
        AND c.courier_date <= ${endDate}
    `);
    const courierData = (courierRes as any)?.rows?.[0] ?? (Array.isArray(courierRes) ? (courierRes as any)[0] : {}) ?? {};

    const stockPurchasesRes = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN sp.total_amount IS NOT NULL THEN sp.total_amount
          WHEN sp.unit_price IS NOT NULL AND sp.quantity IS NOT NULL THEN sp.unit_price * sp.quantity
          WHEN p.base_price IS NOT NULL AND sp.quantity IS NOT NULL THEN p.base_price * sp.quantity
          WHEN p.retail_price IS NOT NULL AND sp.quantity IS NOT NULL THEN p.retail_price * sp.quantity
          ELSE 0
        END
      ), 0) AS stock_purchase_cost
      FROM stock_purchases sp
      LEFT JOIN products p ON p.id = sp.product_id
      WHERE sp.purchase_date >= ${startSql}
        AND sp.purchase_date < ${endExclusiveSql}
    `);
    const stockPurchasesData = (stockPurchasesRes as any)?.rows?.[0] ?? (Array.isArray(stockPurchasesRes) ? (stockPurchasesRes as any)[0] : {}) ?? {};

    // Use historical pricing for accurate calculations
    const totalRevenue = parseFloat(salesData.total_revenue_ex_gst?.toString() || '0');
    const totalExpenseAmount = parseFloat(expensesData.total_expense_amount?.toString() || '0');
    const totalHistoricalCost = historicalPNL.summary.totalCost; // Historical cost of goods sold
    const totalStockPurchaseCost = parseFloat(stockPurchasesData.stock_purchase_cost?.toString() || '0');
    const totalCOGS = totalHistoricalCost > 0 ? totalHistoricalCost : totalStockPurchaseCost;
    const courierExGst = parseFloat(courierData.courier_ex_gst?.toString() || '0');
    const totalOperatingExpenses = totalExpenseAmount + courierExGst;

    // Calculate financial metrics with historical pricing
    const grossProfit = totalRevenue - totalCOGS;
    const operatingProfit = grossProfit - totalOperatingExpenses;
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
        gst: parseFloat(salesData.total_gst?.toString() || '0')
      },
      expenses: {
        total: totalOperatingExpenses,
        count: parseInt(expensesData.total_expenses?.toString() || '0'),
        byCategory: [
          ...expensesByCategory.map(item => ({
            category: item.category,
            amount: parseFloat(item.total_amount?.toString() || '0'),
            count: parseInt(item.count?.toString() || '0')
          })),
          ...(courierExGst > 0 ? [{ category: 'courier', amount: courierExGst, count: 1 }] : []),
        ]
      },
      production: {
        totalCost: totalCOGS,
        historicalCost: totalHistoricalCost,
        count: 0
      },
      profitability: {
        grossProfit,
        operatingProfit,
        profitMargin,
        cogs: totalCOGS,
        historicalCogs: totalHistoricalCost
      },
      sales: {
        totalCount: parseInt(salesData.total_sales?.toString() || '0'),
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
