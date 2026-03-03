import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import jsPDF from 'jspdf';

// Function to convert number to words
function convertNumberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  
  function convertHundreds(n: number): string {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred';
      n %= 100;
      if (n > 0) result += ' ';
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)];
      n %= 10;
      if (n > 0) result += ' ' + ones[n];
    } else if (n >= 10) {
      result += teens[n - 10];
    } else if (n > 0) {
      result += ones[n];
    }
    
    return result;
  }
  
  let result = '';
  
  if (num >= 10000000) {
    result += convertHundreds(Math.floor(num / 10000000)) + ' Crore';
    num %= 10000000;
    if (num > 0) result += ' ';
  }
  
  if (num >= 100000) {
    result += convertHundreds(Math.floor(num / 100000)) + ' Lakh';
    num %= 100000;
    if (num > 0) result += ' ';
  }
  
  if (num >= 1000) {
    result += convertHundreds(Math.floor(num / 1000)) + ' Thousand';
    num %= 1000;
    if (num > 0) result += ' ';
  }
  
  if (num > 0) {
    result += convertHundreds(num);
  }
  
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    let format = searchParams.get('format')?.toLowerCase();
    
    // If no format specified, we'll determine it from the sale type after fetching the sale
    const { id: saleId } = await params;
    const connection = await createConnection();
    const [[sale]]: any = await connection.query(
      `SELECT s.id, s.invoice_number as invoiceNumber, s.subtotal, s.gst_amount as gstAmount, s.total_amount as totalAmount, s.payment_method as paymentMethod, s.created_at as createdAt, s.sale_type as saleType,
              s.po_number as poNumber, s.po_date as poDate, s.mode_of_sales as modeOfSales,
              u.name as userName, s.notes as customerName,
              ca.canteen_name as canteenName, ca.address as canteenAddress, ca.city as canteenCity, ca.state as canteenState, ca.pincode as canteenPincode,
              ca.address as billingAddress, ca.city as billingCity, ca.state as billingState, ca.pincode as billingPincode,
              ca.contact_person as contactPerson, ca.mobile_number as mobileNumber, ca.gst_number as gstNumber
       FROM sales s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN canteen_addresses ca ON ca.id = s.canteen_address_id
       WHERE s.id = ?
       LIMIT 1`,
      [saleId],
    );
    if (!sale) { await connection.end(); return new Response('Not Found', { status: 404 }); }
    
    // Auto-detect format based on sale type if not specified
    if (!format) {
      format = sale.saleType === 'canteen' ? 'canteen' : 'retail';
    }

    const [items]: any = await connection.query(
      `SELECT si.product_id as productId, p.name as productName, si.quantity, si.unit_price as unitPrice, si.gst_rate as gstRate, si.gst_amount as gstAmount, si.total_amount as totalAmount
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`,
      [saleId],
    );
    await connection.end();

    // Create new PDF document
    const doc = new jsPDF();
    
    if (format === 'canteen') {
      renderCanteenInvoice(doc, sale, items);
    } else {
      renderRetailInvoice(doc, sale, items);
    }

    // Get PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    return new Response(pdfBuffer, { 
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': `inline; filename="${sale.invoiceNumber}.pdf"` 
      } 
    });
  } catch (error) {
    console.error('Invoice PDF error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

function renderRetailInvoice(doc: jsPDF, sale: any, items: any[]) {
  // Clean white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');
  
  // Professional header with subtle gradient effect
  doc.setFillColor(248, 250, 252); // Very light blue-gray
  doc.rect(0, 0, 210, 80, 'F');
  
  // Add subtle border at bottom of header
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(0, 80, 210, 80);
  
  // Company logo area - professional white card
  doc.setFillColor(255, 255, 255);
  doc.rect(20, 15, 50, 50, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.rect(20, 15, 50, 50, 'S');
  
  // Trinity Oil Logo - Enhanced design
  doc.setFillColor(34, 197, 94); // Professional green
  doc.circle(45, 35, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TRINITY', 37, 32);
  doc.text('OIL', 42, 38);
  
  // Company name with professional typography
  doc.setTextColor(30, 41, 59); // Dark slate
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Trinity Oil Mills', 80, 30);
  
  // Professional tagline
  doc.setTextColor(71, 85, 105); // Slate gray
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Premium Cold Pressed Oils', 80, 40);
  
  // Contact information in professional style
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text('📞 +91 99520 55660  •  🌐 www.trinityoil.in  •  📧 orders@trinityoil.in', 80, 50);
  
  // Address
  doc.setFontSize(8);
  doc.text('337, 339, Paper Mills Road, Bunder Garden, Perambur, Chennai - 600011', 80, 58);
  doc.text('GST: 33BOBPS7844L1ZG', 80, 66);
  
  // Professional invoice badge
  doc.setFillColor(239, 68, 68); // Professional red
  doc.rect(160, 15, 40, 25, 'F');
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  doc.rect(160, 15, 40, 25, 'S');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 167, 30);
  
  // Document type selection - clean checkboxes
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Original checkbox (checked)
  doc.setFillColor(34, 197, 94);
  doc.circle(165, 47, 2, 'F');
  doc.setTextColor(34, 197, 94);
  doc.text('● Original', 170, 50);
  
  // Other options (unchecked)
  doc.setTextColor(156, 163, 175);
  doc.text('○ Duplicate', 170, 58);
  doc.text('○ Triplicate', 170, 66);
  
  // Reset text color
  doc.setTextColor(30, 41, 59);
  
  // Invoice information cards
  const cardY = 90;
  
  // Left card - Billing Information
  doc.setFillColor(255, 255, 255);
  doc.rect(20, cardY, 80, 50, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.rect(20, cardY, 80, 50, 'S');
  
  // Card header
  doc.setFillColor(99, 102, 241);
  doc.rect(20, cardY, 80, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 25, cardY + 8);
  
  // Card content
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.customerName || 'Walk-in Customer', 25, cardY + 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Retail Customer', 25, cardY + 28);
  doc.text('Chennai, Tamil Nadu - 600001', 25, cardY + 35);
  doc.text('📧 customer@email.com', 25, cardY + 42);
  
  // Right card - Invoice Details
  doc.setFillColor(255, 255, 255);
  doc.rect(110, cardY, 80, 50, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.rect(110, cardY, 80, 50, 'S');
  
  // Card header
  doc.setFillColor(16, 185, 129);
  doc.rect(110, cardY, 80, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS', 115, cardY + 8);
  
  // Card content
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Invoice #:', 115, cardY + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.invoiceNumber, 145, cardY + 20);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Date:', 115, cardY + 28);
  doc.setFont('helvetica', 'bold');
  doc.text(new Date(sale.createdAt).toLocaleDateString('en-IN'), 145, cardY + 28);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Payment:', 115, cardY + 35);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.paymentMethod || 'Cash', 145, cardY + 35);
  
  doc.setFont('helvetica', 'normal');
  doc.text('PO No:', 115, cardY + 42);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.poNumber || 'N/A', 145, cardY + 42);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Mode:', 115, cardY + 49);
  doc.setFont('helvetica', 'bold');
  const modeText = sale.modeOfSales ? (sale.modeOfSales.startsWith('email:') ? '📧 ' + sale.modeOfSales.split(':')[1] : sale.modeOfSales === 'email' ? '📧 Email' : sale.modeOfSales === 'phone' ? '📞 Phone' : sale.modeOfSales === 'whatsapp' ? '📱 WhatsApp' : sale.modeOfSales === 'walk_in' ? '🚶 Walk-in' : sale.modeOfSales === 'online' ? '💻 Online' : sale.modeOfSales) : 'N/A';
  doc.text(modeText, 145, cardY + 49);
  
  // Items Table - Professional Design
  const itemsTableY = 175;
  
  // Professional table design
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Details', 20, itemsTableY - 5);
  
  // Table header with professional styling
  doc.setFillColor(71, 85, 105); // Professional slate
  doc.rect(20, itemsTableY, 170, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('QTY', 30, itemsTableY + 10);
  doc.text('PRODUCT DESCRIPTION', 65, itemsTableY + 10);
  doc.text('UNIT PRICE', 135, itemsTableY + 10);
  doc.text('TOTAL', 165, itemsTableY + 10);
  
  // Table rows with clean design
  let yPos = itemsTableY + 15;
  const HSN = '15180011';
  
  items.forEach((item: any, index: number) => {
    yPos += 12;
    
    // Clean alternating rows
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252); // Very light blue
    } else {
      doc.setFillColor(255, 255, 255); // White
    }
    doc.rect(20, yPos - 8, 170, 12, 'F');
    
    // Professional row borders
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 4, 190, yPos + 4);
    
    // Content with better alignment
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Quantity (centered)
    doc.text(String(item.quantity), 32, yPos);
    
    // Product name (left aligned)
    doc.text(item.productName, 50, yPos);
    
    // Unit price (right aligned)
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${Number(item.unitPrice).toFixed(2)}`, 145, yPos);
    
    // Total (right aligned, highlighted)
    doc.setTextColor(239, 68, 68); // Red for totals
    doc.text(`₹${Number(item.totalAmount).toFixed(2)}`, 170, yPos);
    
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
  });
  
  // HSN Code with professional styling
  yPos += 15;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`HSN Code: ${HSN}`, 25, yPos);
  
  // Summary of Charges Section (Right side box)
  const summaryY = yPos + 20;
  const summaryBoxWidth = 80;
  const summaryBoxHeight = 60;
  
  // Enhanced Summary box with gradient
  doc.setFillColor(254, 249, 195); // Light yellow background
  doc.rect(110, summaryY, summaryBoxWidth, summaryBoxHeight, 'F');
  doc.setDrawColor(245, 158, 11); // Orange border
  doc.setLineWidth(2);
  doc.rect(110, summaryY, summaryBoxWidth, summaryBoxHeight, 'S');
  
  // Summary header
  doc.setFillColor(245, 158, 11); // Orange header
  doc.rect(110, summaryY, summaryBoxWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('💰 BILLING SUMMARY', 115, summaryY + 8);
  
  const sgst = Number((Number(sale.gstAmount) / 2).toFixed(2));
  const cgst = sgst;
  
  doc.setTextColor(31, 41, 55); // Dark blue-gray
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', 115, summaryY + 20);
  doc.setTextColor(22, 101, 52); // Green for amounts
  doc.setFont('helvetica', 'bold');
  doc.text(`₹${Number(sale.subtotal).toFixed(2)}`, 170, summaryY + 20);
  
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'normal');
  doc.text('SGST / IGST 2.5%', 115, summaryY + 30);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text(`₹${sgst.toFixed(2)}`, 170, summaryY + 30);
  
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'normal');
  doc.text('CGST / IGST 2.5%', 115, summaryY + 40);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text(`₹${cgst.toFixed(2)}`, 170, summaryY + 40);
  
  // Total line with enhanced styling
  doc.setDrawColor(220, 38, 38); // Red line
  doc.setLineWidth(2);
  doc.line(115, summaryY + 45, 185, summaryY + 45);
  
  // Total amount with red background
  doc.setFillColor(254, 226, 226); // Light red background
  doc.rect(110, summaryY + 48, summaryBoxWidth, 12, 'F');
  
  doc.setTextColor(220, 38, 38); // Red for total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Invoice Value', 115, summaryY + 55);
  doc.text(`₹${Number(sale.totalAmount).toFixed(2)}`, 170, summaryY + 55);
  
  // Amount in Words
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const amountInWords = convertNumberToWords(Number(sale.totalAmount));
  doc.text(`Amount in Words ${amountInWords} Only.`, 20, summaryY + 70);
  
  // Payment instructions
  doc.text('Make all checks payable to', 20, summaryY + 80);
  doc.text('', 20, summaryY + 85); // Empty line
  
  // Signature section
  doc.text('Customer Signature:', 20, summaryY + 95);
  doc.text('', 20, summaryY + 100); // Empty line for signature
  doc.text('Prepared By:', 20, summaryY + 110);
  doc.text('', 20, summaryY + 115); // Empty line
  doc.text('Checked By:', 20, summaryY + 125);
  doc.text('', 20, summaryY + 130); // Empty line
  
  // Company signature box
  doc.setDrawColor(0, 0, 0);
  doc.rect(120, summaryY + 95, 70, 40, 'S');
  doc.text('For Trinity Oil Mills', 125, summaryY + 105);
  doc.text('Authorised Signatory', 125, summaryY + 125);
  
  // Tax information
  doc.text('Whether Tax is Payable Under Reverse Charge Basis - No', 20, summaryY + 140);
  
  // Company Contact Information (Bottom)
  const footerY = summaryY + 160;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Registered Office:', 20, footerY);
  doc.text('Trinity Oil Mills, 337, 339, Paper Mills Road, Bunder Garden, Perambur, Chennai, Tamil Nadu 600011', 20, footerY + 8);
  doc.text('Tel: 99520 55660 / 97109 03330', 20, footerY + 16);
  doc.text('www.Trinityoil.in', 20, footerY + 24);
  doc.text('GST No: 33BOBPS7844L1ZG', 20, footerY + 32);
  
  // Thank you message (centered)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for your business!', 95, footerY + 45);
}

function renderCanteenInvoice(doc: jsPDF, sale: any, items: any[]) {
  // Clean white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F');
  
  // Professional header with subtle gradient effect
  doc.setFillColor(248, 250, 252); // Very light blue-gray
  doc.rect(0, 0, 210, 80, 'F');
  
  // Add subtle border at bottom of header
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(0, 80, 210, 80);
  
  // Company logo area - professional white card
  doc.setFillColor(255, 255, 255);
  doc.rect(20, 15, 50, 50, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.rect(20, 15, 50, 50, 'S');
  
  // Trinity Oil Logo - Enhanced design
  doc.setFillColor(34, 197, 94); // Professional green
  doc.circle(45, 35, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TRINITY', 37, 32);
  doc.text('OIL', 42, 38);
  
  // Company name with professional typography
  doc.setTextColor(30, 41, 59); // Dark slate
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Trinity Oil Mills', 80, 30);
  
  // Professional tagline
  doc.setTextColor(71, 85, 105); // Slate gray
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Premium Cold Pressed Oils', 80, 40);
  
  // Contact information in professional style
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text('📞 +91 99520 55660  •  🌐 www.trinityoil.in  •  📧 orders@trinityoil.in', 80, 50);
  
  // Address
  doc.setFontSize(8);
  doc.text('337, 339, Paper Mills Road, Bunder Garden, Perambur, Chennai - 600011', 80, 58);
  doc.text('GST: 33BOBPS7844L1ZG', 80, 66);
  
  // Professional invoice badge
  doc.setFillColor(239, 68, 68); // Professional red
  doc.rect(160, 15, 40, 25, 'F');
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(1);
  doc.rect(160, 15, 40, 25, 'S');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 167, 30);
  
  // Document type selection - clean checkboxes
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Original checkbox (checked)
  doc.setFillColor(34, 197, 94);
  doc.circle(165, 47, 2, 'F');
  doc.setTextColor(34, 197, 94);
  doc.text('● Original', 170, 50);
  
  // Other options (unchecked)
  doc.setTextColor(156, 163, 175);
  doc.text('○ Duplicate', 170, 58);
  doc.text('○ Triplicate', 170, 66);
  
  // Reset text color
  doc.setTextColor(30, 41, 59);
  
  // Invoice information cards for canteen
  const cardY = 90;
  
  // Left card - Billing Information
  doc.setFillColor(255, 255, 255);
  doc.rect(20, cardY, 80, 60, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.rect(20, cardY, 80, 60, 'S');
  
  // Card header
  doc.setFillColor(99, 102, 241);
  doc.rect(20, cardY, 80, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 25, cardY + 8);
  
  // Card content - Billing address
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.canteenName || 'Canteen Customer', 25, cardY + 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  
  // Handle billing address
  if (sale.billingAddress && sale.billingAddress !== sale.canteenAddress) {
    const billingLines = sale.billingAddress.split('\n').filter(line => line.trim()).slice(0, 2);
    billingLines.forEach((line, index) => {
      doc.text(line.trim(), 25, cardY + 28 + (index * 6));
    });
    doc.text(`${sale.billingCity}, ${sale.billingState} - ${sale.billingPincode}`, 25, cardY + 40);
  } else {
    // Use delivery address for billing
    const deliveryLines = sale.canteenAddress.split('\n').filter(line => line.trim()).slice(0, 2);
    deliveryLines.forEach((line, index) => {
      doc.text(line.trim(), 25, cardY + 28 + (index * 6));
    });
    doc.text(`${sale.canteenCity}, ${sale.canteenState} - ${sale.canteenPincode}`, 25, cardY + 40);
  }
  
  doc.text(`GST: ${sale.gstNumber || '33AAAGT0316F1ZT'}`, 25, cardY + 48);
  
  // Right card - Delivery & Invoice Details
  doc.setFillColor(255, 255, 255);
  doc.rect(110, cardY, 80, 60, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.rect(110, cardY, 80, 60, 'S');
  
  // Card header
  doc.setFillColor(16, 185, 129);
  doc.rect(110, cardY, 80, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DELIVERY & INVOICE', 115, cardY + 8);
  
  // Card content
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Invoice #:', 115, cardY + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.invoiceNumber, 145, cardY + 20);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Date:', 115, cardY + 28);
  doc.setFont('helvetica', 'bold');
  doc.text(new Date(sale.createdAt).toLocaleDateString('en-IN'), 145, cardY + 28);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Contact:', 115, cardY + 36);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.contactPerson || 'N/A', 145, cardY + 36);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Mobile:', 115, cardY + 44);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.mobileNumber || 'N/A', 145, cardY + 44);
  
  // Items Table - Professional Design (same as retail)
  const itemsTableY = 170;
  
  // Professional table design
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Details', 20, itemsTableY - 5);
  
  // Table header with professional styling
  doc.setFillColor(71, 85, 105); // Professional slate
  doc.rect(20, itemsTableY, 170, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('QTY', 30, itemsTableY + 10);
  doc.text('PRODUCT DESCRIPTION', 65, itemsTableY + 10);
  doc.text('UNIT PRICE', 135, itemsTableY + 10);
  doc.text('TOTAL', 165, itemsTableY + 10);
  
  // Table rows with clean design
  let yPos = itemsTableY + 15;
  const HSN = '15180011';
  
  items.forEach((item: any, index: number) => {
    yPos += 12;
    
    // Clean alternating rows
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252); // Very light blue
    } else {
      doc.setFillColor(255, 255, 255); // White
    }
    doc.rect(20, yPos - 8, 170, 12, 'F');
    
    // Professional row borders
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 4, 190, yPos + 4);
    
    // Content with better alignment
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Quantity (centered)
    doc.text(String(item.quantity), 32, yPos);
    
    // Product name (left aligned)
    doc.text(item.productName, 50, yPos);
    
    // Unit price (right aligned)
    doc.setFont('helvetica', 'bold');
    doc.text(`₹${Number(item.unitPrice).toFixed(2)}`, 145, yPos);
    
    // Total (right aligned, highlighted)
    doc.setTextColor(239, 68, 68); // Red for totals
    doc.text(`₹${Number(item.totalAmount).toFixed(2)}`, 170, yPos);
    
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
  });
  
  // HSN Code with professional styling
  yPos += 15;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`HSN Code: ${HSN}`, 25, yPos);
  
  // Totals Section
  yPos += 10;
  doc.setDrawColor(209, 213, 219);
  doc.line(20, yPos, 190, yPos);
  
  const sgst = Number((Number(sale.gstAmount) / 2).toFixed(2));
  const cgst = sgst;
  
  // Summary of Charges Section (Right side box)
  const summaryY = yPos + 20;
  const summaryBoxWidth = 80;
  const summaryBoxHeight = 60;
  
  // Summary box background
  doc.setFillColor(240, 240, 240); // Light grey
  doc.rect(110, summaryY, summaryBoxWidth, summaryBoxHeight, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(110, summaryY, summaryBoxWidth, summaryBoxHeight, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', 115, summaryY + 10);
  doc.text(`Rs. ${Number(sale.subtotal).toFixed(2)}`, 170, summaryY + 10);
  
  doc.text('SGST / IGST 2.5%', 115, summaryY + 20);
  doc.text(`Rs. ${sgst.toFixed(2)}`, 170, summaryY + 20);
  
  doc.text('CGST / IGST 2.5%', 115, summaryY + 30);
  doc.text(`Rs. ${cgst.toFixed(2)}`, 170, summaryY + 30);
  
  // Total line
  doc.setDrawColor(0, 0, 0);
  doc.line(115, summaryY + 35, 185, summaryY + 35);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Total Invoice Value', 115, summaryY + 45);
  doc.text(`Rs. ${Number(sale.totalAmount).toFixed(2)}`, 170, summaryY + 45);
  
  // Amount in Words
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const amountInWords = convertNumberToWords(Number(sale.totalAmount));
  doc.text(`Amount in Words ${amountInWords} Only.`, 20, summaryY + 70);
  
  // Payment instructions
  doc.text('Make all checks payable to', 20, summaryY + 80);
  doc.text('', 20, summaryY + 85); // Empty line
  
  // Signature section
  doc.text('Customer Signature:', 20, summaryY + 95);
  doc.text('', 20, summaryY + 100); // Empty line for signature
  doc.text('Prepared By:', 20, summaryY + 110);
  doc.text('', 20, summaryY + 115); // Empty line
  doc.text('Checked By:', 20, summaryY + 125);
  doc.text('', 20, summaryY + 130); // Empty line
  
  // Company signature box
  doc.setDrawColor(0, 0, 0);
  doc.rect(120, summaryY + 95, 70, 40, 'S');
  doc.text('For Trinity Oil Mills', 125, summaryY + 105);
  doc.text('Authorised Signatory', 125, summaryY + 125);
  
  // Tax information
  doc.text('Whether Tax is Payable Under Reverse Charge Basis - No', 20, summaryY + 140);
  
  // Company Contact Information (Bottom)
  const footerY = summaryY + 160;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Registered Office:', 20, footerY);
  doc.text('Trinity Oil Mills, 337, 339, Paper Mills Road, Bunder Garden, Perambur, Chennai, Tamil Nadu 600011', 20, footerY + 8);
  doc.text('Tel: 99520 55660 / 97109 03330', 20, footerY + 16);
  doc.text('www.Trinityoil.in', 20, footerY + 24);
  doc.text('GST No: 33BOBPS7844L1ZG', 20, footerY + 32);
  
  // Thank you message (centered)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for your business!', 95, footerY + 45);
}


