import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { inventory, products, sales, saleItems } from '@/db/schema';
import { gte, lte, and, eq } from 'drizzle-orm';

interface ReorderCalculation {
  productId: string;
  productName: string;
  currentStock: number;
  avgDailyUsage: number;
  leadTime: number;
  safetyStock: number;
  reorderPoint: number;
  maxStock: number;
  recommendedOrderQty: number;
  status: 'optimal' | 'low' | 'critical' | 'overstock';
  costImplications: {
    holdingCost: number;
    stockoutCost: number;
    orderCost: number;
    optimalCost: number;
  };
  supplier: string;
  nextReorderDate?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisWindow = parseInt(searchParams.get('window') || '90'); // days to analyze
    const productId = searchParams.get('productId'); // Optional: specific product

    // Calculate analysis period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - analysisWindow);

    // Get current inventory levels
    const inventoryQuery = productId 
      ? db.select().from(inventory).innerJoin(products, eq(inventory.productId, products.id)).where(eq(inventory.productId, productId))
      : db.select().from(inventory).innerJoin(products, eq(inventory.productId, products.id));
    
    const inventoryData = await inventoryQuery;

    // Get historical sales data for demand calculation
    const salesWhere = productId
      ? and(
          gte(sales.createdAt, startDate),
          lte(sales.createdAt, endDate),
          eq(saleItems.productId, productId),
        )
      : and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate));

    const salesData = await db
      .select({
        productId: saleItems.productId,
        quantity: saleItems.quantity,
        createdAt: sales.createdAt
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(salesWhere);

    // Calculate smart reorder points for each product
    const reorderCalculations: ReorderCalculation[] = [];

    for (const item of inventoryData) {
      const productSales = salesData.filter(sale => sale.productId === item.inventory.productId);
      const calculation = calculateSmartReorderPoint(item, productSales, analysisWindow);
      reorderCalculations.push(calculation);
    }

    // Sort by urgency (critical first, then low, then others)
    reorderCalculations.sort((a, b) => {
      const urgencyOrder = { critical: 0, low: 1, optimal: 2, overstock: 3 };
      return urgencyOrder[a.status] - urgencyOrder[b.status];
    });

    // Generate automation recommendations
    const automationRecommendations = generateAutomationRecommendations(reorderCalculations);

    // Calculate total cost implications
    const totalCostSavings = reorderCalculations.reduce((sum, calc) => 
      sum + calc.costImplications.optimalCost, 0);

    return NextResponse.json({
      success: true,
      data: {
        reorderPoints: reorderCalculations,
        summary: {
          totalProducts: reorderCalculations.length,
          criticalItems: reorderCalculations.filter(r => r.status === 'critical').length,
          lowStockItems: reorderCalculations.filter(r => r.status === 'low').length,
          overstockItems: reorderCalculations.filter(r => r.status === 'overstock').length,
          totalCostSavings: Math.round(totalCostSavings),
          avgLeadTime:
            reorderCalculations.length > 0
              ? Math.round(
                  reorderCalculations.reduce((sum, r) => sum + r.leadTime, 0) / reorderCalculations.length,
                )
              : 0,
        },
        automationRecommendations,
        metadata: {
          analysisWindow,
          generatedAt: new Date().toISOString(),
          algorithm: 'AI-Enhanced Economic Order Quantity (EOQ)',
          confidence: calculateConfidenceScore(reorderCalculations)
        }
      }
    });

  } catch (error) {
    console.error('Error calculating smart reorder points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate smart reorder points' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, action, quantity } = body;

    if (action === 'trigger_reorder') {
      // Simulate triggering an automated reorder
      const reorderData = {
        productId,
        quantity: quantity || 100,
        triggeredAt: new Date().toISOString(),
        status: 'pending',
        automationType: 'smart_reorder'
      };

      // In a real implementation, this would:
      // 1. Create a purchase order
      // 2. Send to supplier system
      // 3. Update inventory expectations
      // 4. Log automation event

      return NextResponse.json({
        success: true,
        data: {
          message: 'Smart reorder triggered successfully',
          reorderData,
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing reorder action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process reorder action' },
      { status: 500 }
    );
  }
}

function calculateSmartReorderPoint(inventoryItem: any, salesHistory: any[], analysisWindow: number): ReorderCalculation {
  const product = inventoryItem.products;
  const inventory = inventoryItem.inventory;
  
  const currentStock = parseFloat(inventory.quantity?.toString() || '0');
  const productName = String(product.name || inventory.productId);

  // Calculate demand patterns
  const totalSold = salesHistory.reduce((sum, sale) => sum + parseFloat(sale.quantity?.toString() || '0'), 0);
  const avgDailyUsage = totalSold / analysisWindow;
  
  // Enhanced lead time calculation (considering supplier reliability)
  const baseLeadTime = getSupplierLeadTime(product.category);
  const seasonalFactor = getSeasonalFactor(new Date().getMonth());
  const leadTime = Math.round(baseLeadTime * seasonalFactor);

  // Safety stock calculation (considering demand variability)
  const demandVariability = calculateDemandVariability(salesHistory);
  const safetyStock = Math.round(avgDailyUsage * Math.sqrt(leadTime) * demandVariability);

  // Reorder point calculation
  const reorderPoint = Math.round((avgDailyUsage * leadTime) + safetyStock);

  // Economic Order Quantity (EOQ) calculation
  const orderCost = 500; // Fixed cost per order
  const holdingCostRate = 0.25; // 25% annually
  const unitCost = parseFloat(product.basePrice?.toString() || product.retailPrice?.toString() || '0');
  const annualDemand = avgDailyUsage * 365;

  const eoq = Math.sqrt((2 * annualDemand * orderCost) / (unitCost * holdingCostRate));
  const recommendedOrderQty = Math.max(Math.round(eoq), reorderPoint);

  // Maximum stock level (considering storage capacity)
  const maxStock = Math.round(reorderPoint + recommendedOrderQty);

  // Determine status
  let status: 'optimal' | 'low' | 'critical' | 'overstock' = 'optimal';
  if (currentStock < reorderPoint * 0.3) status = 'critical';
  else if (currentStock < reorderPoint) status = 'low';
  else if (currentStock > maxStock * 1.5) status = 'overstock';

  // Cost implications
  const costImplications = {
    holdingCost: currentStock * unitCost * holdingCostRate / 365 * 30, // Monthly holding cost
    stockoutCost: status === 'critical' ? avgDailyUsage * 30 * unitCost * 0.1 : 0, // 10% penalty for stockouts
    orderCost: orderCost,
    optimalCost: Math.max(0, (currentStock - reorderPoint) * unitCost * holdingCostRate / 365 * 30)
  };

  // Deterministic supplier grouping by category/type.
  const supplier = getPrimarySupplierName(String(product.category || '').toLowerCase());

  // Next reorder date prediction
  let nextReorderDate: string | undefined;
  if (status === 'low' || status === 'critical') {
    const daysUntilReorder = Math.max(0, (currentStock - reorderPoint) / avgDailyUsage);
    nextReorderDate = new Date(Date.now() + daysUntilReorder * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  return {
    productId: inventory.productId,
    productName,
    currentStock,
    avgDailyUsage: Math.round(avgDailyUsage * 100) / 100,
    leadTime,
    safetyStock,
    reorderPoint,
    maxStock,
    recommendedOrderQty,
    status,
    costImplications,
    supplier,
    nextReorderDate
  };
}

function calculateDemandVariability(salesHistory: any[]): number {
  if (salesHistory.length < 2) return 1.0;

  // Calculate daily demands
  const dailyDemands = new Map<string, number>();
  salesHistory.forEach(sale => {
    const date = new Date(sale.createdAt).toISOString().split('T')[0];
    const qty = parseFloat(sale.quantity?.toString() || '0');
    dailyDemands.set(date, (dailyDemands.get(date) || 0) + qty);
  });

  const demands = Array.from(dailyDemands.values());
  const avgDemand = demands.reduce((sum, d) => sum + d, 0) / demands.length;
  
  // Calculate coefficient of variation
  const variance = demands.reduce((sum, d) => sum + Math.pow(d - avgDemand, 2), 0) / demands.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = avgDemand > 0 ? standardDeviation / avgDemand : 1;

  // Convert to safety factor (1.0 = low variability, 2.0 = high variability)
  return Math.min(2.0, Math.max(1.0, 1 + coefficientOfVariation));
}

function getSupplierLeadTime(category: string): number {
  const leadTimes: Record<string, number> = {
    'oil': 5,
    'packaging': 3,
    'raw_materials': 7,
    'equipment': 14,
    'default': 5
  };
  return leadTimes[category] || leadTimes.default;
}

function getPrimarySupplierName(category: string): string {
  const byCategory: Record<string, string> = {
    oil: 'Primary Oil Supplier',
    packaging: 'Primary Packaging Supplier',
    raw_materials: 'Primary Raw Material Supplier',
    equipment: 'Primary Equipment Supplier',
    default: 'Primary Supplier',
  };
  return byCategory[category] || byCategory.default;
}

function getSeasonalFactor(month: number): number {
  // Seasonal factors for oil business (higher during festival seasons)
  const seasonalFactors = [1.0, 1.0, 1.2, 1.1, 1.0, 0.9, 0.9, 1.0, 1.3, 1.4, 1.2, 1.1];
  return seasonalFactors[month] || 1.0;
}

function generateAutomationRecommendations(reorderCalculations: ReorderCalculation[]): string[] {
  const recommendations = [];

  const criticalItems = reorderCalculations.filter(r => r.status === 'critical').length;
  const lowStockItems = reorderCalculations.filter(r => r.status === 'low').length;
  const overstockItems = reorderCalculations.filter(r => r.status === 'overstock').length;

  if (criticalItems > 0) {
    recommendations.push(`Critical shortage detected for ${criticalItems} item(s). Trigger emergency reorder.`);
  }
  if (lowStockItems > 0) {
    recommendations.push(`${lowStockItems} item(s) are below reorder point. Raise planned purchase requests.`);
  }
  if (overstockItems > 0) {
    recommendations.push(`${overstockItems} item(s) are overstocked. Pause reorder for these SKUs.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('All items are within acceptable stock thresholds.');
  }

  return recommendations;
}

function calculateConfidenceScore(reorderCalculations: ReorderCalculation[]): number {
  if (reorderCalculations.length === 0) return 0;
  const withSalesSignal = reorderCalculations.filter((r) => r.avgDailyUsage > 0).length;
  const salesCoverage = withSalesSignal / reorderCalculations.length;
  return Math.round(40 + salesCoverage * 60);
}

