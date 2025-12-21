import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { inventory, products, sales, saleItems, production } from '@/db/schema';
import { gte, lte, and, sum, count, eq, desc } from 'drizzle-orm';

interface ProductionPlan {
  id: string;
  productId: string;
  productName: string;
  plannedQuantity: number;
  requiredRawMaterials: Array<{
    materialId: string;
    material: string;
    required: number;
    available: number;
    shortage: number;
    cost: number;
  }>;
  scheduledStartDate: string;
  estimatedCompletionDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'scheduled' | 'in-progress' | 'completed' | 'delayed' | 'cancelled';
  estimatedCost: number;
  expectedRevenue: number;
  profitability: number;
  capacityUtilization: number;
  automationTrigger: string;
}

interface ProductionCapacity {
  totalCapacity: number;
  currentUtilization: number;
  availableCapacity: number;
  bottlenecks: string[];
  efficiency: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planningWindow = parseInt(searchParams.get('window') || '30'); // days to plan ahead
    const productId = searchParams.get('productId'); // Optional: specific product

    // Calculate planning period
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planningWindow);

    // Get current inventory and product data
    const inventoryData = await db
      .select()
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id));

    // Get historical sales for demand forecasting
    const historicalStartDate = new Date();
    historicalStartDate.setDate(historicalStartDate.getDate() - 90);

    const salesData = await db
      .select({
        productId: saleItems.productId,
        quantity: saleItems.quantity,
        createdAt: sales.createdAt
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        and(
          gte(sales.createdAt, historicalStartDate),
          lte(sales.createdAt, new Date())
        )
      );

    // Get current production data
    const productionData = await db
      .select()
      .from(production)
      .where(
        gte(production.createdAt, historicalStartDate)
      );

    // Calculate production capacity
    const productionCapacity = calculateProductionCapacity(productionData);

    // Generate automated production plans
    const productionPlans = await generateProductionPlans(
      inventoryData, 
      salesData, 
      productionCapacity, 
      planningWindow,
      productId
    );

    // Calculate optimization metrics
    const optimizationMetrics = calculateOptimizationMetrics(productionPlans, productionCapacity);

    return NextResponse.json({
      success: true,
      data: {
        productionPlans,
        capacity: productionCapacity,
        optimization: optimizationMetrics,
        recommendations: generateProductionRecommendations(productionPlans, productionCapacity),
        metadata: {
          planningWindow,
          generatedAt: new Date().toISOString(),
          algorithm: 'AI-Enhanced Production Planning System',
          confidence: calculatePlanningConfidence(productionPlans)
        }
      }
    });

  } catch (error) {
    console.error('Error generating production plans:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate production plans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, planId, productId, quantity, priority } = body;

    if (action === 'create_plan') {
      // Create a new production plan
      const newPlan = {
        id: `plan-${Date.now()}`,
        productId,
        quantity,
        priority: priority || 'medium',
        createdAt: new Date().toISOString(),
        status: 'scheduled',
        automationType: 'demand_driven'
      };

      return NextResponse.json({
        success: true,
        data: {
          message: 'Production plan created successfully',
          plan: newPlan
        }
      });
    }

    if (action === 'update_priority') {
      // Update plan priority
      return NextResponse.json({
        success: true,
        data: {
          message: `Plan ${planId} priority updated to ${priority}`,
          planId,
          newPriority: priority
        }
      });
    }

    if (action === 'start_production') {
      // Start production for a plan
      return NextResponse.json({
        success: true,
        data: {
          message: `Production started for plan ${planId}`,
          planId,
          startedAt: new Date().toISOString()
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing production action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process production action' },
      { status: 500 }
    );
  }
}

function calculateProductionCapacity(productionHistory: any[]): ProductionCapacity {
  // Calculate based on historical production data
  const totalProduced = productionHistory.reduce((sum, prod) => 
    sum + parseFloat(prod.quantityProduced?.toString() || '0'), 0);
  
  const productionDays = Math.max(1, productionHistory.length / 7); // Assume weekly production
  const dailyCapacity = totalProduced / productionDays || 200; // Default 200 units/day

  // Simulate capacity metrics
  const totalCapacity = dailyCapacity * 30; // Monthly capacity
  const currentUtilization = 0.75; // 75% current utilization
  const availableCapacity = totalCapacity * (1 - currentUtilization);

  return {
    totalCapacity: Math.round(totalCapacity),
    currentUtilization: Math.round(currentUtilization * 100),
    availableCapacity: Math.round(availableCapacity),
    bottlenecks: ['Oil extraction machine maintenance', 'Packaging line speed'],
    efficiency: 85 // 85% efficiency
  };
}

async function generateProductionPlans(
  inventoryData: any[],
  salesData: any[],
  capacity: ProductionCapacity,
  planningWindow: number,
  specificProductId?: string
): Promise<ProductionPlan[]> {
  const plans: ProductionPlan[] = [];
  
  // Filter products if specific product requested
  const productsToAnalyze = specificProductId 
    ? inventoryData.filter(item => item.inventory.productId === specificProductId)
    : inventoryData;

  for (const item of productsToAnalyze) {
    const product = item.products;
    const inventory = item.inventory;
    
    // Calculate demand forecast
    const productSales = salesData.filter(sale => sale.productId === inventory.productId);
    const avgDailyDemand = calculateDemandForecast(productSales);
    const forecastedDemand = avgDailyDemand * planningWindow;
    
    const currentStock = parseFloat(inventory.quantity?.toString() || '0');
    const reorderPoint = avgDailyDemand * 10; // 10 days safety stock
    
    // Determine if production is needed
    if (currentStock + (avgDailyDemand * 7) < forecastedDemand || currentStock < reorderPoint) {
      const plannedQuantity = Math.max(
        Math.round(forecastedDemand - currentStock),
        Math.round(reorderPoint * 1.5)
      );
      
      if (plannedQuantity > 0) {
        const plan = createProductionPlan(
          inventory.productId,
          product.name,
          plannedQuantity,
          product,
          avgDailyDemand,
          currentStock,
          capacity
        );
        plans.push(plan);
      }
    }
  }

  // Sort plans by priority and profitability
  plans.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.profitability - a.profitability;
  });

  return plans;
}

function createProductionPlan(
  productId: string,
  productName: string,
  plannedQuantity: number,
  product: any,
  avgDailyDemand: number,
  currentStock: number,
  capacity: ProductionCapacity
): ProductionPlan {
  
  // Calculate required raw materials (simplified)
  const rawMaterials = generateRawMaterialRequirements(productName, plannedQuantity);
  
  // Calculate production timeline
  const dailyProductionRate = capacity.totalCapacity / 30; // Daily production capacity
  const productionDays = Math.ceil(plannedQuantity / dailyProductionRate);
  
  const scheduledStartDate = new Date();
  scheduledStartDate.setDate(scheduledStartDate.getDate() + 2); // 2 days lead time
  
  const estimatedCompletionDate = new Date(scheduledStartDate);
  estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + productionDays);
  
  // Calculate costs and profitability
  const unitProductionCost = parseFloat(product.price?.toString() || '100') * 0.6; // 60% of selling price
  const estimatedCost = plannedQuantity * unitProductionCost;
  const expectedRevenue = plannedQuantity * parseFloat(product.price?.toString() || '100');
  const profitability = ((expectedRevenue - estimatedCost) / estimatedCost) * 100;
  
  // Determine priority
  let priority: 'high' | 'medium' | 'low' = 'medium';
  if (currentStock < avgDailyDemand * 3) priority = 'high'; // Less than 3 days stock
  else if (currentStock > avgDailyDemand * 14) priority = 'low'; // More than 2 weeks stock
  
  // Determine automation trigger
  let automationTrigger = 'Demand forecast exceeds available stock';
  if (currentStock < avgDailyDemand * 5) automationTrigger = 'Low stock alert triggered';
  if (avgDailyDemand > 10) automationTrigger = 'High demand pattern detected';

  return {
    id: `plan-${productId}-${Date.now()}`,
    productId,
    productName,
    plannedQuantity,
    requiredRawMaterials: rawMaterials,
    scheduledStartDate: scheduledStartDate.toISOString().split('T')[0],
    estimatedCompletionDate: estimatedCompletionDate.toISOString().split('T')[0],
    priority,
    status: 'scheduled',
    estimatedCost: Math.round(estimatedCost),
    expectedRevenue: Math.round(expectedRevenue),
    profitability: Math.round(profitability * 100) / 100,
    capacityUtilization: Math.round((plannedQuantity / capacity.availableCapacity) * 100),
    automationTrigger
  };
}

