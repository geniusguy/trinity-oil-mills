import { db } from '@/db/db';
import { 
  products, 
  rawMaterials, 
  productPriceHistory, 
  rawMaterialPriceHistory,
  productionCostHistory,
  production,
  productionRecipes,
  sales,
  saleItems
} from '@/db/schema';
import { eq, and, lte, gte, or, isNull, desc, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Product Price Management
export class ProductPriceManager {
  /**
   * Get current active price for a product
   */
  static async getCurrentPrice(productId: string) {
    try {
      const currentPrice = await db.select()
        .from(productPriceHistory)
        .where(
          and(
            eq(productPriceHistory.productId, productId),
            eq(productPriceHistory.isActive, true)
          )
        )
        .orderBy(desc(productPriceHistory.effectiveDate))
        .limit(1);

      return currentPrice[0] || null;
    } catch (error: any) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.warn('Product price history table does not exist, returning null');
        return null;
      }
      throw error;
    }
  }

  /**
   * Get price as of a specific date
   */
  static async getPriceAsOf(productId: string, date: Date) {
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      const priceAsOf = await db.select()
        .from(productPriceHistory)
        .where(
          and(
            eq(productPriceHistory.productId, productId),
            lte(productPriceHistory.effectiveDate, dateStr),
            or(
              isNull(productPriceHistory.endDate),
              gte(productPriceHistory.endDate, dateStr)
            )
          )
        )
        .orderBy(desc(productPriceHistory.effectiveDate))
        .limit(1);

      return priceAsOf[0] || null;
    } catch (error: any) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.warn('Product price history table does not exist, returning null');
        return null;
      }
      throw error;
    }
  }

  /**
   * Update product price with effective date
   */
  static async updatePrice(
    productId: string, 
    basePrice: number, 
    retailPrice: number, 
    gstRate: number,
    effectiveDate: Date, 
    userId: string,
    notes?: string
  ) {
    try {
      const effectiveDateStr = effectiveDate.toISOString().split('T')[0];
      
      // Close current active price (set end date to day before new effective date)
      const dayBefore = new Date(effectiveDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayBeforeStr = dayBefore.toISOString().split('T')[0];

      await db.update(productPriceHistory)
        .set({ 
          endDate: dayBeforeStr,
          isActive: false 
        })
        .where(
          and(
            eq(productPriceHistory.productId, productId),
            eq(productPriceHistory.isActive, true)
          )
        );

      // Insert new price
      const newPriceId = uuidv4();
      await db.insert(productPriceHistory).values({
        id: newPriceId,
        productId,
        basePrice: basePrice.toString(),
        retailPrice: retailPrice.toString(),
        gstRate: gstRate.toString(),
        effectiveDate: effectiveDateStr,
        isActive: true,
        createdBy: userId,
        notes
      });

      // Update current price in products table for quick access
      await db.update(products)
        .set({
          basePrice: basePrice.toString(),
          retailPrice: retailPrice.toString(),
          gstRate: gstRate.toString()
        })
        .where(eq(products.id, productId));

      return newPriceId;
    } catch (error: any) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.warn('Product price history table does not exist, only updating products table');
        // Update current price in products table for quick access
        await db.update(products)
          .set({
            basePrice: basePrice.toString(),
            retailPrice: retailPrice.toString(),
            gstRate: gstRate.toString()
          })
          .where(eq(products.id, productId));
        return 'fallback-update';
      }
      throw error;
    }
  }

  /**
   * Get price history for a product
   */
  static async getPriceHistory(productId: string) {
    try {
      return await db.select()
        .from(productPriceHistory)
        .where(eq(productPriceHistory.productId, productId))
        .orderBy(desc(productPriceHistory.effectiveDate));
    } catch (error: any) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.warn('Product price history table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
  }

  /**
   * Initialize price history for existing products
   */
  static async initializePriceHistory(userId: string) {
    const existingProducts = await db.select().from(products);
    
    for (const product of existingProducts) {
      // Check if price history already exists
      const existingHistory = await this.getCurrentPrice(product.id);
      
      if (!existingHistory) {
        // Create initial price history entry
        await db.insert(productPriceHistory).values({
          id: uuidv4(),
          productId: product.id,
          basePrice: product.basePrice,
          retailPrice: product.retailPrice,
          gstRate: product.gstRate,
          effectiveDate: product.createdAt.toISOString().split('T')[0],
          isActive: true,
          createdBy: userId,
          notes: 'Initial price history entry'
        });
      }
    }
  }
}

