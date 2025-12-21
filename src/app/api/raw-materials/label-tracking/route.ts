import { NextRequest, NextResponse } from 'next/server';

interface LabelUsage {
  productType: string;
  size: string;
  quantitySold: number;
  labelsUsed: number;
  labelsRemaining: number;
  labelCost: number;
  totalLabelCost: number;
}

interface LabelInventory {
  id: string;
  labelType: string;
  productType: string;
  size: string;
  currentStock: number;
  minimumStock: number;
  costPerLabel: number;
  totalValue: number;
  status: 'critical' | 'low' | 'optimal' | 'high';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Mock label inventory data
    const labelInventory: LabelInventory[] = [
      {
        id: 'rm-labels-groundnut-1l',
        labelType: 'Groundnut Oil Labels',
        productType: 'groundnut',
        size: '1L',
        currentStock: 1000,
        minimumStock: 200,
        costPerLabel: 1.50,
        totalValue: 1500,
        status: 'optimal'
      },
      {
        id: 'rm-labels-groundnut-500ml',
        labelType: 'Groundnut Oil Labels',
        productType: 'groundnut',
        size: '500ml',
        currentStock: 800,
        minimumStock: 200,
        costPerLabel: 1.20,
        totalValue: 960,
        status: 'optimal'
      },
      {
        id: 'rm-labels-groundnut-200ml',
        labelType: 'Groundnut Oil Labels',
        productType: 'groundnut',
        size: '200ml',
        currentStock: 400,
        minimumStock: 100,
        costPerLabel: 1.00,
        totalValue: 400,
        status: 'optimal'
      },
      {
        id: 'rm-labels-gingelly-1l',
        labelType: 'Gingelly Oil Labels',
        productType: 'gingelly',
        size: '1L',
        currentStock: 600,
        minimumStock: 150,
        costPerLabel: 1.50,
        totalValue: 900,
        status: 'optimal'
      },
      {
        id: 'rm-labels-gingelly-500ml',
        labelType: 'Gingelly Oil Labels',
        productType: 'gingelly',
        size: '500ml',
        currentStock: 500,
        minimumStock: 150,
        costPerLabel: 1.20,
        totalValue: 600,
        status: 'optimal'
      },
      {
        id: 'rm-labels-gingelly-200ml',
        labelType: 'Gingelly Oil Labels',
        productType: 'gingelly',
        size: '200ml',
        currentStock: 80,
        minimumStock: 100,
        costPerLabel: 1.00,
        totalValue: 80,
        status: 'low'
      },
      {
        id: 'rm-labels-coconut-1l',
        labelType: 'Coconut Oil Labels',
        productType: 'coconut',
        size: '1L',
        currentStock: 400,
        minimumStock: 100,
        costPerLabel: 1.50,
        totalValue: 600,
        status: 'optimal'
      },
      {
        id: 'rm-labels-coconut-500ml',
        labelType: 'Coconut Oil Labels',
        productType: 'coconut',
        size: '500ml',
        currentStock: 300,
        minimumStock: 100,
        costPerLabel: 1.20,
        totalValue: 360,
        status: 'optimal'
      },
      {
        id: 'rm-labels-coconut-200ml',
        labelType: 'Coconut Oil Labels',
        productType: 'coconut',
        size: '200ml',
        currentStock: 45,
        minimumStock: 50,
        costPerLabel: 1.00,
        totalValue: 45,
        status: 'critical'
      }
    ];

    // Calculate label usage based on mock sales data
    const labelUsage: LabelUsage[] = [
      {
        productType: 'Groundnut Oil',
        size: '1L',
        quantitySold: 150,
        labelsUsed: 150,
        labelsRemaining: 1000 - 150,
        labelCost: 1.50,
        totalLabelCost: 150 * 1.50
      },
      {
        productType: 'Groundnut Oil',
        size: '500ml',
        quantitySold: 200,
        labelsUsed: 200,
        labelsRemaining: 800 - 200,
        labelCost: 1.20,
        totalLabelCost: 200 * 1.20
      },
      {
        productType: 'Gingelly Oil',
        size: '1L',
        quantitySold: 80,
        labelsUsed: 80,
        labelsRemaining: 600 - 80,
        labelCost: 1.50,
        totalLabelCost: 80 * 1.50
      },
      {
        productType: 'Coconut Oil',
        size: '500ml',
        quantitySold: 120,
        labelsUsed: 120,
        labelsRemaining: 300 - 120,
        labelCost: 1.20,
        totalLabelCost: 120 * 1.20
      }
    ];

    // Calculate summary metrics
    const totalLabelsInStock = labelInventory.reduce((sum, label) => sum + label.currentStock, 0);
    const totalLabelValue = labelInventory.reduce((sum, label) => sum + label.totalValue, 0);
    const lowStockLabels = labelInventory.filter(label => label.status === 'critical' || label.status === 'low');
    const totalLabelsUsed = labelUsage.reduce((sum, usage) => sum + usage.labelsUsed, 0);
    const totalLabelCostUsed = labelUsage.reduce((sum, usage) => sum + usage.totalLabelCost, 0);

    return NextResponse.json({
      success: true,
      data: {
        labelInventory,
        labelUsage,
        summary: {
          totalLabelsInStock,
          totalLabelValue,
          lowStockCount: lowStockLabels.length,
          totalLabelsUsed,
          totalLabelCostUsed,
          avgCostPerLabel: totalLabelValue / totalLabelsInStock
        },
        alerts: lowStockLabels.map(label => ({
          type: label.status === 'critical' ? 'error' : 'warning',
          message: `${label.labelType} (${label.size}) is ${label.status} - only ${label.currentStock} remaining`
        })),
        recommendations: [
          ...lowStockLabels.map(label => 
            `Reorder ${label.labelType} (${label.size}) - recommend ordering ${label.minimumStock * 2} pieces`
          ),
          'Consider bulk ordering labels to reduce unit costs',
          'Set up automated reorder points for label inventory'
        ]
      }
    });

  } catch (error) {
    console.error('Error fetching label tracking data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch label tracking data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, labelId, quantity, saleData } = body;

    if (action === 'deduct_labels') {
      // Simulate deducting labels when a sale is made
      const deductionResult = {
        labelId,
        quantityDeducted: quantity,
        remainingStock: Math.max(0, 1000 - quantity), // Mock calculation
        timestamp: new Date().toISOString(),
        saleReference: saleData?.saleId
      };

      return NextResponse.json({
        success: true,
        data: {
          message: 'Labels deducted successfully',
          deduction: deductionResult
        }
      });
    }

    if (action === 'adjust_stock') {
      // Manual stock adjustment
      return NextResponse.json({
        success: true,
        data: {
          message: 'Label stock adjusted successfully',
          labelId,
          newQuantity: quantity
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing label tracking action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process label tracking action' },
      { status: 500 }
    );
  }
}

