import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { inventory, products, sales, expenses, savingsInvestments } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate Assets
    // 1. Current Assets - Cash (from sales revenue minus expenses)
    const salesResult = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${sales.totalAmount} AS DECIMAL(10,2))), 0)`
      })
      .from(sales);

    const expensesResult = await db
      .select({
        totalExpenses: sql<number>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL(10,2))), 0)`
      })
      .from(expenses);

    // 2. Inventory Value (Current Stock)
    const inventoryResult = await db
      .select({
        productId: inventory.productId,
        quantity: inventory.quantity,
        costPrice: inventory.costPrice,
        product: {
          retailPrice: products.retailPrice
        }
      })
      .from(inventory)
      .innerJoin(products, sql`${inventory.productId} = ${products.id}`);

    // 3. Investments & Savings
    const investmentsResult = await db
      .select({
        totalInvestment: sql<number>`COALESCE(SUM(CAST(${savingsInvestments.amount} AS DECIMAL(15,2))), 0)`,
        totalCurrentValue: sql<number>`COALESCE(SUM(CAST(COALESCE(${savingsInvestments.currentValue}, ${savingsInvestments.amount}) AS DECIMAL(15,2))), 0)`
      })
      .from(savingsInvestments)
      .where(sql`${savingsInvestments.status} IN ('active', 'matured')`);

    // Calculate inventory values
    let inventoryAtCost = 0;
    let inventoryAtRetail = 0;
    
    inventoryResult.forEach(item => {
      const quantity = Number(item.quantity ?? 0) || 0;
      const costPrice = Number(item.costPrice ?? 0) || 0;
      const retailPrice = Number(item.product?.retailPrice ?? 0) || 0;

      inventoryAtCost += quantity * costPrice;
      inventoryAtRetail += quantity * retailPrice;
    });

    const totalRevenue = salesResult[0]?.totalRevenue || 0;
    const totalExpenses = expensesResult[0]?.totalExpenses || 0;
    const cashFromOperations = totalRevenue - totalExpenses;
    
    const totalInvestments = investmentsResult[0]?.totalInvestment || 0;
    const currentInvestmentValue = investmentsResult[0]?.totalCurrentValue || 0;

    // Assets Calculation
    const currentAssets = {
      cash: Math.max(cashFromOperations, 0), // Assume positive cash
      inventory: inventoryAtCost,
      accountsReceivable: 0, // Assuming immediate cash sales for oil mill
      totalCurrent: Math.max(cashFromOperations, 0) + inventoryAtCost
    };

    const fixedAssets = {
      investments: currentInvestmentValue,
      equipment: 0, // Would need separate equipment tracking
      property: 0,  // Would need property value tracking
      totalFixed: currentInvestmentValue
    };

    const totalAssets = currentAssets.totalCurrent + fixedAssets.totalFixed;

    // Liabilities Calculation (simplified - would need more detailed tracking)
    const currentLiabilities = {
      accountsPayable: Math.max(-cashFromOperations, 0), // If cash is negative, treat as payables
      shortTermLoans: 0, // Would need loan tracking
      totalCurrent: Math.max(-cashFromOperations, 0)
    };

    const longTermLiabilities = {
      longTermLoans: 0, // Would need loan tracking
      totalLongTerm: 0
    };

    const totalLiabilities = currentLiabilities.totalCurrent + longTermLiabilities.totalLongTerm;

    // Equity Calculation
    const bookValue = totalAssets - totalLiabilities;
    
    // Additional metrics
    const inventoryTurnover = inventoryAtCost > 0 ? totalRevenue / inventoryAtCost : 0;
    const assetTurnover = totalAssets > 0 ? totalRevenue / totalAssets : 0;
    const returnOnAssets = totalAssets > 0 ? (totalRevenue - totalExpenses) / totalAssets * 100 : 0;

    const bookValueData = {
      assets: {
        current: currentAssets,
        fixed: fixedAssets,
        total: totalAssets
      },
      liabilities: {
        current: currentLiabilities,
        longTerm: longTermLiabilities,
        total: totalLiabilities
      },
      equity: {
        bookValue,
        retainedEarnings: totalRevenue - totalExpenses
      },
      metrics: {
        inventoryTurnover: Number(inventoryTurnover.toFixed(2)),
        assetTurnover: Number(assetTurnover.toFixed(2)),
        returnOnAssets: Number(returnOnAssets.toFixed(2))
      },
      breakdown: {
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        inventoryAtCost,
        inventoryAtRetail,
        totalInvestments,
        currentInvestmentValue,
        investmentGainLoss: currentInvestmentValue - totalInvestments
      },
      calculationDate: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: bookValueData
    });
  } catch (error) {
    console.error('Error calculating book value:', error);
    return NextResponse.json(
      { error: 'Failed to calculate book value' },
      { status: 500 }
    );
  }
}
