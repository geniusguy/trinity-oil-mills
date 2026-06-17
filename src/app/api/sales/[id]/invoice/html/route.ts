import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { collectSaleLookupKeys, resolveDynamicRouteId } from '@/lib/saleRouteLookup';
import { resolveHsnCode } from '@/lib/productHsn';
import { formatInvoiceItemLine } from '@/lib/invoiceDisplay';
import { boxesFromBottleCount, boxesFromSaleItems, casesForSaleLineItem } from '@/lib/canteenSupply';

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
      SELECT si.*, p.name as productName, p.name as product_name, p.unit, p.hsn_code as hsnCode
      FROM sale_items si
      LEFT JOIN products p ON BINARY p.id = BINARY (
        CASE
          WHEN si.product_id IN ('55336', '68539') THEN 'castor-200ml'
          ELSE si.product_id
        END
      )
      WHERE si.sale_id = ?
      ORDER BY si.id
    `,
      [canonicalId]
    );

    await connection.end();

    const sale = saleRows[0] as any;
    const items = itemRows as any[];
    const isCanteen = sale.sale_type === 'canteen';

    const invoiceNoOfBoxes = isCanteen
      ? (() => {
          const fromItems = boxesFromSaleItems(items);
          if (fromItems > 0) return fromItems;
          const storedBottles = Number(sale.total_bottles);
          if (Number.isFinite(storedBottles) && storedBottles > 0) {
            return boxesFromBottleCount(storedBottles);
          }
          return 0;
        })()
      : 0;
    const CASTOR_200ML_NEW_ID = '68539';
    const CASTOR_200ML_NEW_BASE_PRICE = 76.19; // GST extra base rate required for 68539

    function getWeightPerUnitKg(name: string): number {
      const n = (name || '').toLowerCase();
      const mlMatch = n.match(/\b(\d+)\s*ml/);
      if (mlMatch) {
        const ml = parseInt(mlMatch[1], 10);
        if (ml <= 250) return 0.2;
        if (ml <= 600) return 0.5;
        return ml / 1000;
      }
      const literMatch = n.match(/\b(16|5|1)\s*l(it(er|re))?/);
      if (literMatch) {
        const num = parseInt(literMatch[1], 10);
        if (num >= 16) return 16;
        if (num >= 5) return 5;
        return 1;
      }
      if (/\b16\b/.test(n) && (n.includes('l') || n.includes('tin'))) return 16;
      if (/\b5\s*l|\b5l\b/.test(n)) return 5;
      if (/\b1\s*l|\b1l\b|\b1\s*liter|\b1\s*litre/.test(n)) return 1;
      if (n.includes('500') && (n.includes('ml') || n.includes('0.5'))) return 0.5;
      if (n.includes('200') || n.includes('0.2')) return 0.2;
      return 0.2;
    }

    const invoiceGrossWeightKg = items
      .reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const name = String(item.productName || item.product_name || '');
        return sum + qty * getWeightPerUnitKg(name);
      }, 0)
      .toFixed(2);

    const orderModeDisplay = (() => {
      const rawMode = (sale.mode_of_sales || '').toString();
      if (rawMode) {
        if (rawMode.startsWith('email:')) {
          const addr = rawMode.split(':')[1];
          return '📧 ' + (addr && addr.trim() ? addr.trim() : (sale.gst_number && sale.gst_number.trim() ? sale.gst_number.trim() : 'Email'));
        }
        if (rawMode === 'email') {
          const fallbackEmail = (sale.gst_number && sale.gst_number.trim()) ? sale.gst_number.trim() : '';
          return fallbackEmail ? ('📧 ' + fallbackEmail) : '📧 Email';
        }
        if (rawMode === 'phone') return '📞 Phone';
        if (rawMode === 'whatsapp') return '📱 WhatsApp';
        if (rawMode === 'walk_in') return '🚶 Walk-in';
        if (rawMode === 'online') return '💻 Online';
        return rawMode;
      }
      return sale.sale_type === 'canteen' ? '📧 Email' : '🚶 Walk-in';
    })();

    const poLine = `PO NO: ${typeof sale.po_number === 'string' && sale.po_number?.trim() ? sale.po_number : 'N/A'}, Dated: ${sale.po_date ? new Date(sale.po_date).toLocaleDateString('en-GB') : new Date(sale.created_at).toLocaleDateString('en-GB')}`;

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
            width: 100%;
            line-height: 1.3;
            margin: 0;
            padding: 0;
        }

        .invoice-sheet {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
        }
        
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 2px solid #2d4e52;
            word-wrap: break-word;
        }

        /* Item lines only — order block uses its own nested 4-column table */
        .invoice-table col.col-wide { width: 50%; }
        .invoice-table col.col-narrow { width: 9%; }
        .invoice-table col.col-cases-col { width: 9%; }
        .invoice-table col.col-money { width: 16%; }

        .order-block-wrap {
            padding: 0 !important;
            vertical-align: top;
        }

        .header-block-wrap {
            padding: 0 !important;
            vertical-align: top;
        }

        .header-block-table,
        .header-meta-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .header-block-table td,
        .header-meta-table td {
            border: 1px solid #c0c0c0;
            vertical-align: middle;
        }

        .order-block-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .order-block-table td {
            border: 1px solid #c0c0c0;
            vertical-align: middle;
            font-size: 10pt;
        }

        .order-block-table .order-head {
            white-space: nowrap;
            font-size: 9.5pt;
            padding: 10px 8px;
        }

        .order-block-table .order-val {
            padding: 8px;
            font-size: 10pt;
            line-height: 1.2;
        }
        
        .invoice-table > tr > td,
        .invoice-table > tbody > tr > td {
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
            max-width: 100%;
            width: 260px;
            height: auto;
            max-height: 80px;
            object-fit: contain;
            margin: 5px auto;
            display: block;
        }
        
        .invoice-title-cell {
            vertical-align: middle !important;
            text-align: center;
            background-color: #2d4e52 !important;
            border: 1px solid #2d4e52;
            padding: 12px 22px 12px 18px;
            overflow: hidden;
            box-sizing: border-box;
        }

        .invoice-title-text {
            display: inline-block;
            font-size: 48px;
            font-weight: bold;
            color: #ffffff !important;
            font-family: "Times New Roman", Times, serif !important;
            font-style: italic !important;
            white-space: nowrap;
            line-height: 1;
            padding: 2px 10px;
            box-sizing: border-box;
            max-width: 100%;
        }
        
        .doc-types {
            font-size: 9pt;
            line-height: 1.2;
            color: #000;
            font-weight: normal;
        }
        
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
        
        .item-qty, .item-cases {
            font-weight: 600;
            color: #000;
        }
        
        .item-total {
            font-weight: bold;
            color: #2d4e52;
        }
        
        .total-label, .total-value {
            font-weight: bold;
            color: #2d4e52;
            font-size: 11pt;
        }
        
        .final-total {
            font-weight: bold;
            color: #2d4e52;
            font-size: 12pt;
        }
        
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
        
        @media screen {
            .invoice-title-text {
                font-size: 48px !important;
            }
        }

        @media print {
            @page {
                size: A4;
                margin: 4mm;
            }

            body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
                margin: 0;
                padding: 0;
            }

            .invoice-sheet {
                width: 100%;
                max-width: 100%;
            }

            .order-block-table .order-head {
                font-size: 8.5pt !important;
                padding: 8px 4px !important;
            }

            .invoice-table { 
                page-break-inside: avoid;
            }

            /* Large but must fit column — italic “e” needs right padding */
            .invoice-title-text,
            .header-block-table .invoice-title-text {
                font-size: 50px !important;
                line-height: 1 !important;
                padding: 2px 12px !important;
                color: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .header-block-table tr:first-child {
                height: 110px !important;
            }

            .invoice-title-cell {
                padding: 14px 26px 14px 20px !important;
                background-color: #2d4e52 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
            }

            .logo-img {
                width: 260px !important;
                max-width: 100% !important;
                max-height: 80px !important;
                height: auto !important;
            }

            .header-meta-table .invoice-label {
                font-size: 12pt !important;
            }

            .signature-box { min-height: 40px !important; padding: 5px !important; }
            .signature-line { height: 14px !important; margin-bottom: 3px !important; }
            .signature-label { font-size: 8pt !important; line-height: 1.05 !important; }

            .invoice-table tr:nth-last-child(2) td,
            .invoice-table tr:last-child td {
                font-size: 8.5pt !important;
                line-height: 1.1 !important;
                padding-top: 2px !important;
                padding-bottom: 2px !important;
                page-break-inside: avoid !important;
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

    <div class="invoice-sheet">
    <table class="invoice-table">
        <colgroup>
            <col class="col-wide" />
            <col class="col-narrow" />
            <col class="col-cases-col" />
            <col class="col-money" />
            <col class="col-money" />
        </colgroup>
        <!-- HEADER: Logo + Document Type + Invoice title (nested — not tied to item columns) -->
        <tr style="height: 110px;">
            <td class="header-block-wrap" colspan="5" style="border-left: 2px solid #2d4e52; border-top: 2px solid #2d4e52; border-right: 2px solid #2d4e52;">
                <table class="header-block-table">
                    <colgroup>
                        <col style="width: 46%;" />
                        <col style="width: 24%;" />
                        <col style="width: 30%;" />
                    </colgroup>
                    <tr>
                        <td class="bg-header text-center" style="border-left: none; border-top: none; border-bottom: 1px solid #c0c0c0;">
                            <img src="/TOM_logo.png" alt="Trinity Oil Mills" class="logo-img" />
                        </td>
                        <td class="bg-accent text-right doc-types" style="vertical-align: top; padding-top: 10px; border-top: none; border-bottom: 1px solid #c0c0c0;">
                            <div style="font-weight: bold; margin-bottom: 5px; color: #2d4e52;">Document Type:</div>
                            Original ☐<br>Duplicate ☐<br>Triplicate ☐
                        </td>
                        <td class="invoice-title-cell" style="border-right: none; border-top: none; border-bottom: 1px solid #c0c0c0;">
                            <span class="invoice-title-text">Invoice</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        
        <!-- INVOICE DATE + NUMBER -->
        <tr style="height: 35px;">
            <td class="header-block-wrap" colspan="5" style="border-left: 2px solid #2d4e52; border-right: 2px solid #2d4e52;">
                <table class="header-meta-table">
                    <colgroup>
                        <col style="width: 50%;" />
                        <col style="width: 50%;" />
                    </colgroup>
                    <tr>
                        <td class="bg-accent invoice-label" style="font-size: 12pt; border-left: none; border-top: none; border-bottom: 1px solid #c0c0c0;">
                            <strong>Invoice Date:</strong> ${(sale.invoice_date ? new Date(sale.invoice_date) : new Date(sale.created_at)).toLocaleDateString('en-GB')}
                        </td>
                        <td class="bg-accent invoice-label text-right" style="font-size: 12pt; border-right: none; border-top: none; border-bottom: 1px solid #c0c0c0;">
                            <strong>Invoice #:</strong> ${sale.invoice_number}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        
        <!-- MERGED BILLING AND DELIVERY ADDRESSES -->
        <tr style="height: 65px;">
            <td class="bg-header" style="vertical-align: top;" colspan="5">
                <div style="display: flex; width: 100%;">
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
        <tr style="height: 14px;"><td class="bg-header" colspan="5" style="border-left: 2px solid #2d4e52; border-right: 2px solid #2d4e52; border-bottom: 1px solid #c0c0c0; border-top: none; padding: 0; line-height: 0;"></td></tr>
        
        <!-- ORDER BLOCK (nested 4-col table — headers stay on one line, full width) -->
        <tr>
            <td class="order-block-wrap" colspan="5">
                <table class="order-block-table">
                    <colgroup>
                        <col style="width: 34%;" />
                        <col style="width: 18%;" />
                        <col style="width: 24%;" />
                        <col style="width: 24%;" />
                    </colgroup>
                    <tr style="height: 32px;">
                        <td class="bg-dark text-center font-bold order-head">Order No. & Date</td>
                        <td class="bg-dark text-center font-bold order-head">Mode of Order</td>
                        <td class="bg-dark text-center font-bold order-head">Total Number of Cases</td>
                        <td class="bg-dark text-center font-bold order-head">Gross Weight in Kgs</td>
                    </tr>
                    <tr style="height: 28px;">
                        <td class="bg-white text-left order-val">${poLine}</td>
                        <td class="bg-white text-center order-val">${orderModeDisplay}</td>
                        <td class="bg-white text-center order-val">${invoiceNoOfBoxes}</td>
                        <td class="bg-white text-center order-val">${invoiceGrossWeightKg}</td>
                    </tr>
                </table>
            </td>
        </tr>
        
        <!-- ITEMS HEADER -->
        <tr style="height: 28px;">
            <td class="bg-dark text-left font-bold">Item ID & Item Name</td>
            <td class="bg-dark text-center font-bold">Qty</td>
            <td class="bg-dark text-center font-bold">Cases</td>
            <td class="bg-dark text-right font-bold">Unit Price</td>
            <td class="bg-dark text-right font-bold">Line Total</td>
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
                if (!itemName && (String(item.product_id || '') === '55336' || String(item.product_id || '') === '68539')) {
                  itemName = 'TOM-Castor Oil - 200ml';
                }
                const line1 = formatInvoiceItemLine(item.product_id, itemName);
                const hsnCode = resolveHsnCode(item.hsnCode);
                const lineCases = isCanteen ? casesForSaleLineItem(item) : null;
                const casesDisplay = lineCases != null ? String(lineCases) : '—';
                productRowsHTML += `
                <tr style="height: 35px;">
                    <td class="${bgClass} text-left item-desc" style="padding: 6px 8px; line-height: 1.2; font-size: 10pt;">
                        <strong>${line1}</strong><br>
                        <span style="font-size: 9pt; color: #666;">HSN Code : ${hsnCode}</span>
                    </td>
                    <td class="${bgClass} text-center item-qty">${qty.toFixed(2)}</td>
                    <td class="${bgClass} text-center item-cases">${casesDisplay}</td>
                    <td class="${bgClass} text-right item-total">₹ ${Number(taxableUnitRate.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="${bgClass} text-right item-total">₹ ${Number(taxableLineAmount.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>`;
                rowIndex++;
            });
            
            const emptyRowsNeeded = Math.max(0, 4 - Math.max(0, items.length - 1));
            for (let i = 0; i < emptyRowsNeeded; i++) {
                const bgClass = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray';
                productRowsHTML += `
                <tr style="height: 35px;">
                    <td class="${bgClass}"></td>
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
            <td class="bg-accent border-medium" colspan="3"></td>
            <td class="bg-white total-label text-right border-medium" style="font-size: 10pt; padding: 4px;">Subtotal</td>
            <td class="bg-white total-value text-right border-medium" style="font-size: 10pt; padding: 4px;">₹ ${saleSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        
        <tr style="height: 25px;">
            <td class="bg-accent border-light" colspan="3"></td>
            <td class="bg-white total-label text-right border-light" style="font-size: 10pt; padding: 4px; line-height: 1.1;">SGST / IGST<br>2.5%</td>
            <td class="bg-white total-value text-right border-light" style="font-size: 10pt; padding: 4px;">₹ ${sgstDisplay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        
        <tr style="height: 25px;">
            <td class="bg-accent border-light" colspan="3"></td>
            <td class="bg-white total-label text-right border-light" style="font-size: 10pt; padding: 4px; line-height: 1.1;">CGST / IGST<br>2.5%</td>
            <td class="bg-white total-value text-right border-light" style="font-size: 10pt; padding: 4px;">₹ ${cgstDisplay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>

        <tr style="height: 25px;">
            <td class="bg-accent border-light" colspan="3"></td>
            <td class="bg-white total-label text-right border-light" style="font-size: 10pt; padding: 4px; line-height: 1.1;">Rounded Off</td>
            <td class="bg-white total-value text-right border-light" style="font-size: 10pt; padding: 4px;">${roundedOffDisplay}</td>
        </tr>
        
        <tr style="height: 32px;">
            <td class="bg-accent border-thick" style="padding: 6px 12px; font-size: 10pt; line-height: 1.2;" colspan="3">
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
            <td class="bg-white" style="padding: 6px 8px;" colspan="5">
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
            <td class="bg-header text-center font-bold" colspan="5">Whether Tax is Payable Under Reverse Charge Basis - No</td>
        </tr>
        
        <!-- REGISTERED OFFICE -->
        <tr style="height: 55px;">
            <td class="bg-header text-center font-bold" colspan="5" style="font-size: 10pt;">
                <div style="font-weight: bold; color: #2d4e52; margin-bottom: 8px;">Registered Office:</div>
                Trinity Oil Mills, 337, 339, Paper Mills Road, Perambur, Chennai, Tamil Nadu 600011<br>
                Tel: 99520 55660 / 97109 03330 | www.Trinityoil.in | GST No: 33BOBPS7844L1ZG
            </td>
        </tr>
        
        <!-- THANK YOU -->
        <tr style="height: 22px;">
            <td class="bg-white text-center font-bold" style="border-bottom: 1px solid #000;" colspan="5">Thank you for your business!</td>
        </tr>
    </table>
    </div>

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