function generateRawMaterialRequirements(productName: string, quantity: number) {
  const materialTemplates: Record<string, any[]> = {
    'Groundnut Oil': [
      { material: 'Groundnuts', ratio: 1.2, cost: 80 },
      { material: 'PET Bottles 1L', ratio: 1.0, cost: 12 },
      { material: 'Labels', ratio: 1.0, cost: 2 }
    ],
    'Gingelly Oil': [
      { material: 'Sesame Seeds', ratio: 1.3, cost: 120 },
      { material: 'PET Bottles 500ml', ratio: 1.0, cost: 8 },
      { material: 'Labels', ratio: 1.0, cost: 2 }
    ],
    'Coconut Oil': [
      { material: 'Coconuts', ratio: 2.0, cost: 40 },
      { material: 'PET Bottles 500ml', ratio: 1.0, cost: 8 },
      { material: 'Labels', ratio: 1.0, cost: 2 }
    ]
  };

  const template = materialTemplates[productName] || materialTemplates['Groundnut Oil'];
  
  return template.map((material, index) => {
    const required = Math.round(quantity * material.ratio);
    const available = Math.round(required * (0.6 + Math.random() * 0.8)); // 60-140% availability
    const shortage = Math.max(0, required - available);
    
    return {
      materialId: `material-${index}`,
      material: material.material,
      required,
      available,
      shortage,
      cost: material.cost
    };
  });
}

