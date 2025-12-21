import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HistoricalPNLCalculator } from '@/lib/priceHistory';

// GET /api/reports/historical-pnl - Calculate PNL with historical pricing
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!['admin', 'accountant'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const compareWith = searchParams.get('compareWith'); // 'previous_period' or date range

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Start date and end date are required' 
      }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json({ 
        error: 'Start date must be before end date' 
      }, { status: 400 });
    }

    let result;

    if (compareWith === 'previous_period') {
      // Compare with previous period of same duration
      const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - periodDays + 1);

      result = await HistoricalPNLCalculator.comparePeriods(
        prevStart, prevEnd, start, end
      );
    } else {
      // Single period PNL
      result = await HistoricalPNLCalculator.calculatePNLForPeriod(start, end);
    }

    // Handle empty data or errors gracefully
    if (result.isEmpty) {
      return NextResponse.json({ 
        success: true, 
        data: result,
        message: result.message || 'No data available for the selected period'
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Error calculating historical PNL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/reports/historical-pnl - Custom PNL comparison
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'accountant'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      period1Start,
      period1End,
      period2Start,
      period2End
    } = body;

    if (!period1Start || !period1End || !period2Start || !period2End) {
      return NextResponse.json({ 
        error: 'All period dates are required' 
      }, { status: 400 });
    }

    const result = await HistoricalPNLCalculator.comparePeriods(
      new Date(period1Start),
      new Date(period1End),
      new Date(period2Start),
      new Date(period2End)
    );

    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Error comparing PNL periods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
