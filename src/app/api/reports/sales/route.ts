import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { sales, saleItems, products } from '@/db/schema';
import { desc, gte, lte, and, eq } from 'drizzle-orm';
import { jsPDF } from 'jspdf/dist/jspdf.es.min.js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format');

    // Build where conditions for date range
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(sales.createdAt, new Date(startDate)));
    }
    
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // End of day
      conditions.push(lte(sales.createdAt, endDateTime));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get sales data with items and products
    const salesData = await db
      .select({
        saleId: sales.id,
        invoiceNumber: sales.invoiceNumber,
        saleType: sales.saleType,
        subtotal: sales.subtotal,
        gstAmount: sales.gstAmount,
        totalAmount: sales.totalAmount,
        paymentMethod: sales.paymentMethod,
        paymentStatus: sales.paymentStatus,
        createdAt: sales.createdAt,
        itemId: saleItems.id,
        productId: saleItems.productId,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        itemTotal: saleItems.totalAmount,
        productName: products.name,
        productCategory: products.category,
        productType: products.type
      })
      .from(sales)
      .leftJoin(saleItems, eq(sales.id, saleItems.saleId))
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(whereClause)
      .orderBy(desc(sales.createdAt));

    // Group sales data by sale ID
    const groupedSales = salesData.reduce((acc: any, row) => {
      if (!acc[row.saleId]) {
        acc[row.saleId] = {
          id: row.saleId,
          invoiceNumber: row.invoiceNumber,
          saleType: row.saleType,
          subtotal: parseFloat(row.subtotal?.toString() || '0'),
          gstAmount: parseFloat(row.gstAmount?.toString() || '0'),
          totalAmount: parseFloat(row.totalAmount?.toString() || '0'),
          paymentMethod: row.paymentMethod,
          paymentStatus: row.paymentStatus,
          createdAt: row.createdAt,
          items: []
        };
      }
      
      if (row.itemId) {
        acc[row.saleId].items.push({
          id: row.itemId,
          productId: row.productId,
          productName: row.productName,
          productCategory: row.productCategory,
          productType: row.productType,
          quantity: parseFloat(row.quantity?.toString() || '0'),
          unitPrice: parseFloat(row.unitPrice?.toString() || '0'),
          totalAmount: parseFloat(row.itemTotal?.toString() || '0')
        });
      }
      
      return acc;
    }, {});

    const salesArray = Object.values(groupedSales);

    // Calculate summary statistics
    const summary = {
      totalSales: salesArray.length,
      totalRevenue: salesArray.reduce((sum: number, sale: any) => sum + sale.totalAmount, 0),
      totalGST: salesArray.reduce((sum: number, sale: any) => sum + sale.gstAmount, 0),
      retailSales: salesArray.filter((sale: any) => sale.saleType === 'retail').length,
      canteenSales: salesArray.filter((sale: any) => sale.saleType === 'canteen').length,
      cashSales: salesArray.filter((sale: any) => sale.paymentMethod === 'cash').length,
      cardSales: salesArray.filter((sale: any) => sale.paymentMethod === 'card').length,
      upiSales: salesArray.filter((sale: any) => sale.paymentMethod === 'upi').length
    };

    const reportData = {
      sales: salesArray,
      summary,
      dateRange: {
        startDate,
        endDate
      }
    };

    // If PDF format requested, generate PDF
    if (format === 'pdf') {
      const pdfBuffer = generateSalesReportPDF(reportData);
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="sales-report-${startDate}-to-${endDate}.pdf"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Error fetching sales report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales report' },
      { status: 500 }
    );
  }
}

function generateSalesReportPDF(reportData: any): Buffer {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Trinity Oil Mills', 20, 20);
  
  doc.setFontSize(14);
  doc.text('Sales Report', 20, 30);
  
  // Date range
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${reportData.dateRange.startDate} to ${reportData.dateRange.endDate}`, 20, 40);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 20, 45);
  
  // Summary section
  let yPos = 60;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const summary = reportData.summary;
  doc.text(`Total Sales: ${summary.totalSales}`, 20, yPos);
  yPos += 8;
  doc.text(`Total Revenue: ₹${summary.totalRevenue.toLocaleString('en-IN')}`, 20, yPos);
  yPos += 8;
  doc.text(`Total GST: ₹${summary.totalGST.toLocaleString('en-IN')}`, 20, yPos);
  yPos += 8;
  doc.text(`Retail Sales: ${summary.retailSales}`, 20, yPos);
  yPos += 8;
  doc.text(`Canteen Sales: ${summary.canteenSales}`, 20, yPos);
  yPos += 8;
  doc.text(`Cash Sales: ${summary.cashSales}`, 20, yPos);
  yPos += 8;
  doc.text(`Card Sales: ${summary.cardSales}`, 20, yPos);
  yPos += 8;
  doc.text(`UPI Sales: ${summary.upiSales}`, 20, yPos);
  
  // Sales details table
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Sales Details', 20, yPos);
  
  yPos += 10;
  
  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos - 5, 170, 10, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice #', 25, yPos);
  doc.text('Date', 60, yPos);
  doc.text('Type', 85, yPos);
  doc.text('Amount', 110, yPos);
  doc.text('Payment', 140, yPos);
  doc.text('Status', 170, yPos);
  
  yPos += 10;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  reportData.sales.slice(0, 20).forEach((sale: any) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.text(sale.invoiceNumber || 'N/A', 25, yPos);
    doc.text(new Date(sale.createdAt).toLocaleDateString('en-IN'), 60, yPos);
    doc.text(sale.saleType || 'N/A', 85, yPos);
    doc.text(`₹${sale.totalAmount.toLocaleString('en-IN')}`, 110, yPos);
    doc.text(sale.paymentMethod || 'N/A', 140, yPos);
    doc.text(sale.paymentStatus || 'N/A', 170, yPos);
    
    yPos += 8;
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, 20, 290);
    doc.text('Trinity Oil Mills - Sales Report', 150, 290);
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

