import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { tinEquivalentForCanteenLine, CANTEEN_LITERS_PER_TIN } from '@/lib/canteenSupply';
import { canonicalOilGroupKey, displayNameForOilGroup, isOilVolumeProduct } from '@/lib/purchaseVolume';
import { formatFinancialYearLabel, getFinancialYearStartYear } from '@/lib/financialYear';

type PeriodAgg = { tinSum: number };

function bumpTins<K>(map: Map<K, PeriodAgg>, key: K, tins: number) {
  const prev = map.get(key) ?? { tinSum: 0 };
  prev.tinSum += tins;
  map.set(key, prev);
}

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
    const tinsOilKey = searchParams.get('tinsOilKey')?.trim() || null;

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

      // Tins supplied: tin-equivalent = line liters / 15.2 L (same as POST /api/sales total_tins), pack size from name+unit only
      const [tinsRows]: any = await conn.query(
        `
        SELECT
          si.quantity AS quantity,
          p.id AS productId,
          p.name AS productName,
          p.unit AS unit,
          p.category AS category,
          COALESCE(s.invoice_date, s.created_at) AS saleDate
        FROM sale_items si
        INNER JOIN sales s ON s.id = si.sale_id
        INNER JOIN products p ON p.id COLLATE utf8mb4_general_ci = si.product_id COLLATE utf8mb4_general_ci
        ${whereSql}
        `,
        params,
      );

      const byYear = new Map<number, PeriodAgg>();
      const byYearMonth = new Map<string, PeriodAgg>();
      const byOil = new Map<
        string,
        { key: string; productName: string; totalTins: number; tinAny: boolean }
      >();
      let totalTinCount = 0;
      let anyTinLine = false;
      let skippedTinLines = 0;

      for (const tr of tinsRows as any[]) {
        const qty = Number(tr.quantity);
        const productName = String(tr.productName ?? '');
        const unit = String(tr.unit ?? '');
        const category = String(tr.category ?? '');
        const groupKey = canonicalOilGroupKey(String(tr.productId), productName, unit);
        const tins = tinEquivalentForCanteenLine(qty, productName, unit, String(tr.productId));
        const d = tr.saleDate ? new Date(tr.saleDate) : null;

        const oilName = displayNameForOilGroup(groupKey, productName);
        const o = byOil.get(groupKey) ?? { key: groupKey, productName: oilName, totalTins: 0, tinAny: false };
        if (tins != null) {
          o.totalTins += tins;
          o.tinAny = true;
        } else if (isOilVolumeProduct(category)) {
          skippedTinLines++;
        }
        byOil.set(groupKey, o);

        if (tinsOilKey && groupKey !== tinsOilKey) continue;

        if (tins != null) {
          anyTinLine = true;
          totalTinCount += tins;
          if (d && !Number.isNaN(d.getTime())) {
            const fyStart = getFinancialYearStartYear(d);
            const calY = d.getFullYear();
            const m = d.getMonth() + 1;
            const ym = `${calY}-${String(m).padStart(2, '0')}`;
            bumpTins(byYear, fyStart, tins);
            bumpTins(byYearMonth, ym, tins);
          }
        }
      }

      const byOilList = Array.from(byOil.values())
        .map((x) => ({
          key: x.key,
          productName: x.productName,
          totalTins: x.tinAny ? x.totalTins : null,
        }))
        .sort((a, b) => (b.totalTins ?? 0) - (a.totalTins ?? 0));

      const years = Array.from(byYear.entries())
        .map(([fyStart, p]) => ({
          year: fyStart,
          fyLabel: formatFinancialYearLabel(fyStart),
          totalTins: p.tinSum,
        }))
        .sort((a, b) => b.year - a.year);

      const months = Array.from(byYearMonth.entries())
        .map(([key, p]) => {
          const [yy, mm] = key.split('-').map(Number);
          return {
            year: yy,
            month: mm,
            monthLabel: new Date(yy, mm - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
            totalTins: p.tinSum,
          };
        })
        .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));

      const tinsSupplied = {
        tinsOilKey,
        totalTins: anyTinLine ? Number(totalTinCount.toFixed(6)) : null,
        byYear: years.map((r) => ({ ...r, totalTins: Number(r.totalTins.toFixed(6)) })),
        byMonth: months.map((r) => ({ ...r, totalTins: Number(r.totalTins.toFixed(6)) })),
        byOil: byOilList.map((r) => ({
          ...r,
          totalTins: r.totalTins != null ? Number(r.totalTins.toFixed(6)) : null,
        })),
        /** Same convention as invoice: 15.2 L usable = 1 tin (0.8 L wastage vs 16 L nominal). */
        litersPerTin: CANTEEN_LITERS_PER_TIN,
        skippedLines: skippedTinLines,
      };

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
          s.total_bottles as totalBottles,
          s.total_liters as totalLiters,
          s.total_tins as totalTins,
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
        const hasStoredTotals =
          r.totalBottles !== null && r.totalBottles !== undefined &&
          r.totalLiters !== null && r.totalLiters !== undefined &&
          r.totalTins !== null && r.totalTins !== undefined;
        acc[id] = {
          id,
          invoiceNumber: r.invoiceNumber,
          invoiceDate: r.invoiceDate || null,
          createdAt: r.createdAt,
          canteenId: r.canteenId,
          canteenName: r.canteenName || 'Unknown',
          poNumber: r.poNumber,
          poDate: r.poDate,
          noOfBottles: hasStoredTotals ? Number(r.totalBottles) : 0,
          liters: hasStoredTotals ? Number(r.totalLiters) : 0,
          billAmount: subtotal,
          keptOnDisplay: !!r.keptOnDisplay,
          sgst,
          cgst,
          totalGst: sgst + cgst,
          noOfTins: hasStoredTotals ? Number(r.totalTins) : 0,
          mailSentHO: r.mailSentHoDate ? true : false,
          mailSentHoDate: r.mailSentHoDate || null,
          courierWeightOrRs: r.courierWeightOrRs || null,
          _hasStoredTotals: hasStoredTotals,
        };
      }

      // Only recompute from items when stored totals are NOT present
      if (!acc[id]._hasStoredTotals && r.itemId && r.productName) {
        const qty = Number(r.quantity?.toString?.() ?? r.quantity ?? 0);
        const litersPer = parsePackSizeLiters(String(r.productName));
        if (isBottleSize(litersPer)) acc[id].noOfBottles += qty;
        // Tins are derived from liters in your new definition; keep legacy tin pack counting only as a fallback signal.
        if (litersPer !== null) acc[id].liters += qty * litersPer;
      }
      return acc;
    }, {});

    const data = Object.values(grouped).map((x: any) => ({
      ...x,
      // normalize numeric
      noOfBottles: Number(x.noOfBottles || 0),
      liters: Number((x.liters || 0).toFixed(2)),
      noOfTins: Number((x.noOfTins || 0).toFixed(2)),
    }));

    return NextResponse.json({ success: true, data, tinsSupplied });
    } finally {
      await conn.end();
    }
  } catch (error) {
    console.error('Error fetching supplied details:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch supplied details' }, { status: 500 });
  }
}

