import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { courierExpenses, canteenAddresses } from '@/db/schema';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  lte,
  sum,
} from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const ROLES = ['admin', 'accountant'] as const;

function canAccess(role: string | undefined) {
  return role && ROLES.includes(role as (typeof ROLES)[number]);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const canteenAddressId = searchParams.get('canteenAddressId') || '';
    const sortBy = searchParams.get('sortBy') || 'courier_date';
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

    const conditions = [];
    if (startDate) {
      conditions.push(gte(courierExpenses.courierDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(courierExpenses.courierDate, endDate));
    }
    if (canteenAddressId.trim()) {
      conditions.push(eq(courierExpenses.canteenAddressId, canteenAddressId.trim()));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    // Summary (full filter, no pagination)
    const [aggRow] = await db
      .select({
        totalCostExGst: sum(courierExpenses.cost),
        totalCgst: sum(courierExpenses.cgstAmount),
        totalSgst: sum(courierExpenses.sgstAmount),
        totalGst: sum(courierExpenses.gstAmount),
        totalQuantity: sum(courierExpenses.quantity),
        rowCount: count(),
      })
      .from(courierExpenses)
      .where(whereClause);

    const toNum = (v: unknown) =>
      v == null ? 0 : Number(typeof v === 'object' && v !== null && 'toString' in v ? String(v) : v);

    // Read canteen master separately to avoid collation issues on joins
    // between courier_expenses.canteen_address_id and canteen_addresses.id.
    const canteenMaster = await db
      .select({
        id: canteenAddresses.id,
        canteenName: canteenAddresses.canteenName,
        city: canteenAddresses.city,
        address: canteenAddresses.address,
      })
      .from(canteenAddresses);
    const canteenMap = new Map(
      canteenMaster.map((c) => [
        String(c.id ?? ''),
        {
          canteenName: c.canteenName ?? null,
          city: c.city ?? null,
          address: c.address ?? null,
        },
      ]),
    );

    // By canteen (same filter)
    const byCanteenRaw = await db
      .select({
        canteenAddressId: courierExpenses.canteenAddressId,
        totalCostExGst: sum(courierExpenses.cost),
        totalCgst: sum(courierExpenses.cgstAmount),
        totalSgst: sum(courierExpenses.sgstAmount),
        totalGst: sum(courierExpenses.gstAmount),
        totalQuantity: sum(courierExpenses.quantity),
        entryCount: count(),
      })
      .from(courierExpenses)
      .where(whereClause)
      .groupBy(courierExpenses.canteenAddressId);

    const byCanteen = byCanteenRaw.map((r) => {
      const totalGstNum = toNum(r.totalGst);
      const totalCgstNum = Math.round((totalGstNum / 2) * 100) / 100;
      const totalSgstNum = Math.round((totalGstNum - totalCgstNum) * 100) / 100;
      return {
      canteenAddressId: r.canteenAddressId,
      canteenName:
        (r.canteenAddressId
          ? canteenMap.get(String(r.canteenAddressId))?.canteenName
          : null) || (r.canteenAddressId ? '—' : 'Other / note only'),
      totalCostExGst: toNum(r.totalCostExGst),
      totalCgst: totalCgstNum,
      totalSgst: totalSgstNum,
      totalGst: totalGstNum,
      totalCost: toNum(r.totalCostExGst) + toNum(r.totalGst),
      totalQuantity: toNum(r.totalQuantity),
      entryCount: Number(r.entryCount ?? 0),
      };
    });

    const orderDate = sortDir === 'asc' ? asc(courierExpenses.courierDate) : desc(courierExpenses.courierDate);
    const orderCost = sortDir === 'asc' ? asc(courierExpenses.cost) : desc(courierExpenses.cost);
    const orderQty = sortDir === 'asc' ? asc(courierExpenses.quantity) : desc(courierExpenses.quantity);
    const orderExpr = sortBy === 'cost' ? orderCost : sortBy === 'quantity' ? orderQty : orderDate;

    const rows = await db
      .select({
        id: courierExpenses.id,
        courierDate: courierExpenses.courierDate,
        quantity: courierExpenses.quantity,
        cost: courierExpenses.cost,
        gstRate: courierExpenses.gstRate,
        gstAmount: courierExpenses.gstAmount,
        cgstAmount: courierExpenses.cgstAmount,
        sgstAmount: courierExpenses.sgstAmount,
        canteenAddressId: courierExpenses.canteenAddressId,
        destinationNote: courierExpenses.destinationNote,
        notes: courierExpenses.notes,
        paymentMethod: courierExpenses.paymentMethod,
        referenceNo: courierExpenses.referenceNo,
        referencePdfPath: courierExpenses.referencePdfPath,
        referencePdfOriginalName: courierExpenses.referencePdfOriginalName,
        userId: courierExpenses.userId,
        createdAt: courierExpenses.createdAt,
        updatedAt: courierExpenses.updatedAt,
      })
      .from(courierExpenses)
      .where(whereClause)
      .orderBy(orderExpr, desc(courierExpenses.id));

    const dataRaw = rows.map((r) => {
      const gstAmtNum = toNum((r as any).gstAmount);
      const cgstNum = Math.round((gstAmtNum / 2) * 100) / 100;
      const sgstNum = Math.round((gstAmtNum - cgstNum) * 100) / 100;
      return {
        id: r.id,
        courierDate: r.courierDate,
        quantity: toNum(r.quantity),
        cost: toNum(r.cost),
        gstRate: toNum((r as any).gstRate),
        gstAmount: gstAmtNum,
        cgstAmount: cgstNum,
        sgstAmount: sgstNum,
        totalAmount: toNum(r.cost) + gstAmtNum,
        canteenAddressId: r.canteenAddressId,
        destinationNote: r.destinationNote ?? '',
        notes: r.notes ?? '',
        paymentMethod: r.paymentMethod,
        referenceNo: r.referenceNo ?? '',
        referencePdfPath: (r as any).referencePdfPath ?? null,
        referencePdfOriginalName: (r as any).referencePdfOriginalName ?? null,
        userId: r.userId,
        createdAt: r.createdAt?.toISOString?.() ?? null,
        updatedAt: r.updatedAt?.toISOString?.() ?? null,
        canteenName: r.canteenAddressId ? canteenMap.get(String(r.canteenAddressId))?.canteenName ?? null : null,
        canteenCity: r.canteenAddressId ? canteenMap.get(String(r.canteenAddressId))?.city ?? null : null,
        canteenAddressLine: r.canteenAddressId ? canteenMap.get(String(r.canteenAddressId))?.address ?? null : null,
      };
    });

    const data =
      sortBy === 'canteen'
        ? [...dataRaw].sort((a, b) => {
            const an = (a.canteenName || '').toLowerCase();
            const bn = (b.canteenName || '').toLowerCase();
            const cmp = an.localeCompare(bn);
            return sortDir === 'asc' ? cmp : -cmp;
          })
        : dataRaw;

    return NextResponse.json({
      success: true,
      data,
      summary: {
        totalCostExGst: toNum(aggRow?.totalCostExGst),
        totalGst: toNum(aggRow?.totalGst),
        totalCgst: Math.round((toNum(aggRow?.totalGst) / 2) * 100) / 100,
        totalSgst:
          Math.round(
            (toNum(aggRow?.totalGst) -
              Math.round((toNum(aggRow?.totalGst) / 2) * 100) / 100) *
              100,
          ) / 100,
        totalCost: toNum(aggRow?.totalCostExGst) + toNum(aggRow?.totalGst),
        totalQuantity: toNum(aggRow?.totalQuantity),
        count: Number(aggRow?.rowCount ?? 0),
      },
      byCanteen,
    });
  } catch (error) {
    console.error('courier-expenses GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load courier expenses' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      courierDate,
      quantity,
      cost,
      gstRate,
      gstAmount,
      canteenAddressId,
      destinationNote,
      notes,
      paymentMethod,
      referenceNo,
      referencePdfPath,
      referencePdfOriginalName,
    } = body as Record<string, unknown>;

    if (!courierDate || String(courierDate).trim() === '') {
      return NextResponse.json({ success: false, error: 'Courier date is required' }, { status: 400 });
    }

    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty < 0) {
      return NextResponse.json({ success: false, error: 'Quantity must be zero or positive' }, { status: 400 });
    }

    const costNum = Number(cost);
    if (Number.isNaN(costNum) || costNum <= 0) {
      return NextResponse.json({ success: false, error: 'Cost must be greater than 0' }, { status: 400 });
    }

    const gstRateNum = gstRate == null || String(gstRate).trim() === '' ? 0 : Number(gstRate);
    if (Number.isNaN(gstRateNum) || gstRateNum < 0) {
      return NextResponse.json({ success: false, error: 'GST rate must be 0 or positive' }, { status: 400 });
    }

    const gstAmountNum =
      gstAmount == null || String(gstAmount).trim() === '' ? (costNum * gstRateNum) / 100 : Number(gstAmount);
    if (Number.isNaN(gstAmountNum) || gstAmountNum < 0) {
      return NextResponse.json({ success: false, error: 'GST amount must be 0 or positive' }, { status: 400 });
    }

    // Intra-state split: GST = CGST + SGST (typically 50/50 for 18% => 9% + 9%).
    const cgstAmountNum = Math.round((gstAmountNum / 2) * 100) / 100;
    const sgstAmountNum = Math.round((gstAmountNum - cgstAmountNum) * 100) / 100;

    const cantId = canteenAddressId && String(canteenAddressId).trim() ? String(canteenAddressId).trim() : null;
    const dest = destinationNote != null ? String(destinationNote).trim() : '';
    if (!cantId && !dest) {
      return NextResponse.json(
        { success: false, error: 'Select a canteen or enter destination / address note' },
        { status: 400 },
      );
    }

    const id = `cexp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await db.insert(courierExpenses).values({
      id,
      courierDate: String(courierDate).slice(0, 10),
      quantity: String(qty),
      cost: String(costNum),
      gstRate: String(gstRateNum),
      gstAmount: String(gstAmountNum),
      cgstAmount: String(cgstAmountNum),
      sgstAmount: String(sgstAmountNum),
      canteenAddressId: cantId,
      destinationNote: dest || null,
      notes: notes != null && String(notes).trim() ? String(notes).trim() : null,
      paymentMethod: (paymentMethod && String(paymentMethod)) || 'cash',
      referenceNo: referenceNo != null && String(referenceNo).trim() ? String(referenceNo).trim() : null,
      referencePdfPath:
        referencePdfPath != null && String(referencePdfPath).trim() ? String(referencePdfPath).trim() : null,
      referencePdfOriginalName:
        referencePdfOriginalName != null && String(referencePdfOriginalName).trim()
          ? String(referencePdfOriginalName).trim()
          : null,
      userId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('courier-expenses POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create courier expense' },
      { status: 500 },
    );
  }
}
