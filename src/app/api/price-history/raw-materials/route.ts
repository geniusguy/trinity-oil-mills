import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { RawMaterialPriceManager } from '@/lib/priceHistory';

// GET /api/price-history/raw-materials - Get raw material price history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const rawMaterialId = searchParams.get('rawMaterialId');
    const asOfDate = searchParams.get('asOfDate');

    if (rawMaterialId && asOfDate) {
      // Get price as of specific date
      const price = await RawMaterialPriceManager.getPriceAsOf(rawMaterialId, new Date(asOfDate));
      return NextResponse.json({ success: true, data: price });
    } else if (rawMaterialId) {
      // Get current price
      const currentPrice = await RawMaterialPriceManager.getCurrentPrice(rawMaterialId);
      return NextResponse.json({ success: true, data: currentPrice });
    } else {
      return NextResponse.json({ error: 'Raw Material ID is required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error getting raw material price history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/price-history/raw-materials - Update raw material price
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'accountant'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      rawMaterialId,
      costPerUnit,
      gstRate,
      effectiveDate,
      supplier,
      notes
    } = body;

    if (!rawMaterialId || !costPerUnit || !gstRate || !effectiveDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: rawMaterialId, costPerUnit, gstRate, effectiveDate' 
      }, { status: 400 });
    }

    if (costPerUnit <= 0 || gstRate < 0) {
      return NextResponse.json({ 
        error: 'Invalid values: cost must be positive, GST rate cannot be negative' 
      }, { status: 400 });
    }

    const priceId = await RawMaterialPriceManager.updatePrice(
      rawMaterialId,
      parseFloat(costPerUnit),
      parseFloat(gstRate),
      new Date(effectiveDate),
      session.user.id,
      supplier,
      notes
    );

    return NextResponse.json({ 
      success: true, 
      data: { 
        priceId,
        message: 'Raw material price updated successfully'
      }
    });
  } catch (error) {
    console.error('Error updating raw material price:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
