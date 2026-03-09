"use client";
import React, { useEffect, useState } from 'react';
import { Card, LoadingSpinner } from '@/components/ui';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  costPrice: number;
  location: string;
  batchNumber?: string;
  expiryDate?: string;
  product: {
    id: string;
    name: string;
    category: string;
    type: string;
    basePrice: number;
    retailPrice: number;
    unit: string;
  };
}

interface StockValuation {
  totalItems: number;
  totalQuantity: number;
  totalCostValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  inventoryItems: InventoryItem[];
  byOilType: {
    [key: string]: {
      items: InventoryItem[];
      totalQuantity: number;
      totalCostValue: number;
      totalRetailValue: number;
      potentialProfit: number;
    };
  };
}

const StockValuePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [valuation, setValuation] = useState<StockValuation | null>(null);

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [inventoryRes, productsRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/products')
      ]);

      if (!inventoryRes.ok || !productsRes.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const inventoryData = await inventoryRes.json();
      const productsData = await productsRes.json();

      if (inventoryData.inventory && productsData.products && 
          Array.isArray(inventoryData.inventory) && Array.isArray(productsData.products)) {
        
        const inventoryWithProducts = inventoryData.inventory.map((item: any) => {
          const product = productsData.products.find((p: any) => p.id === item.productId);
          return {
            ...item,
            quantity: Number(item.quantity) || 0,
            costPrice: Number(item.costPrice) || 0,
            product: product || {
              id: item.productId,
              name: 'Unknown Product',
              category: 'Unknown',
              type: 'Unknown',
              basePrice: 0,
              retailPrice: 0
            }
          };
        });

        calculateStockValuation(inventoryWithProducts);
      } else {
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError(`Failed to fetch stock data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateStockValuation = (inventory: any[]) => {
    let totalItems = 0;
    let totalQuantity = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;

    // Group by oil type
    const byOilType: { [key: string]: any } = {};

    inventory.forEach(item => {
      totalItems++;
      totalQuantity += item.quantity;
      totalCostValue += item.quantity * item.costPrice;
      totalRetailValue += item.quantity * item.product.retailPrice;

      // Group by oil type
      const oilType = item.product.type || 'Other';
      if (!byOilType[oilType]) {
        byOilType[oilType] = {
          items: [],
          totalQuantity: 0,
          totalCostValue: 0,
          totalRetailValue: 0,
          potentialProfit: 0
        };
      }

      byOilType[oilType].items.push(item);
      byOilType[oilType].totalQuantity += item.quantity;
      byOilType[oilType].totalCostValue += item.quantity * item.costPrice;
      byOilType[oilType].totalRetailValue += item.quantity * item.product.retailPrice;
    });

    // Calculate potential profit for each oil type
    Object.keys(byOilType).forEach(oilType => {
      byOilType[oilType].potentialProfit = byOilType[oilType].totalRetailValue - byOilType[oilType].totalCostValue;
    });

    const potentialProfit = totalRetailValue - totalCostValue;

    setValuation({
      totalItems,
      totalQuantity,
      totalCostValue,
      totalRetailValue,
      potentialProfit,
      inventoryItems: inventory,
      byOilType
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Calculating stock value..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">📦</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Total Stock Value</h1>
            <p className="text-gray-600">Current inventory valuation</p>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">❌</span>
            <h3 className="text-lg font-semibold text-red-800">Error Loading Stock Data</h3>
          </div>
          <div className="text-red-700 mb-4">{error}</div>
          <button 
            onClick={fetchStockData}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!valuation) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
        <p className="text-gray-500">Unable to calculate stock value at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-4xl">📦</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Total Stock Value</h1>
          <p className="text-gray-600">Current inventory valuation and analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-blue-600">{valuation.totalItems}</p>
              </div>
              <div className="text-3xl">📦</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                <p className="text-2xl font-bold text-green-600">{valuation.totalQuantity.toFixed(2)}</p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cost Value</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(valuation.totalCostValue)}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retail Value</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(valuation.totalRetailValue)}</p>
              </div>
              <div className="text-3xl">💎</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Profit Analysis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl mb-2">📈</div>
              <h3 className="font-semibold text-green-800">Potential Profit</h3>
              <p className="text-2xl font-bold text-green-600 my-2">{formatCurrency(valuation.potentialProfit)}</p>
              <p className="text-sm text-green-700">If all stock sold at retail price</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold text-blue-800">Profit Margin</h3>
              <p className="text-2xl font-bold text-blue-600 my-2">
                {valuation.totalCostValue > 0 
                  ? ((valuation.potentialProfit / valuation.totalCostValue) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-sm text-blue-700">Markup percentage</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold text-purple-800">Value Ratio</h3>
              <p className="text-2xl font-bold text-purple-600 my-2">
                {valuation.totalCostValue > 0 
                  ? (valuation.totalRetailValue / valuation.totalCostValue).toFixed(2)
                  : 0}x
              </p>
              <p className="text-sm text-purple-700">Retail to cost ratio</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">All Oils Stock Details</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-3 px-2 font-semibold text-gray-800">Oil Type</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-800">Product Name</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-800">Unit</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-800">Available Qty</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-800">Cost Price</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-800">Retail Price</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-800">Cost Value</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-800">Retail Value</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-800">Profit</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-800">Location</th>
                </tr>
              </thead>
              <tbody>
                {valuation.inventoryItems.map((item) => {
                  const costValue = item.quantity * item.costPrice;
                  const retailValue = item.quantity * item.product.retailPrice;
                  const profit = retailValue - costValue;
                  const profitMargin = costValue > 0 ? (profit / costValue) * 100 : 0;
                  
                  return (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                      <td className="py-3 px-2">
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {item.product.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium text-gray-900">{item.product.name}</td>
                      <td className="py-3 px-2 text-center text-gray-600">{item.product.unit}</td>
                      <td className="py-3 px-2 text-right font-medium text-gray-900">{item.quantity.toFixed(2)}</td>
                      <td className="py-3 px-2 text-right text-gray-700">{formatCurrency(item.costPrice)}</td>
                      <td className="py-3 px-2 text-right text-gray-700">{formatCurrency(item.product.retailPrice)}</td>
                      <td className="py-3 px-2 text-right font-medium text-blue-600">{formatCurrency(costValue)}</td>
                      <td className="py-3 px-2 text-right font-medium text-green-600">{formatCurrency(retailValue)}</td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(profit)}
                          </span>
                          <span className={`text-xs ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {profitMargin.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-600">{item.location}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-400 bg-gray-100">
                  <td colSpan={6} className="py-3 px-2 font-bold text-gray-800">TOTAL INVENTORY:</td>
                  <td className="py-3 px-2 text-right font-bold text-blue-800">{formatCurrency(valuation.totalCostValue)}</td>
                  <td className="py-3 px-2 text-right font-bold text-green-800">{formatCurrency(valuation.totalRetailValue)}</td>
                  <td className="py-3 px-2 text-right font-bold">
                    <div className="flex flex-col items-end">
                      <span className={valuation.potentialProfit >= 0 ? 'text-green-800' : 'text-red-800'}>
                        {formatCurrency(valuation.potentialProfit)}
                      </span>
                      <span className={`text-xs ${valuation.potentialProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {valuation.totalCostValue > 0 ? ((valuation.potentialProfit / valuation.totalCostValue) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{valuation.totalItems}</div>
              <div className="text-sm text-blue-700">Total Products</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{valuation.totalQuantity.toFixed(0)}</div>
              <div className="text-sm text-green-700">Total Quantity</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {valuation.totalCostValue > 0 ? ((valuation.potentialProfit / valuation.totalCostValue) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-purple-700">Profit Margin</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Object.keys(valuation.byOilType).length}
              </div>
              <div className="text-sm text-orange-700">Oil Types</div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Overall Summary</h2>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              • <strong>Total Items:</strong> {valuation.totalItems} different products in inventory
            </p>
            <p>
              • <strong>Total Quantity:</strong> {valuation.totalQuantity.toFixed(2)} units across all products
            </p>
            <p>
              • <strong>Cost Value:</strong> {formatCurrency(valuation.totalCostValue)} (purchase cost)
            </p>
            <p>
              • <strong>Retail Value:</strong> {formatCurrency(valuation.totalRetailValue)} (selling price)
            </p>
            <p>
              • <strong>Potential Profit:</strong> {formatCurrency(valuation.potentialProfit)} if all stock sold
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StockValuePage;