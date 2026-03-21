import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';
import {
  canonicalOilGroupKey,
  displayNameForOilGroup,
  litersForPurchaseRow,
  tinsForPurchaseRow,
} from '@/lib/purchaseVolume';
import { formatFinancialYearLabel, getFinancialYearStartYear } from '@/lib/financialYear';

type Row = {
  productId: string;
  purchaseDate: string | Date;
  quantity: string | number;
  productName: string;
  unit: string;
  category: string;
};

type OilAgg = {
  key: string;
  productName: string;
  totalLiters: number;
  totalTins: number | null;
};

type PeriodAgg = { liters: number; tinSum: number; tinAny: boolean };

/**
 * GET /api/stock-purchases/volume-summary
 * Optional: ?oilKey=<canonical group key> — limit totals + year/month tables to that oil (byOil always lists all).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const oilKeyFilter = request.nextUrl.searchParams.get('oilKey')?.trim() || null;

    const connection = await createConnection();

    const [rows] = await connection.query(
      `SELECT p.id AS productId, sp.purchase_date AS purchaseDate, sp.quantity,
              p.name AS productName, p.unit AS unit, p.category AS category
       FROM stock_purchases sp
       JOIN products p ON p.id COLLATE utf8mb4_general_ci = sp.product_id COLLATE utf8mb4_general_ci
       ORDER BY sp.purchase_date ASC`,
    );

    await connection.end();

    const byOil = new Map<string, OilAgg>();
    const byYear = new Map<number, PeriodAgg>();
    const byYearMonth = new Map<string, PeriodAgg>();
    let totalLiters = 0;
    let skippedRows = 0;

    for (const r of rows as Row[]) {
      const qty = Number(r.quantity);
      const d = r.purchaseDate ? new Date(r.purchaseDate) : null;
      if (!d || Number.isNaN(d.getTime())) {
        skippedRows++;
        continue;
      }
      const liters = litersForPurchaseRow(qty, r.productName, r.unit, r.category);
      if (liters == null || !Number.isFinite(liters)) {
        skippedRows++;
        continue;
      }
      const tins = tinsForPurchaseRow(qty, r.productName, r.unit, r.category);
      const groupKey = canonicalOilGroupKey(r.productId, r.productName, r.unit);
      const displayName = displayNameForOilGroup(groupKey, r.productName);

      const existingOil = byOil.get(groupKey);
      if (!existingOil) {
        byOil.set(groupKey, {
          key: groupKey,
          productName: displayName,
          totalLiters: liters,
          totalTins: tins == null ? null : tins,
        });
      } else {
        existingOil.totalLiters += liters;
        if (tins != null) {
          existingOil.totalTins = (existingOil.totalTins ?? 0) + tins;
        }
      }

      if (oilKeyFilter && groupKey !== oilKeyFilter) {
        continue;
      }

      totalLiters += liters;
      const fyStart = getFinancialYearStartYear(d);
      const calY = d.getFullYear();
      const m = d.getMonth() + 1;
      const ym = `${calY}-${String(m).padStart(2, '0')}`;

      bumpPeriod(byYear, fyStart, liters, tins);
      bumpPeriod(byYearMonth, ym, liters, tins);
    }

    const years = Array.from(byYear.entries())
      .map(([fyStart, p]) => ({
        year: fyStart,
        fyLabel: formatFinancialYearLabel(fyStart),
        totalLiters: round(p.liters),
        totalTins: p.tinAny ? p.tinSum : null,
      }))
      .sort((a, b) => b.year - a.year);

    const months = Array.from(byYearMonth.entries())
      .map(([key, p]) => {
        const [yy, mm] = key.split('-').map(Number);
        return {
          year: yy,
          month: mm,
          monthLabel: new Date(yy, mm - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
          totalLiters: round(p.liters),
          totalTins: p.tinAny ? p.tinSum : null,
        };
      })
      .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));

    const byOilList = Array.from(byOil.values())
      .map((o) => ({
        key: o.key,
        productName: o.productName,
        totalLiters: round(o.totalLiters),
        totalTins: o.totalTins == null ? null : o.totalTins,
      }))
      .sort((a, b) => b.totalLiters - a.totalLiters);

    let totalTinsFiltered = 0;
    let anyTinsFiltered = false;
    for (const o of byOilList) {
      if (!oilKeyFilter || o.key === oilKeyFilter) {
        if (o.totalTins != null) {
          totalTinsFiltered += o.totalTins;
          anyTinsFiltered = true;
        }
      }
    }

    return NextResponse.json({
      oilKey: oilKeyFilter,
      totalLiters: round(totalLiters),
      totalTins: anyTinsFiltered ? totalTinsFiltered : null,
      years,
      months,
      byOil: byOilList,
      tinCapacityMl: 15200,
      skippedRows,
    });
  } catch (error) {
    console.error('volume-summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}

function bumpPeriod(map: Map<number | string, PeriodAgg>, key: number | string, liters: number, tins: number | null) {
  const cur = map.get(key) ?? { liters: 0, tinSum: 0, tinAny: false };
  cur.liters += liters;
  if (tins != null) {
    cur.tinSum += tins;
    cur.tinAny = true;
  }
  map.set(key, cur);
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
