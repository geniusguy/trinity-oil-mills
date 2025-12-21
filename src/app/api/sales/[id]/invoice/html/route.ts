import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';

// Function to format invoice number as 00056/2025
function formatInvoiceNumber(invoiceNumber: string, invoiceDate: string): string {
  const numberMatch = invoiceNumber.match(/(\d+)/);
  if (!numberMatch) return invoiceNumber;
  
  const number = numberMatch[1];
  const invoiceYear = new Date(invoiceDate).getFullYear();
  const paddedNumber = number.padStart(5, '0');
  
  return `${paddedNumber}/${invoiceYear}`;
}

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
  
  return result.trim() + ' Only';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const connection = await createConnection();

    const [saleRows] = await connection.execute(`
      SELECT s.*, u.name as userName,
             ca.name as canteen_name, ca.address as canteenAddress, ca.contact_person, ca.phone as mobile_number, ca.email as gst_number
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN canteen_addresses ca ON s.canteen_address_id = ca.id
      WHERE s.id = ?
    `, [id]);

    const [itemRows] = await connection.execute(`
      SELECT si.*, p.name as productName, p.unit
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
      ORDER BY si.id
    `, [id]);

    await connection.end();

    if (!Array.isArray(saleRows) || saleRows.length === 0) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const sale = saleRows[0] as any;
    const items = itemRows as any[];
    const isCanteen = sale.sale_type === 'canteen';

    const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${formatInvoiceNumber(sale.invoice_number, sale.created_at)}</title>
    <style>
        @page { 
            size: A4; 
            margin: 6mm; 
        }
        
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        
        body {
            font-family: "Segoe UI", "Quattrocento Sans", Arial, sans-serif;
            font-size: 11pt;
            color: #000;
            background: #fff;
            width: 210mm;
            height: 297mm;
            line-height: 1.3;
        }
        
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
            border: 2px solid #2d4e52;
            word-wrap: break-word;
        }
        
        .invoice-table td {
            border: 1px solid #c0c0c0;
            vertical-align: middle;
            font-size: 11pt;
            word-wrap: break-word;
            overflow: hidden;
        }
        
        /* Professional border styles */
        .border-thick { border: 2px solid #2d4e52 !important; }
        .border-medium { border: 1.5px solid #666 !important; }
        .border-light { border: 1px solid #c0c0c0 !important; }
        .border-none { border: none !important; }
        .border-top-thick { border-top: 2px solid #2d4e52 !important; }
        .border-bottom-thick { border-bottom: 2px solid #2d4e52 !important; }
        .border-right-thick { border-right: 2px solid #2d4e52 !important; }
        .border-left-thick { border-left: 2px solid #2d4e52 !important; }
        
        /* Background colors - professional styling */
        .bg-header { 
            background-color: #f8f9fa; 
            padding: 10px 15px;
            border: 1px solid #c0c0c0;
        }
        .bg-dark { 
            background-color: #2d4e52; 
            color: #fff; 
            padding: 12px 15px;
            border: 1px solid #2d4e52;
            font-weight: bold;
        }
        .bg-white { 
            background-color: #fff; 
            padding: 10px 15px;
            border: 1px solid #c0c0c0;
        }
        .bg-accent {
            background-color: #e8f4f8;
            padding: 10px 15px;
            border: 1px solid #c0c0c0;
        }
        .bg-gray {
            background-color: #f5f5f5;
            padding: 10px 15px;
            border: 1px solid #c0c0c0;
        }
        
        /* Text alignment */
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .text-dark { color: #2d4e52; }
        
        /* Logo styling */
        .logo-img {
            width: 280px;
            height: 80px;
            object-fit: contain;
            margin: 5px auto;
            display: block;
        }
        
        /* Invoice title - very big, same size as logo */
        .invoice-title {
            font-size: 48px !important;
            font-weight: bold;
            color: #ffffff !important;
            font-family: "Times New Roman", Times, serif !important;
            font-style: italic !important;
        }
        
        /* Document types */
        .doc-types {
            font-size: 9pt;
            line-height: 1.2;
            color: #000;
            font-weight: normal;
        }
        
        /* Professional styling for labels */
        .invoice-label {
            font-weight: bold;
            color: #2d4e52;
            font-size: 11pt;
        }
        
        .invoice-value {
            color: #2d4e52;
            font-size: 11pt;
        }
        
        /* Items styling */
        .item-desc {
            font-weight: 500;
            color: #000;
        }
        
        .item-qty {
            font-weight: 600;
            color: #000;
        }
        
        .item-total {
            font-weight: bold;
            color: #2d4e52;
        }
        
        /* HSN code styling */
        .hsn-code {
            font-size: 10pt;
            color: #666;
            font-style: italic;
        }
        
        /* Totals styling */
        .total-label {
            font-weight: bold;
            color: #2d4e52;
            font-size: 11pt;
        }
        
        .total-value {
            font-weight: bold;
            color: #2d4e52;
            font-size: 11pt;
        }
        
        .final-total {
            font-weight: bold;
            color: #2d4e52;
            font-size: 12pt;
        }
        
        /* Simplified order section styling */
        .order-col-1 { width: 35%; }
        .order-col-2 { width: 20%; }
        .order-col-3 { width: 20%; }
        .order-col-4 { width: 25%; }
        
        /* Professional signature styling */
        .signature-box {
            border: 1px solid #2d4e52;
            padding: 15px;
            vertical-align: bottom;
            min-height: 60px;
            position: relative;
        }
        
        .signature-line {
            border-bottom: 1px solid #666;
            margin-bottom: 8px;
            height: 40px;
        }
        
        .signature-label {
            font-weight: bold;
            font-size: 10pt;
            color: #2d4e52;
            text-align: center;
        }
        
        @media print {
            body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
                margin: 0;
                padding: 0;
            }
            
            .invoice-table { 
                page-break-inside: avoid;
            }
            
            .print-controls { 
                display: none; 
            }
        }
        
        .print-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: white;
            padding: 12px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 1px solid #e5e7eb;
        }
        
        .btn {
            padding: 8px 16px;
            margin: 0 4px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            display: inline-block;
            text-align: center;
            transition: all 0.2s ease;
        }
        
        .btn-primary {
            background-color: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background-color: #2563eb;
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background-color: #6b7280;
            color: white;
        }
        
        .btn-secondary:hover {
            background-color: #4b5563;
            transform: translateY(-1px);
        }
    </style>
</head>
<body>
    <!-- Print Controls (hidden during print) -->
    <div class="print-controls no-print">
        <button onclick="window.print()" class="btn btn-primary">
            🖨️ Print Invoice
        </button>
        <button onclick="savePDF()" class="btn btn-secondary">
            📄 Save as PDF
        </button>
    </div>

    <table class="invoice-table">
        <!-- HEADER: Logo and Invoice Title (4 columns) -->
        <tr style="height: 110px;">
            <td class="bg-header text-center" style="width: 40%; border-left: 2px solid #2d4e52; border-top: 2px solid #2d4e52; border-bottom: 1px solid #c0c0c0; border-right: none;" colspan="2">
                <img src="/TOM_logo.png" alt="Trinity Oil Mills" class="logo-img" />
            </td>
            <td class="bg-accent text-right doc-types" style="width: 20%; vertical-align: top; padding-top: 10px; border-top: 2px solid #2d4e52; border-bottom: 1px solid #c0c0c0; border-left: none; border-right: none;">
                <div style="font-weight: bold; margin-bottom: 5px; color: #2d4e52;">Document Type:</div>
                Original ☐<br>Duplicate ☐<br>Triplicate ☐
            </td>
            <td class="bg-dark invoice-title text-center" style="width: 20%; vertical-align: middle; border-right: 2px solid #2d4e52; border-top: 2px solid #2d4e52; border-bottom: 1px solid #c0c0c0; border-left: none;">Invoice</td>
        </tr>
        
        <!-- INVOICE DETAILS (4 columns) -->
        <tr style="height: 35px;">
            <td class="bg-accent invoice-label" style="font-size: 12pt; border-left: 2px solid #2d4e52; border-top: 1px solid #c0c0c0; border-bottom: 1px solid #c0c0c0; border-right: none;" colspan="2">
                <strong>Invoice Date:</strong> ${new Date(sale.created_at).toLocaleDateString('en-GB')}
            </td>
            <td class="bg-accent" style="border-top: 1px solid #c0c0c0; border-bottom: 1px solid #c0c0c0; border-left: none; border-right: none;"></td>
            <td class="bg-accent invoice-label text-right" style="font-size: 12pt; border-right: 2px solid #2d4e52; border-top: 1px solid #c0c0c0; border-bottom: 1px solid #c0c0c0; border-left: none;">
                <strong>Invoice #:</strong> ${formatInvoiceNumber(sale.invoice_number, sale.created_at)}
            </td>
        </tr>
        
        <!-- MERGED BILLING AND DELIVERY ADDRESSES -->
        <tr style="height: 65px;">
            <td class="bg-header" style="vertical-align: top;" colspan="4">
                <div style="display: flex; width: 100%;">
                    <!-- Billing Address - Left Half -->
                    <div style="width: 50%; padding-right: 20px;">
                        <div style="font-weight: bold; color: #2d4e52; margin-bottom: 8px; font-size: 12pt;">Billing To:</div>
                        <div style="color: #2d4e52; line-height: 1.4; font-size: 11pt;">
                            ${isCanteen ? (sale.canteen_name || 'N/A') : (sale.customer_name || 'Walk-in Customer')}<br>
                            ${isCanteen ? (sale.canteenAddress || '') : 'Walk-in Customer'}<br>
                            GSTIN: ${isCanteen ? (sale.canteenGst || 'N/A') : 'N/A'}
                        </div>
                    </div>
                    <!-- Delivery Address - Right Half -->
                    <div style="width: 50%; padding-left: 20px;">
                        <div style="font-weight: bold; color: #2d4e52; margin-bottom: 8px; font-size: 12pt;">Delivered To:</div>
                        <div style="color: #2d4e52; line-height: 1.4; font-size: 11pt;">
                            ${isCanteen ? (sale.canteen_name || 'N/A') : (sale.customer_name || 'Walk-in Customer')}<br>
                            ${isCanteen ? (sale.canteenAddress || '') : 'Walk-in Customer'}<br>
                            Contact: ${isCanteen ? ((sale.contact_person || 'N/A') + ' - ' + (sale.mobile_number || 'N/A')) : 'N/A'}
                        </div>
                    </div>
                </div>
            </td>
        </tr>
        
        <!-- ORDER HEADER -->
        <tr style="height: 32px;">
            <td class="bg-dark text-center font-bold order-col-1">Order No. & Date</td>
            <td class="bg-dark text-center font-bold order-col-2">Mode of Order / Payment</td>
            <td class="bg-dark text-center font-bold order-col-3">No. of Boxes</td>
            <td class="bg-dark text-center font-bold order-col-4">Gross Weight in Kgs</td>
        </tr>
        
        <!-- ORDER DETAILS -->
        <tr style="height: 28px;">
            <td class="bg-white text-left order-col-1" style="font-size: 10pt; line-height: 1.2; padding: 4px 8px;">PO NO: ${typeof sale.po_number === 'string' && sale.po_number?.trim() ? sale.po_number : 'N/A'},<br>Dated: ${sale.po_date ? new Date(sale.po_date).toLocaleDateString('en-GB') : new Date(sale.created_at).toLocaleDateString('en-GB')}</td>
            <td class="bg-white text-center order-col-2" style="font-size: 9pt; padding: 4px;">${(() => {
                const rawMode = (sale.mode_of_sales || '').toString();
                let mode = '';
                if (rawMode) {
                  mode = rawMode.startsWith('email:') ? ( () => {
                          const addr = rawMode.split(':')[1];
                          return '📧 ' + (addr && addr.trim() ? addr.trim() : (sale.gst_number && sale.gst_number.trim() ? sale.gst_number.trim() : 'Email'));
                        })()
                        : rawMode === 'email' ? ( () => {
                            const fallbackEmail = (sale.gst_number && sale.gst_number.trim()) ? sale.gst_number.trim() : '';
                            return fallbackEmail ? ('📧 ' + fallbackEmail) : '📧 Email';
                          })()
                        : rawMode === 'phone' ? '📞 Phone'
                        : rawMode === 'whatsapp' ? '📱 WhatsApp'
                        : rawMode === 'walk_in' ? '🚶 Walk-in'
                        : rawMode === 'online' ? '💻 Online'
                        : rawMode;
                } else {
                  // Fallback defaults when not stored
                  mode = (sale.sale_type === 'canteen') ? '📧 Email' : '🚶 Walk-in';
                }
                const pm = (sale.payment_method || '').toString().toLowerCase();
                let payment = '';
                if (pm) {
                  payment = pm === 'cash' ? '💵 Cash'
                          : pm === 'upi' ? '📱 UPI'
                          : pm === 'card' ? '💳 Card'
                          : pm === 'credit' ? '🏦 Credit'
                          : (sale.payment_method || 'N/A');
                } else {
                  // Fallback defaults when not stored
                  payment = (sale.sale_type === 'canteen') ? '🏦 Credit' : '💵 Cash';
                }
                return `${mode} | ${payment}`;
            })()}</td>
            <td class="bg-white text-center order-col-3">${isCanteen ? '1' : '0'}</td>
            <td class="bg-white text-center order-col-4">${(() => {
                // Calculate gross weight based on product type and quantity
                const totalWeight = items.reduce((total, item) => {
                    const quantity = Number(item.quantity) || 0;
                    const productName = (item.productName || '').toLowerCase();
                    
                    // Weight calculation based on product size
                    let weightPerUnit = 0.5; // default weight
                    
                    if (productName.includes('200ml') || productName.includes('0.2')) {
                        weightPerUnit = 0.25; // 200ml bottle
                    } else if (productName.includes('500ml') || productName.includes('0.5')) {
                        weightPerUnit = 0.6; // 500ml bottle  
                    } else if (productName.includes('1l') || productName.includes('1 l') || productName.includes('liter') || productName.includes('litre')) {
                        weightPerUnit = 1.1; // 1 liter bottle
                    } else if (productName.includes('5l') || productName.includes('5 l')) {
                        weightPerUnit = 5.5; // 5 liter container
                    } else if (productName.includes('tin') && productName.includes('16')) {
                        weightPerUnit = 16.5; // 16L tin
                    }
                    
                    return total + (quantity * weightPerUnit);
                }, 0);
                
                return totalWeight.toFixed(2);
            })()}</td>
        </tr>
        
        <!-- ITEMS HEADER -->
        <tr style="height: 28px;">
            <td class="bg-dark text-left font-bold" style="width: 35%;">Item ID & Item Name</td>
            <td class="bg-dark text-center font-bold" style="width: 20%;">Qty</td>
            <td class="bg-dark text-right font-bold" style="width: 20%;">Unit Price</td>
            <td class="bg-dark text-right font-bold" style="width: 25%;">Line Total</td>
        </tr>
        
        <!-- PRODUCT ROWS - Show actual items + 4 empty rows with alternating colors -->
        ${(() => {
            let productRowsHTML = '';
            let rowIndex = 0;
            
            // Show actual items first with alternating colors
            items.forEach((item, index) => {
                const bgClass = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray';
                productRowsHTML += `
                <tr style="height: 35px;">
                    <td class="${bgClass} text-left item-desc" style="padding: 6px 8px; line-height: 1.2; font-size: 10pt;">
                        <strong>${item.productName || 'Product'}</strong><br>
                        <span style="font-size: 9pt; color: #666;">${item.productName || 'Product'} | HSN Code: ${item.productName && item.productName.includes('Oil') ? '15180011' : '15180011'}</span>
                    </td>
                    <td class="${bgClass} text-center item-qty">${Number(item.quantity).toFixed(2)}</td>
                    <td class="${bgClass} text-right item-total">₹ ${Number(item.unit_price || 0).toFixed(0)}</td>
                    <td class="${bgClass} text-right item-total">₹ ${Number(item.total_amount || 0).toLocaleString()}</td>
                </tr>`;
                rowIndex++;
            });
            
            // Add 4 empty rows for manual entry (increased from 3 to 4)
            const emptyRowsNeeded = Math.max(0, 4 - Math.max(0, items.length - 1));
            for (let i = 0; i < emptyRowsNeeded; i++) {
                const bgClass = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray';
                productRowsHTML += `
                <tr style="height: 35px;">
                    <td class="${bgClass}"></td>
                    <td class="${bgClass}"></td>
                    <td class="${bgClass}"></td>
                    <td class="${bgClass}"></td>
                </tr>`;
                rowIndex++;
            }
            
            return productRowsHTML;
        })()}
        
        <!-- TOTALS SECTION - Optimized Layout with 4 columns -->
        <tr style="height: 25px;">
            <td class="bg-accent border-medium" colspan="2"></td>
            <td class="bg-white total-label text-right border-medium" style="font-size: 10pt; padding: 4px;">Subtotal</td>
            <td class="bg-white total-value text-right border-medium" style="font-size: 10pt; padding: 4px;">₹ ${Number(sale.subtotal || 0).toLocaleString()}</td>
        </tr>
        
        <tr style="height: 25px;">
            <td class="bg-accent border-light" colspan="2"></td>
            <td class="bg-white total-label text-right border-light" style="font-size: 10pt; padding: 4px; line-height: 1.1;">SGST / IGST<br>2.5%</td>
            <td class="bg-white total-value text-right border-light" style="font-size: 10pt; padding: 4px;">₹ ${(Number(sale.gst_amount || 0) / 2).toFixed(2)}</td>
        </tr>
        
        <tr style="height: 25px;">
            <td class="bg-accent border-light" colspan="2"></td>
            <td class="bg-white total-label text-right border-light" style="font-size: 10pt; padding: 4px; line-height: 1.1;">CGST / IGST<br>2.5%</td>
            <td class="bg-white total-value text-right border-light" style="font-size: 10pt; padding: 4px;">₹ ${(Number(sale.gst_amount || 0) / 2).toFixed(2)}</td>
        </tr>
        
        <tr style="height: 32px;">
            <td class="bg-accent border-thick" style="padding: 6px 12px; font-size: 10pt; line-height: 1.2;" colspan="2">
                <strong>Amount in Words:</strong><br>
                <em style="font-size: 9pt; color: #666;">${convertNumberToWords(Math.floor(Number(sale.total_amount || 0)))}</em>
            </td>
            <td class="bg-dark final-total text-right border-thick" style="color: white; font-size: 11pt; padding: 6px;">Total Invoice Value</td>
            <td class="bg-dark final-total text-right border-thick" style="color: white; font-size: 13pt; padding: 6px;">₹ ${Number(sale.total_amount || 0).toLocaleString()}</td>
        </tr>
        
        <!-- SIGNATURE SECTION - Balanced Single Row Layout -->
        <tr style="height: 65px;">
            <td class="bg-white" style="padding: 10px;" colspan="4">
                <div style="display: flex; width: 100%; justify-content: space-between;">
                    <!-- Customer Signature -->
                    <div class="signature-box" style="width: 18%; margin-right: 2%;">
                        <div class="signature-line"></div>
                        <div class="signature-label" style="font-size: 9pt;">Customer Signature</div>
                    </div>
                    <!-- Prepared By -->
                    <div class="signature-box" style="width: 18%; margin-right: 2%;">
                        <div class="signature-line"></div>
                        <div class="signature-label" style="font-size: 9pt;">Prepared By</div>
                    </div>
                    <!-- Checked By -->
                    <div class="signature-box" style="width: 24%; margin-right: 2%;">
                        <div class="signature-line"></div>
                        <div class="signature-label" style="font-size: 9pt;">Checked By</div>
                    </div>
                    <!-- For Trinity Oil Mills & Authorised Signatory -->
                    <div style="width: 32%; border: 1px solid #2d4e52; padding: 8px; vertical-align: bottom; min-height: 45px;">
                        <div style="height: 12px; margin-bottom: 6px;"></div>
                        <div class="signature-label" style="font-size: 9pt; margin-bottom: 10px;">For Trinity Oil Mills</div>
                        <div style="height: 12px; border-bottom: 1px solid #666; margin-bottom: 6px;"></div>
                        <div class="signature-label" style="font-size: 9pt;">Authorised Signatory</div>
                    </div>
                </div>
            </td>
        </tr>
        
        <!-- TAX INFORMATION -->
        <tr style="height: 22px;">
            <td class="bg-header text-center font-bold" colspan="4">Whether Tax is Payable Under Reverse Charge Basis - No</td>
        </tr>
        
        <!-- REGISTERED OFFICE -->
        <tr style="height: 55px;">
            <td class="bg-header text-center font-bold" colspan="4" style="font-size: 10pt;">
                <div style="font-weight: bold; color: #2d4e52; margin-bottom: 8px;">Registered Office:</div>
                Trinity Oil Mills, 337, 339, Paper Mills Road, Bunder Garden, Perambur, Chennai, Tamil Nadu 600011<br>
                Tel: 99520 55660 / 97109 03330 | www.Trinityoil.in | GST No: 33BOBPS7844L1ZG
            </td>
        </tr>
        
        <!-- THANK YOU -->
        <tr style="height: 22px;">
            <td class="bg-white text-center font-bold" style="border-bottom: 1px solid #000;" colspan="4">Thank you for your business!</td>
        </tr>
    </table>

    <script>
        function savePDF() {
            // Hide the print controls temporarily
            const controls = document.querySelector('.print-controls');
            if (controls) controls.style.display = 'none';
            
            // Trigger browser's print dialog which allows saving as PDF
            window.print();
            
            // Show controls again after a brief delay
            setTimeout(() => {
                if (controls) controls.style.display = 'block';
            }, 500);
        }
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Ctrl+P for print
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
            // Ctrl+S for save as PDF
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                savePDF();
            }
        });
        
        // Add title with invoice number
        document.title = 'Invoice - ${sale.invoice_number}';
    </script>
</body>
</html>`;

    return new Response(invoiceHTML, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}