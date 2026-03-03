import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ProductPriceManager } from '@/lib/priceHistory';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or accountant role
    if (!['admin', 'accountant'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Initialize price history for existing products
    await ProductPriceManager.initializePriceHistory(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Price history initialized successfully for all products'
    });

  } catch (error) {
    console.error('Error initializing price history:', error);
    return NextResponse.json(
      { error: 'Failed to initialize price history' },
      { status: 500 }
    );
  }
}