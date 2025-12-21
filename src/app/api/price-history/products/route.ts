import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProductPriceManager } from '@/lib/priceHistory';

// GET /api/price-history/products - Get product price history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const asOfDate = searchParams.get('asOfDate');

    if (productId && asOfDate) {
      // Get price as of specific date
      const price = await ProductPriceManager.getPriceAsOf(productId, new Date(asOfDate));
      return NextResponse.json({ success: true, data: price });
    } else if (productId) {
      // Get full price history for product
      const history = await ProductPriceManager.getPriceHistory(productId);
      return NextResponse.json({ success: true, data: history });
    } else {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error getting product price history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/price-history/products - Update product price
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or accountant role
    if (!['admin', 'accountant'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      productId,
      basePrice,
      retailPrice,
      gstRate,
      effectiveDate,
      notes
    } = body;

    // Validate required fields
    if (!productId || !basePrice || !retailPrice || !gstRate || !effectiveDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: productId, basePrice, retailPrice, gstRate, effectiveDate' 
      }, { status: 400 });
    }

    // Validate price values
    if (basePrice <= 0 || retailPrice <= 0 || gstRate < 0) {
      return NextResponse.json({ 
        error: 'Invalid price values: prices must be positive, GST rate cannot be negative' 
      }, { status: 400 });
    }

    const priceId = await ProductPriceManager.updatePrice(
      productId,
      parseFloat(basePrice),
      parseFloat(retailPrice),
      parseFloat(gstRate),
      new Date(effectiveDate),
      session.user.id,
      notes
    );

    return NextResponse.json({ 
      success: true, 
      data: { 
        priceId,
        message: 'Product price updated successfully'
      }
    });
  } catch (error) {
    console.error('Error updating product price:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/price-history/products - Bulk update product prices
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'accountant'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { updates, effectiveDate, notes } = body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ 
        error: 'Updates array is required and must not be empty' 
      }, { status: 400 });
    }

    if (!effectiveDate) {
      return NextResponse.json({ 
        error: 'Effective date is required' 
      }, { status: 400 });
    }

    // Validate each update
    for (const update of updates) {
      if (!update.productId || !update.basePrice || !update.retailPrice || !update.gstRate) {
        return NextResponse.json({ 
          error: 'Each update must have productId, basePrice, retailPrice, and gstRate' 
        }, { status: 400 });
      }
    }

    const results = [];
    for (const update of updates) {
      const priceId = await ProductPriceManager.updatePrice(
        update.productId,
        parseFloat(update.basePrice),
        parseFloat(update.retailPrice),
        parseFloat(update.gstRate),
        new Date(effectiveDate),
        session.user.id,
        notes
      );
      results.push({ productId: update.productId, priceId });
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        results,
        message: `${results.length} product prices updated successfully`
      }
    });
  } catch (error) {
    console.error('Error bulk updating product prices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