// Raw Material Price Management
export class RawMaterialPriceManager {
  /**
   * Get current active price for a raw material
   */
  static async getCurrentPrice(rawMaterialId: string) {
    const currentPrice = await db.select()
      .from(rawMaterialPriceHistory)
      .where(
        and(
          eq(rawMaterialPriceHistory.rawMaterialId, rawMaterialId),
          eq(rawMaterialPriceHistory.isActive, true)
        )
      )
      .orderBy(desc(rawMaterialPriceHistory.effectiveDate))
      .limit(1);

    return currentPrice[0] || null;
  }

  /**
   * Get price as of a specific date
   */
  static async getPriceAsOf(rawMaterialId: string, date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    
    const priceAsOf = await db.select()
      .from(rawMaterialPriceHistory)
      .where(
        and(
          eq(rawMaterialPriceHistory.rawMaterialId, rawMaterialId),
          lte(rawMaterialPriceHistory.effectiveDate, dateStr),
          or(
            isNull(rawMaterialPriceHistory.endDate),
            gte(rawMaterialPriceHistory.endDate, dateStr)
          )
        )
      )
      .orderBy(desc(rawMaterialPriceHistory.effectiveDate))
      .limit(1);

    return priceAsOf[0] || null;
  }

  /**
   * Update raw material price
   */
  static async updatePrice(
    rawMaterialId: string,
    costPerUnit: number,
    gstRate: number,
    effectiveDate: Date,
    userId: string,
    supplier?: string,
    notes?: string
  ) {
    const effectiveDateStr = effectiveDate.toISOString().split('T')[0];
    
    // Close current active price
    const dayBefore = new Date(effectiveDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayBeforeStr = dayBefore.toISOString().split('T')[0];

    await db.update(rawMaterialPriceHistory)
      .set({ 
        endDate: dayBeforeStr,
        isActive: false 
      })
      .where(
        and(
          eq(rawMaterialPriceHistory.rawMaterialId, rawMaterialId),
          eq(rawMaterialPriceHistory.isActive, true)
        )
      );

    // Insert new price
    const newPriceId = uuidv4();
    await db.insert(rawMaterialPriceHistory).values({
      id: newPriceId,
      rawMaterialId,
      costPerUnit: costPerUnit.toString(),
      gstRate: gstRate.toString(),
      effectiveDate: effectiveDateStr,
      isActive: true,
      createdBy: userId,
      supplier,
      notes
    });

    // Update current price in raw materials table
    await db.update(rawMaterials)
      .set({
        costPerUnit: costPerUnit.toString(),
        gstRate: gstRate.toString()
      })
      .where(eq(rawMaterials.id, rawMaterialId));

    return newPriceId;
  }

  /**
   * Initialize price history for existing raw materials
   */
  static async initializePriceHistory(userId: string) {
    const existingMaterials = await db.select().from(rawMaterials);
    
    for (const material of existingMaterials) {
      const existingHistory = await this.getCurrentPrice(material.id);
      
      if (!existingHistory) {
        await db.insert(rawMaterialPriceHistory).values({
          id: uuidv4(),
          rawMaterialId: material.id,
          costPerUnit: material.costPerUnit,
          gstRate: material.gstRate,
          effectiveDate: material.createdAt.toISOString().split('T')[0],
          isActive: true,
          createdBy: userId,
          notes: 'Initial price history entry'
        });
      }
    }
  }
}

// Production Cost Calculator with Historical Prices
export class ProductionCostCalculator {
  /**
   * Calculate production cost using historical prices
   */
  static async calculateCostAsOf(productId: string, productionDate: Date) {
    try {
      // Check if production_recipes table exists by trying to query it
      const recipe = await db.select()
        .from(productionRecipes)
        .where(
          and(
            eq(productionRecipes.productId, productId),
            eq(productionRecipes.isActive, true)
          )
        );

      let totalCost = 0;
      const costBreakdown = [];

      for (const ingredient of recipe) {
        // Get raw material cost as of production date
        const materialCost = await RawMaterialPriceManager.getPriceAsOf(
          ingredient.rawMaterialId,
          productionDate
        );

        if (materialCost) {
          const ingredientCost = parseFloat(ingredient.quantityPerUnit) * parseFloat(materialCost.costPerUnit);
          totalCost += ingredientCost;
          
          costBreakdown.push({
            rawMaterialId: ingredient.rawMaterialId,
            quantityUsed: ingredient.quantityPerUnit,
            costPerUnit: materialCost.costPerUnit,
            totalCost: ingredientCost.toString()
          });
        }
      }

      return {
        totalCost,
        costBreakdown
      };
    } catch (error: any) {
      console.warn(`Production recipes table not available or query failed: ${error.message}`);
      console.warn(`Using fallback cost calculation for product ${productId}`);
      return this.calculateFallbackCost(productId, productionDate);
    }
  }