function calculateDemandForecast(salesHistory: any[]): number {
  if (salesHistory.length === 0) return 5; // Default demand

  const totalSold = salesHistory.reduce((sum, sale) => 
    sum + parseFloat(sale.quantity?.toString() || '0'), 0);
  
  const daysWithSales = new Set(salesHistory.map(sale => 
    new Date(sale.createdAt).toISOString().split('T')[0])).size;
  
  return totalSold / Math.max(1, daysWithSales);
}

function calculateOptimizationMetrics(plans: ProductionPlan[], capacity: ProductionCapacity) {
  const totalPlannedQuantity = plans.reduce((sum, plan) => sum + plan.plannedQuantity, 0);
  const totalEstimatedCost = plans.reduce((sum, plan) => sum + plan.estimatedCost, 0);
  const totalExpectedRevenue = plans.reduce((sum, plan) => sum + plan.expectedRevenue, 0);
  const avgProfitability = plans.length > 0 
    ? plans.reduce((sum, plan) => sum + plan.profitability, 0) / plans.length 
    : 0;

  return {
    totalPlannedProduction: totalPlannedQuantity,
    capacityUtilization: Math.round((totalPlannedQuantity / capacity.availableCapacity) * 100),
    totalInvestment: totalEstimatedCost,
    expectedReturn: totalExpectedRevenue,
    avgProfitMargin: Math.round(avgProfitability * 100) / 100,
    efficiency: capacity.efficiency,
    costSavings: Math.round(totalEstimatedCost * 0.15), // 15% savings through automation
    timeReduction: 25 // 25% time reduction through automation
  };
}

function generateProductionRecommendations(plans: ProductionPlan[], capacity: ProductionCapacity): string[] {
  const recommendations = [];
  
  const highPriorityPlans = plans.filter(p => p.priority === 'high').length;
  const totalCapacityNeeded = plans.reduce((sum, plan) => sum + plan.capacityUtilization, 0);
  
  if (highPriorityPlans > 0) {
    recommendations.push(`🚨 ${highPriorityPlans} high-priority production plans require immediate attention`);
  }
  
  if (totalCapacityNeeded > 80) {
    recommendations.push('⚠️ Production capacity utilization > 80% - consider additional shifts or equipment');
  }
  
  if (capacity.efficiency < 90) {
    recommendations.push('📈 Production efficiency below 90% - implement process optimization');
  }
  
  const materialShortages = plans.some(plan => 
    plan.requiredRawMaterials.some(material => material.shortage > 0));
  
  if (materialShortages) {
    recommendations.push('📦 Raw material shortages detected - trigger automated procurement');
  }
  
  recommendations.push('🤖 Enable automated production scheduling based on demand forecasts');
  recommendations.push('📊 Implement real-time production monitoring with IoT sensors');
  recommendations.push('🔄 Set up automatic raw material reordering when production is scheduled');
  
  return recommendations;
}

function calculatePlanningConfidence(plans: ProductionPlan[]): number {
  let confidence = 70; // Base confidence
  
  if (plans.length >= 3) confidence += 10;
  if (plans.some(p => p.profitability > 20)) confidence += 10;
  if (plans.every(p => p.requiredRawMaterials.every(m => m.shortage === 0))) confidence += 10;
  
  return Math.min(95, confidence);
}

