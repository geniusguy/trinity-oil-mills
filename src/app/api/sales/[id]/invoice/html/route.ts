import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { collectSaleLookupKeys, resolveDynamicRouteId } from '@/lib/saleRouteLookup';

// Function to convert number to words
function convertNumberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  const convertBelow100 = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    const t = Math.floor(n / 10);
    const o = n % 10;
    if (o === 0) return tens[t];
    // Match expected "Ninety-eight" style (hyphen between tens and ones)
    return `${tens[t]}-${ones[o]}`;
  };

  const convertBelow1000 = (n: number): string => {
    if (n < 100) return convertBelow100(n);
    const h = Math.floor(n / 100);
    const rem = n % 100;
    // Match expected "... Five Hundred And Ninety-eight"
    return rem > 0 ? `${ones[h]} Hundred And ${convertBelow100(rem)}` : `${ones[h]} Hundred`;
  };

  // Works for values up to crores (more than enough for invoice totals).
  let n = num;
  let result = '';

  const crore = Math.floor(n / 10000000);
  if (crore > 0) {
    result += `${convertBelow1000(crore)} crore`;
    n %= 10000000;
    if (n > 0) result += ' ';
  }

  const lakh = Math.floor(n / 100000);
  if (lakh > 0) {
    result += `${convertBelow1000(lakh)} lakh`;
    n %= 100000;
    if (n > 0) result += ' ';
  }

  const thousand = Math.floor(n / 1000);
  if (thousand > 0) {
    result += `${convertBelow1000(thousand)} thousand`;
    n %= 1000;
    if (n > 0) result += ' ';
  }

  if (n > 0) {
    result += convertBelow1000(n);
  }

  return result.trim();
}