  /**
   * Fallback cost calculation when production_recipes table is not available
   */
  static async calculateFallbackCost(productId: string, productionDate: Date) {
    try {
      // Try to get product information for basic cost estimation
      const product = await db.select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (product.length === 0) {
        console.warn(`Product ${productId} not found, using default cost`);
        return {
          totalCost: 0,
          costBreakdown: [],
          isFallback: true,
          error: 'Product not found'
        };
      }

      // Estimate cost as 60% of the base price (rough production cost estimation)
      const basePrice = parseFloat(product[0].basePrice);
      const estimatedCost = basePrice * 0.6;

      return {
        totalCost: estimatedCost,
        costBreakdown: [{
          rawMaterialId: 'estimated',
          quantityUsed: '1',
          costPerUnit: estimatedCost.toString(),
          totalCost: estimatedCost.toString()
        }],
        isFallback: true
      };
    } catch (error: any) {
      console.warn(`Fallback cost calculation failed: ${error.message}`);
      return {
        totalCost: 0,
        costBreakdown: [],
        isFallback: true,
        error: error.message
      };
    }
  }

  /**
   * Record production cost history
   */
  static async recordProductionCost(
    productionId: string,
    productId: string,
    productionDate: Date
  ) {
    const costData = await this.calculateCostAsOf(productId, productionDate);
    const productionDateStr = productionDate.toISOString().split('T')[0];

    // Record cost for each raw material used
    for (const breakdown of costData.costBreakdown) {
      await db.insert(productionCostHistory).values({
        id: uuidv4(),
        productionId,
        productId,
        rawMaterialId: breakdown.rawMaterialId,
        quantityUsed: breakdown.quantityUsed,
        costPerUnit: breakdown.costPerUnit,
        totalCost: breakdown.totalCost,
        productionDate: productionDateStr
      });
    }

    return costData.totalCost;
  }

