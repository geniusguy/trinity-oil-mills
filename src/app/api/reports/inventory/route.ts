import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { inventory, products } from '@/db/schema';
import { eq, lt } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get inventory data with product details
    const inventoryData = await db
      .select({
        inventoryId: inventory.id,
        productId: inventory.productId,
        quantity: inventory.quantity,
        minStock: inventory.minStock,
        maxStock: inventory.maxStock,
        location: inventory.location,
        batchNumber: inventory.batchNumber,
        expiryDate: inventory.expiryDate,
        costPrice: inventory.costPrice,
        updatedAt: inventory.updatedAt,
        productName: products.name,
        productCategory: products.category,
        productType: products.type,
        productUnit: products.unit,
        productBasePrice: products.basePrice,
        productRetailPrice: products.retailPrice,
        isActive: products.isActive
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(eq(products.isActive, true));

    // Process inventory data
    const processedInventory = inventoryData.map(item => ({
      id: item.inventoryId,
      productId: item.productId,
      productName: item.productName,
      productCategory: item.productCategory,
      productType: item.productType,
      unit: item.productUnit,
      quantity: parseFloat(item.quantity?.toString() || '0'),
      minStock: parseFloat(item.minStock?.toString() || '0'),
      maxStock: parseFloat(item.maxStock?.toString() || '0'),
      location: item.location,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      costPrice: parseFloat(item.costPrice?.toString() || '0'),
      basePrice: parseFloat(item.productBasePrice?.toString() || '0'),
      retailPrice: parseFloat(item.productRetailPrice?.toString() || '0'),
      updatedAt: item.updatedAt,
      stockStatus: getStockStatus(
        parseFloat(item.quantity?.toString() || '0'),
        parseFloat(item.minStock?.toString() || '0'),
        parseFloat(item.maxStock?.toString() || '0')
      ),
      stockValue: parseFloat(item.quantity?.toString() || '0') * parseFloat(item.costPrice?.toString() || '0')
    }));

    // Calculate summary statistics
    const summary = {
      totalItems: processedInventory.length,
      totalStockValue: processedInventory.reduce((sum, item) => sum + item.stockValue, 0),
      lowStockItems: processedInventory.filter(item => item.stockStatus === 'low').length,
      outOfStockItems: processedInventory.filter(item => item.stockStatus === 'out').length,
      overStockItems: processedInventory.filter(item => item.stockStatus === 'over').length,
      normalStockItems: processedInventory.filter(item => item.stockStatus === 'normal').length,
      producedItems: processedInventory.filter(item => item.productCategory === 'produced').length,
      purchasedItems: processedInventory.filter(item => item.productCategory === 'purchased').length
    };

    // Group by category and type
    const byCategory = processedInventory.reduce((acc: any, item) => {
      if (!acc[item.productCategory]) {
        acc[item.productCategory] = [];
      }
      acc[item.productCategory].push(item);
      return acc;
    }, {});

    const byType = processedInventory.reduce((acc: any, item) => {
      if (!acc[item.productType]) {
        acc[item.productType] = [];
      }
      acc[item.productType].push(item);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        inventory: processedInventory,
        summary,
        groupedData: {
          byCategory,
          byType
        }
      }
    });

  } catch (error) {
    console.error('Error fetching inventory report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory report' },
      { status: 500 }
    );
  }
}

function getStockStatus(quantity: number, minStock: number, maxStock: number): string {
  if (quantity <= 0) return 'out';
  if (quantity < minStock) return 'low';
  if (quantity > maxStock) return 'over';
  return 'normal';
}