// Convert 0-99 to words (for paise)
function convertPaiseToWords(n: number): string {
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  if (n >= 20) {
    return (tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')).trim();
  }
  if (n >= 10) return teens[n - 10];
  return ones[n];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const routeId = await resolveDynamicRouteId(params);
    if (!routeId) {
      return NextResponse.json({ error: 'Invalid sale id' }, { status: 400 });
    }

    const { idKeys, invoiceKeys } = collectSaleLookupKeys(routeId);
    const whereParts: string[] = [];
    const whereArgs: unknown[] = [];
    if (idKeys.length > 0) {
      whereParts.push(`TRIM(s.id) IN (${idKeys.map(() => '?').join(',')})`);
      whereArgs.push(...idKeys);
    }
    if (invoiceKeys.length > 0) {
      whereParts.push(`s.invoice_number IN (${invoiceKeys.map(() => '?').join(',')})`);
      whereArgs.push(...invoiceKeys);
    }
    if (whereParts.length === 0) {
      return NextResponse.json({ error: 'Invalid sale id' }, { status: 400 });
    }
    const whereSql = whereParts.join(' OR ');

    const connection = await createConnection();

    const [saleRows] = await connection.execute(
      `
      SELECT s.*, s.notes as customer_name, u.name as userName,
             ca.canteen_name as canteen_name,
             ca.address as canteenAddress, ca.city as canteenCity, ca.state as canteenState, ca.pincode as canteenPincode,
             ca.contact_person, ca.mobile_number as mobile_number,
             ca.billing_address as billing_address, ca.billing_city as billing_city, ca.billing_state as billing_state, ca.billing_pincode as billing_pincode,
             ca.billing_contact_person as billing_contact_person, ca.billing_email as billing_email, ca.billing_mobile as billing_mobile,
             ca.delivery_email as delivery_email,
             ca.gst_number as gst_number
      FROM sales s
      LEFT JOIN users u ON BINARY u.id = BINARY s.user_id
      LEFT JOIN canteen_addresses ca ON BINARY ca.id = BINARY s.canteen_address_id
      WHERE ${whereSql}
      LIMIT 1
    `,
      whereArgs
    );

    if (!Array.isArray(saleRows) || saleRows.length === 0) {
      await connection.end();
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const canonicalId = String((saleRows[0] as { id?: string }).id ?? '').trim();
    if (!canonicalId) {
      await connection.end();
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const [itemRows] = await connection.execute(
      `
      SELECT si.*, p.name as productName, p.name as product_name, p.unit
      FROM sale_items si
      LEFT JOIN products p ON BINARY p.id = BINARY si.product_id
      WHERE si.sale_id = ?
      ORDER BY si.id
    `,
      [canonicalId]
    );

    await connection.end();

    const sale = saleRows[0] as any;
    const items = itemRows as any[];
    const isCanteen = sale.sale_type === 'canteen';
    const CASTOR_200ML_NEW_ID = '68539';
    const CASTOR_200ML_NEW_BASE_PRICE = 76.19; // GST extra base rate required for 68539

    const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${sale.invoice_number}</title>
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
                <strong>Invoice Date:</strong> ${(sale.invoice_date ? new Date(sale.invoice_date) : new Date(sale.created_at)).toLocaleDateString('en-GB')}
            </td>
            <td class="bg-accent" style="border-top: 1px solid #c0c0c0; border-bottom: 1px solid #c0c0c0; border-left: none; border-right: none;"></td>
            <td class="bg-accent invoice-label text-right" style="font-size: 12pt; border-right: 2px solid #2d4e52; border-top: 1px solid #c0c0c0; border-bottom: 1px solid #c0c0c0; border-left: none;">
                <strong>Invoice #:</strong> ${sale.invoice_number}
            </td>
        </tr>
        
        <!-- MERGED BILLING AND DELIVERY ADDRESSES -->
        <tr style="height: 65px;">
            <td class="bg-header" style="vertical-align: top;" colspan="4">
                <div style="display: flex; width: 100%;">
                    <!-- Billing Address - Left Half (billing address + billing person name + email) -->
                    <div style="width: 50%; padding-right: 20px;">
                        <div style="font-weight: bold; color: #2d4e52; margin-bottom: 8px; font-size: 12pt;">Billing To:</div>
                        <div style="color: #2d4e52; line-height: 1.4; font-size: 11pt;">
                            ${!isCanteen ? (sale.customer_name || 'Walk-in Customer') + '<br>' : ''}
                            ${(() => {
                              if (!isCanteen) return 'Walk-in Customer';
                              const addr = (sale.billing_address || sale.canteenAddress || '').toString().trim();
                              const city = (sale.billing_city || sale.canteenCity || '').toString().trim();
                              const state = (sale.billing_state || sale.canteenState || '').toString().trim();
                              const pin = (sale.billing_pincode || sale.canteenPincode || '').toString().trim();
                              const parts = [addr];
                              if (city || state || pin) parts.push([city, state].filter(Boolean).join(', ') + (pin ? ' - ' + pin : ''));
                              return parts.filter(Boolean).join('<br>') || '—';
                            })()}<br>
                            ${isCanteen && (sale.billing_contact_person || sale.billing_email) ? (
                              (sale.billing_contact_person ? (sale.billing_contact_person + (sale.billing_email ? ' | ' + sale.billing_email : '')) : (sale.billing_email || ''))
                            ) : ''}
                            ${isCanteen && (sale.billing_contact_person || sale.billing_email) ? '<br>' : ''}${isCanteen && sale.billing_mobile ? ('Phone: ' + sale.billing_mobile + '<br>') : ''}GSTIN: ${isCanteen ? (sale.gst_number || 'N/A') : 'N/A'}
                        </div>
                    </div>
                    <!-- Delivery Address - Right Half -->
                    <div style="width: 50%; padding-left: 20px;">
                        <div style="font-weight: bold; color: #2d4e52; margin-bottom: 8px; font-size: 12pt;">Delivered To:</div>
                        <div style="color: #2d4e52; line-height: 1.4; font-size: 11pt;">
                            ${isCanteen ? (sale.canteen_name || 'N/A') : (sale.customer_name || 'Walk-in Customer')}<br>
                            ${(() => {
                              if (!isCanteen) return 'Walk-in Customer';
                              const addr = (sale.canteenAddress || '').toString().trim();
                              const city = (sale.canteenCity || '').toString().trim();
                              const state = (sale.canteenState || '').toString().trim();
                              const pin = (sale.canteenPincode || '').toString().trim();
                              const parts = [addr];
                              if (city || state || pin) parts.push([city, state].filter(Boolean).join(', ') + (pin ? ' - ' + pin : ''));
                              return parts.filter(Boolean).join('<br>') || '—';
                            })()}<br>
                            Contact: ${isCanteen ? ((sale.contact_person || 'N/A') + (sale.mobile_number ? ' - ' + sale.mobile_number : '')) : 'N/A'}<br>
                            ${isCanteen && sale.delivery_email ? ('Delivery Email: ' + sale.delivery_email) : ''}
                        </div>
                    </div>
                </div>
            </td>
        </tr>
        <!-- Blank line below billing/delivery -->
        <tr style="height: 14px;"><td class="bg-header" colspan="4" style="border-left: 2px solid #2d4e52; border-right: 2px solid #2d4e52; border-bottom: 1px solid #c0c0c0; border-top: none; padding: 0; line-height: 0;"></td></tr>
        
        <!-- ORDER HEADER -->
        <tr style="height: 32px;">
            <td class="bg-dark text-center font-bold order-col-1">Order No. & Date</td>
            <td class="bg-dark text-center font-bold order-col-2">Mode of Order</td>
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
                return mode;
            })()}</td>
            <td class="bg-white text-center order-col-3">${(() => {
                if (!isCanteen) return '0';

                const extractMl = (text: string) => {
                  const m = (text || '').toLowerCase().match(/(\d+(?:\.\d+)?)\D*ml\b/);
                  if (!m) return null;
                  const ml = Number(m[1]);
                  return Number.isFinite(ml) ? ml : null;
                };

                const totalNos200ml = (items as any[]).reduce((acc, item) => {
                  const qty = Number(item.quantity) || 0;
                  const name = (item.productName || item.product_name || item.name || '') as string;
                  const unit = (item.unit || item.product_unit || '') as string;
                  const combined = `${name} ${unit}`.trim();
                  const ml = extractMl(combined);
                  return ml === 200 ? acc + qty : acc;
                }, 0);

                const nosPerBox = 40;
                const boxes = Math.ceil(totalNos200ml / nosPerBox);

                return `${boxes}`;
            })()}</td>
            <td class="bg-white text-center order-col-4">${(() => {
                // Gross weight in kg: parse volume from product name (e.g. 200ml, 1L), then qty * weight per unit.
                function getWeightPerUnitKg(name) {
                    const n = (name || '').toLowerCase();
                    // Extract volume: "200 ml", "200ml", "500 ml", "1 l", "5l", "16 l" etc.
                    const mlMatch = n.match(/\b(\d+)\s*ml/);
                    if (mlMatch) {
                        const ml = parseInt(mlMatch[1], 10);
                        if (ml <= 250) return 0.2;    // 200ml bottle: 40 x 200ml = 8 L = 8 kg
                        if (ml <= 600) return 0.5;   // 500ml: 1 L ≈ 1 kg
                        return (ml / 1000);           // 1 L = 1 kg
                    }
                    const literMatch = n.match(/\b(16|5|1)\s*l(it(er|re))?/);
                    if (literMatch) {
                        const num = parseInt(literMatch[1], 10);
                        if (num >= 16) return 16;   // 16L = 16 kg
                        if (num >= 5) return 5;     // 5L = 5 kg
                        return 1;                   // 1L = 1 kg
                    }
                    if (/\b16\b/.test(n) && (n.includes('l') || n.includes('tin'))) return 16;
                    if (/\b5\s*l|\b5l\b/.test(n)) return 5;
                    if (/\b1\s*l|\b1l\b|\b1\s*liter|\b1\s*litre/.test(n)) return 1;
                    if (n.includes('500') && (n.includes('ml') || n.includes('0.5'))) return 0.5;  // 500ml = 0.5 kg
                    if (n.includes('200') || n.includes('0.2')) return 0.2;
                    return 0.2;   // default: assume 200ml (40 x 200ml = 8 kg)
                }
                const totalKg = items.reduce((sum, item) => {
                    const qty = Number(item.quantity) || 0;
                    const name = item.productName || item.product_name || '';
                    return sum + qty * getWeightPerUnitKg(name);
                }, 0);
                return totalKg.toFixed(2);
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
                const qty = Number(item.quantity) || 0;
                const lineTotalFinal = Number(item.total_amount || 0); // stored line total (may be inclusive depending on mode)
                const lineGst = Number(item.gst_amount || 0);
                const unitPriceStored = Number(item.unit_price || 0);   // stored unit price (inclusive for GST-included mode; exclusive for GST-extra mode)

                // Determine how this line was stored:
                // - GST-included mode: total_amount ≈ unit_price * qty
                // - GST-extra mode:    total_amount ≈ (unit_price * qty) + gst_amount
                const approx = (a, b) => Math.abs(Number(a) - Number(b)) < 0.02;
                const looksIncluded = approx(unitPriceStored * qty, lineTotalFinal);

                // We always want to PRINT Rate and Amount as GST-EXCLUDING (as per latest requirement/output).
                // So derive the taxable line amount & rate accordingly.
                let taxableLineAmount = looksIncluded ? (lineTotalFinal - lineGst) : (unitPriceStored * qty);
                let taxableUnitRate = qty > 0 ? (taxableLineAmount / qty) : 0;

                // Hard requirement: new Castor 200ml code (68539) must print rate as 76.19 (GST extra)
                // even if older rows were stored differently.
                const pid = String(item.product_id || '').trim();
                if (pid === CASTOR_200ML_NEW_ID) {
                  taxableUnitRate = CASTOR_200ML_NEW_BASE_PRICE;
                  taxableLineAmount = CASTOR_200ML_NEW_BASE_PRICE * qty;
                }
                let itemName = (item.productName ?? item.product_name ?? item.name ?? '').toString().trim();
                if (!itemName && (String(item.product_id || '') === '55336' || String(item.product_id || '') === '68539')) itemName = 'TOM-Castor Oil - 200ml';
                if (!itemName) itemName = 'Product';
                const productCode = String(item.product_id ?? '').trim();
                const line1 = productCode ? `${productCode} : ${itemName}` : itemName;
                productRowsHTML += `
                <tr style="height: 35px;">
                    <td class="${bgClass} text-left item-desc" style="padding: 6px 8px; line-height: 1.2; font-size: 10pt;">
                        <strong>${line1}</strong><br>
                        <span style="font-size: 9pt; color: #666;">HSN Code : 15180011</span>
                    </td>
                    <td class="${bgClass} text-center item-qty">${qty.toFixed(2)}</td>
                    <td class="${bgClass} text-right item-total">₹ ${Number(taxableUnitRate.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="${bgClass} text-right item-total">₹ ${Number(taxableLineAmount.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
        ${(() => {
          const round2 = (n: number) => Math.round(n * 100) / 100;

          // Fallback taxable subtotal from sale_items (older rows may have GST-included unit_price).
          let taxableTotalFromItems = 0;
          (items as any[]).forEach((item) => {
            const qty = Number(item.quantity || 0);
            const total = Number(item.total_amount || 0);
            const gst = Number(item.gst_amount || 0);
            const unitStored = Number(item.unit_price || 0);
            const approx = (a: any, b: any) => Math.abs(Number(a) - Number(b)) < 0.02;
            const looksIncluded = approx(unitStored * qty, total);
            const pid = String(item.product_id || '').trim();
            if (pid === CASTOR_200ML_NEW_ID) {
              taxableTotalFromItems += CASTOR_200ML_NEW_BASE_PRICE * qty;
            } else {
              taxableTotalFromItems += looksIncluded ? (total - gst) : (unitStored * qty);
            }
          });
          taxableTotalFromItems = round2(taxableTotalFromItems);

          // Use saved sale totals as source of truth (matches saved "total_amount" with round-off).
          const saleSubtotal = round2(Number(sale.subtotal ?? taxableTotalFromItems));
          const saleTotalInvoiceValueRaw = sale.totalAmount ?? sale.total_amount ?? null;
          // totalInvoiceValue will be computed after the bill-total rounding logic below.

          // GST split (display) must be derived from subtotal.
          const derivedGstAmount = round2(saleSubtotal * 0.05);
          const sgstDisplay = round2(derivedGstAmount / 2);
          const cgstDisplay = round2(derivedGstAmount - sgstDisplay);

          const exactTotal = round2(saleSubtotal + sgstDisplay + cgstDisplay);

          // "Bill total" rounding strategy (to match printed bills):
          // - keep displayed SGST/CGST as precise 2-decimal values
          // - but apply "round off" by truncating each side to whole rupees
          //   for the final total calculation.
          const sgstBillWhole = Math.floor(sgstDisplay);
          const cgstBillWhole = Math.floor(cgstDisplay);
          const gstBill = round2(sgstBillWhole + cgstBillWhole);

          const roundedTotal = round2(saleSubtotal + gstBill);
          const roundedOff = round2(roundedTotal - exactTotal);
          // Use roundedTotal for final invoice value (printed "Total Invoice Value").
          const totalInvoiceValue = roundedTotal;

          const absRoundedOff = Math.abs(roundedOff);
          const roundedOffDisplay = roundedOff < 0 ? `-₹ ${absRoundedOff.toFixed(2)}` : `₹ ${absRoundedOff.toFixed(2)}`;

          return `
        <tr style="height: 25px;">
            <td class="bg-accent border-medium" colspan="2"></td>
            <td class="bg-white total-label text-right border-medium" style="font-size: 10pt; padding: 4px;">Subtotal</td>
            <td class="bg-white total-value text-right border-medium" style="font-size: 10pt; padding: 4px;">₹ ${saleSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        
        <tr style="height: 25px;">
            <td class="bg-accent border-light" colspan="2"></td>
            <td class="bg-white total-label text-right border-light" style="font-size: 10pt; padding: 4px; line-height: 1.1;">SGST / IGST<br>2.5%</td>
            <td class="bg-white total-value text-right border-light" style="font-size: 10pt; padding: 4px;">₹ ${sgstDisplay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        
        <tr style="height: 25px;">
            <td class="bg-accent border-light" colspan="2"></td>
            <td class="bg-white total-label text-right border-light" style="font-size: 10pt; padding: 4px; line-height: 1.1;">CGST / IGST<br>2.5%</td>
            <td class="bg-white total-value text-right border-light" style="font-size: 10pt; padding: 4px;">₹ ${cgstDisplay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>

        <tr style="height: 25px;">
            <td class="bg-accent border-light" colspan="2"></td>
            <td class="bg-white total-label text-right border-light" style="font-size: 10pt; padding: 4px; line-height: 1.1;">Rounded Off</td>
            <td class="bg-white total-value text-right border-light" style="font-size: 10pt; padding: 4px;">${roundedOffDisplay}</td>
        </tr>
        
        <tr style="height: 32px;">
            <td class="bg-accent border-thick" style="padding: 6px 12px; font-size: 10pt; line-height: 1.2;" colspan="2">
                <strong>Amount in Words:</strong><br>
                <em style="font-size: 9pt; color: #666;">${(() => {
                  const totalFixed = round2(totalInvoiceValue);
                  const rupees = Math.floor(totalFixed);
                  const paise = Math.round((totalFixed - rupees) * 100);
                  const rupeesWords = convertNumberToWords(rupees);
                  if (paise > 0) {
                    return `${rupeesWords} And ${convertPaiseToWords(paise)} Paise Only`;
                  }
                  return `${rupeesWords} Only`;
                })()}</em>
            </td>
            <td class="bg-dark final-total text-right border-thick" style="color: white; font-size: 11pt; padding: 6px;">Total Invoice Value</td>
            <td class="bg-dark final-total text-right border-thick" style="color: white; font-size: 13pt; padding: 6px;">₹ ${totalInvoiceValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`;
        })()}
        
        <!-- SIGNATURE SECTION - One row: Customer Signature | Checked By + Prepared By (one box) | For Trinity Oil Mills (fits A4) -->
        <tr style="height: 58px;">
            <td class="bg-white" style="padding: 6px 8px;" colspan="4">
                <div style="display: flex; width: 100%; justify-content: space-between; gap: 4px;">
                    <div class="signature-box" style="flex: 1; text-align: center; padding: 6px; min-height: 44px; display: flex; flex-direction: column; justify-content: flex-end;">
                        <div style="border-bottom: 1px solid #666; margin-bottom: 2px;"></div>
                        <div class="signature-label" style="font-size: 8pt;">Customer Signature</div>
                    </div>
                    <div class="signature-box" style="flex: 1; text-align: center; padding: 4px 6px; min-height: 44px; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div class="signature-line" style="height: 18px;"></div>
                            <div class="signature-label" style="font-size: 8pt;">Checked By</div>
                        </div>
                        <div>
                            <div class="signature-line" style="height: 18px;"></div>
                            <div class="signature-label" style="font-size: 8pt;">Prepared By</div>
                        </div>
                    </div>
                    <div style="flex: 1; border: 1px solid #2d4e52; padding: 6px; min-height: 44px; display: flex; flex-direction: column; justify-content: flex-end;">
                        <div style="border-bottom: 1px solid #666; margin-bottom: 2px;"></div>
                        <div class="signature-label" style="font-size: 8pt; line-height: 1.1;">For Trinity Oil Mills<br>Authorised Signatory</div>
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
                Trinity Oil Mills, 337, 339, Paper Mills Road, Perambur, Chennai, Tamil Nadu 600011<br>
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
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}