  /**
   * Get production cost for a specific production batch
   */
  static async getProductionCost(productionId: string) {
    const costs = await db.select()
      .from(productionCostHistory)
      .where(eq(productionCostHistory.productionId, productionId));

    const totalCost = costs.reduce((sum, cost) => sum + parseFloat(cost.totalCost), 0);

    return {
      totalCost,
      breakdown: costs
    };
  }
}

// Historical PNL Calculator
export class HistoricalPNLCalculator {
  /**
   * Calculate PNL for a specific period using historical prices
   */
  static async calculatePNLForPeriod(
    startDate: Date,
    endDate: Date,
    options?: { paidOnly?: boolean }
  ) {
    try {
      const paidOnly = options?.paidOnly ?? true;
      // Get all sales in the period
      const salesFilter = paidOnly
        ? and(
            gte(sales.createdAt, startDate),
            lte(sales.createdAt, endDate),
            eq(sales.paymentStatus, 'paid')
          )
        : and(
            gte(sales.createdAt, startDate),
            lte(sales.createdAt, endDate)
          );

      const salesData = await db.select()
        .from(sales)
        .where(salesFilter);

      // Check if there's any data
      if (salesData.length === 0) {
        return {
          period: {
            startDate,
            endDate
          },
          summary: {
            totalRevenue: 0,
            totalCost: 0,
            profit: 0,
            margin: 0
          },
          salesBreakdown: [],
          message: 'No sales data available for the selected period',
          isEmpty: true
        };
      }

      let totalRevenue = 0;
      let totalCost = 0;
      const salesBreakdown = [];

      for (const sale of salesData) {
          // Get sale items
          const saleItemsData = await db.select()
            .from(saleItems)
            .where(eq(saleItems.saleId, sale.id));

        let saleRevenue = 0;
        let saleCost = 0;

        for (const item of saleItemsData) {
          // Revenue is already recorded at time of sale
          const itemRevenue = parseFloat(item.totalAmount);
          saleRevenue += itemRevenue;

          // Get cost at time of sale using historical price
          const costAtSale = await ProductionCostCalculator.calculateCostAsOf(
            item.productId,
            sale.createdAt
          );

          const itemCost = costAtSale.totalCost * parseFloat(item.quantity);
          saleCost += itemCost;
        }

        totalRevenue += saleRevenue;
        totalCost += saleCost;

        salesBreakdown.push({
          saleId: sale.id,
          saleDate: sale.createdAt,
          revenue: saleRevenue,
          cost: saleCost,
          profit: saleRevenue - saleCost
        });
      }

      const profit = totalRevenue - totalCost;
      const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        period: {
          startDate,
          endDate
        },
        summary: {
          totalRevenue,
          totalCost,
          profit,
          margin
        },
        salesBreakdown,
        isEmpty: false
      };
    } catch (error: any) {
      console.error('Error calculating historical PNL:', error);
      return {
        period: {
          startDate,
          endDate
        },
        summary: {
          totalRevenue: 0,
          totalCost: 0,
          profit: 0,
          margin: 0
        },
        salesBreakdown: [],
        message: 'Unable to calculate P&L data. Please check your database configuration.',
        isEmpty: true,
        error: error.message
      };
    }
  }

  /**
   * Compare PNL between two periods
   */
  static async comparePeriods(
    period1Start: Date,
    period1End: Date,
    period2Start: Date,
    period2End: Date
  ) {
    const pnl1 = await this.calculatePNLForPeriod(period1Start, period1End);
    const pnl2 = await this.calculatePNLForPeriod(period2Start, period2End);

    return {
      period1: pnl1,
      period2: pnl2,
      comparison: {
        revenueChange: pnl2.summary.totalRevenue - pnl1.summary.totalRevenue,
        costChange: pnl2.summary.totalCost - pnl1.summary.totalCost,
        profitChange: pnl2.summary.profit - pnl1.summary.profit,
        marginChange: pnl2.summary.margin - pnl1.summary.margin
      }
    };
  }
}

// Utility functions for bulk operations
export class PriceHistoryUtils {
  /**
   * Bulk update product prices
   */
  static async bulkUpdateProductPrices(
    updates: Array<{
      productId: string;
      basePrice: number;
      retailPrice: number;
      gstRate: number;
    }>,
    effectiveDate: Date,
    userId: string,
    notes?: string
  ) {
    const results = [];
    
    for (const update of updates) {
      const result = await ProductPriceManager.updatePrice(
        update.productId,
        update.basePrice,
        update.retailPrice,
        update.gstRate,
        effectiveDate,
        userId,
        notes
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Get price trends for a product
   */
  static async getProductPriceTrends(productId: string, months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    const priceHistory = await db.select()
      .from(productPriceHistory)
      .where(
        and(
          eq(productPriceHistory.productId, productId),
          gte(productPriceHistory.effectiveDate, startDate.toISOString().split('T')[0])
        )
      )
      .orderBy(asc(productPriceHistory.effectiveDate));

    return priceHistory.map(price => ({
      date: price.effectiveDate,
      basePrice: parseFloat(price.basePrice),
      retailPrice: parseFloat(price.retailPrice),
      gstRate: parseFloat(price.gstRate)
    }));
  }

  /**
   * Initialize all price histories
   */
  static async initializeAllPriceHistories(userId: string) {
    await ProductPriceManager.initializePriceHistory(userId);
    await RawMaterialPriceManager.initializePriceHistory(userId);
    
    return {
      message: 'Price histories initialized successfully',
      timestamp: new Date().toISOString()
    };
  }
}
