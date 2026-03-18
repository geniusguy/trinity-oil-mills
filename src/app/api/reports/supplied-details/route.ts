import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';

function parsePackSizeLiters(productName: string): number | null {
  const name = (productName || '').toLowerCase();
  // Prefer explicit ml first
  const mlMatch = name.match(/(\d+)\s*ml/);
  if (mlMatch) {
    const ml = Number(mlMatch[1]);
    if (Number.isFinite(ml) && ml > 0) return ml / 1000;
  }
  // Then liters: "1l", "1 l", "1 liter", "5l"
  const lMatch = name.match(/(\d+(?:\.\d+)?)\s*(l|liter|litre)\b/);
  if (lMatch) {
    const l = Number(lMatch[1]);
    if (Number.isFinite(l) && l > 0) return l;
  }
  return null;
}

function isTinSize(liters: number | null): boolean {
  // Business definition: treat >=5L packs as tins
  return liters !== null && liters >= 5;
}

function isBottleSize(liters: number | null): boolean {
  // Treat <5L packs as bottles (200ml/500ml/1L/2L/etc)
  return liters !== null && liters > 0 && liters < 5;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'accountant', 'retail_staff'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate'); // YYYY-MM-DD

    const conn = await createConnection();
    try {
      const where: string[] = ['s.sale_type = "canteen"'];
      const params: any[] = [];
      if (startDate) {
        where.push('s.created_at >= ?');
        params.push(`${startDate} 00:00:00`);
      }
      if (endDate) {
        where.push('s.created_at <= ?');
        params.push(`${endDate} 23:59:59`);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const [rows]: any = await conn.query(
        `
        SELECT
          s.id as saleId,
          s.invoice_number as invoiceNumber,
          s.created_at as createdAt,
          s.invoice_date as invoiceDate,
          s.po_number as poNumber,
          s.po_date as poDate,
          s.subtotal as subtotal,
          s.kept_on_display as keptOnDisplay,
          s.mode_of_sales as modeOfSales,
          s.courier_weight_or_rs as courierWeightOrRs,
          s.mail_sent_ho_date as mailSentHoDate,
          s.canteen_address_id as canteenId,
          ca.canteen_name as canteenName,
          si.id as itemId,
          si.quantity as quantity,
          p.name as productName
        FROM sales s
        LEFT JOIN canteen_addresses ca ON ca.id = s.canteen_address_id
        LEFT JOIN sale_items si ON si.sale_id = s.id
        LEFT JOIN products p ON p.id = si.product_id
        ${whereSql}
        ORDER BY s.created_at DESC
        `,
        params
      );

    const grouped = rows.reduce((acc: any, r: any) => {
      const id = r.saleId;
      if (!acc[id]) {
        const subtotal = Number(r.subtotal?.toString?.() ?? r.subtotal ?? 0);
        const sgst = Math.round(subtotal * 0.025);
        const cgst = Math.round(subtotal * 0.025);
        acc[id] = {
          id,
          invoiceNumber: r.invoiceNumber,
          invoiceDate: r.invoiceDate || null,
          createdAt: r.createdAt,
          canteenId: r.canteenId,
          canteenName: r.canteenName || 'Unknown',
          poNumber: r.poNumber,
          poDate: r.poDate,
          noOfBottles: 0,
          liters: 0,
          billAmount: subtotal,
          keptOnDisplay: !!r.keptOnDisplay,
          sgst,
          cgst,
          totalGst: sgst + cgst,
          noOfTins: 0,
          mailSentHO: r.mailSentHoDate ? true : false,
          mailSentHoDate: r.mailSentHoDate || null,
          courierWeightOrRs: r.courierWeightOrRs || null,
        };
      }

      if (r.itemId && r.productName) {
        const qty = Number(r.quantity?.toString?.() ?? r.quantity ?? 0);
        const litersPer = parsePackSizeLiters(String(r.productName));
        if (isBottleSize(litersPer)) acc[id].noOfBottles += qty;
        if (isTinSize(litersPer)) acc[id].noOfTins += qty;
        if (litersPer !== null) acc[id].liters += qty * litersPer;
      }
      return acc;
    }, {});

    const data = Object.values(grouped).map((x: any) => ({
      ...x,
      // normalize numeric
      noOfBottles: Number(x.noOfBottles || 0),
      liters: Number((x.liters || 0).toFixed(2)),
      noOfTins: Number(x.noOfTins || 0),
    }));

    return NextResponse.json({ success: true, data });
    } finally {
      await conn.end();
    }
  } catch (error) {
    console.error('Error fetching supplied details:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch supplied details' }, { status: 500 });
  }
}

