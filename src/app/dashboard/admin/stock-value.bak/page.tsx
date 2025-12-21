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
  };
}

interface StockValuation {
  totalItems: number;
  totalQuantity: number;
  totalCostValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  byCategory: {
    [key: string]: {
      items: number;
      quantity: number;
      costValue: number;
      retailValue: number;
    };
  };
  byLocation: {
    [key: string]: {
      items: number;
      quantity: number;
      costValue: number;
      retailValue: number;
    };
  };
  lowStockItems: InventoryItem[];
}

const StockValuePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockValuation, setStockValuation] = useState<StockValuation | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

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

      // Check for HTTP errors
      if (!inventoryRes.ok) {
        throw new Error(`Inventory API error: ${inventoryRes.status} ${inventoryRes.statusText}`);
      }
      if (!productsRes.ok) {
        throw new Error(`Products API error: ${productsRes.status} ${productsRes.statusText}`);
      }

      const inventoryData = await inventoryRes.json();
      const productsData = await productsRes.json();

      console.log('API Response Debug:', { 
        inventoryData: Array.isArray(inventoryData.inventory) ? `${inventoryData.inventory.length} items` : inventoryData, 
        productsData: Array.isArray(productsData.products) ? `${productsData.products.length} products` : productsData 
      });

      // Check if we have the expected data structure
      if (inventoryData.inventory && productsData.products && 
          Array.isArray(inventoryData.inventory) && Array.isArray(productsData.products)) {
        
        const inventoryWithProducts = inventoryData.inventory.map((item: any) => {
          const product = productsData.products.find((p: any) => p.id === item.productId);
          return {
            ...item,
            quantity: parseFloat(item.quantity) || 0,
            costPrice: parseFloat(item.costPrice) || 0,
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

        console.log('Processed inventory items:', inventoryWithProducts.length);
        setInventory(inventoryWithProducts);
        calculateStockValuation(inventoryWithProducts);
      } else {
        console.error('Invalid data structure:', { 
          hasInventory: !!inventoryData.inventory,
          hasProducts: !!productsData.products,
          inventoryIsArray: Array.isArray(inventoryData.inventory),
          productsIsArray: Array.isArray(productsData.products),
          inventoryData, 
          productsData 
        });
        setError('Invalid response format from server. Please check the console for details.');
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError(`Failed to fetch stock data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateStockValuation = (inventory: InventoryItem[]) => {
    const valuation: StockValuation = {
      totalItems: inventory.length,
      totalQuantity: 0,
      totalCostValue: 0,
      totalRetailValue: 0,
      potentialProfit: 0,
      byCategory: {},
      byLocation: {},
      lowStockItems: []
    };

    inventory.forEach(item => {
      const quantity = item.quantity;
      const costValue = quantity * item.costPrice;
      const retailValue = quantity * parseFloat(item.product.retailPrice?.toString() || '0');

      // Totals
      valuation.totalQuantity += quantity;
      valuation.totalCostValue += costValue;
      valuation.totalRetailValue += retailValue;

      // By Category
      const category = item.product.category || 'Unknown';
      if (!valuation.byCategory[category]) {
        valuation.byCategory[category] = { items: 0, quantity: 0, costValue: 0, retailValue: 0 };
      }
      valuation.byCategory[category].items += 1;
      valuation.byCategory[category].quantity += quantity;
      valuation.byCategory[category].costValue += costValue;
      valuation.byCategory[category].retailValue += retailValue;

      // By Location
      const location = item.location || 'Unknown';
      if (!valuation.byLocation[location]) {
        valuation.byLocation[location] = { items: 0, quantity: 0, costValue: 0, retailValue: 0 };
      }
      valuation.byLocation[location].items += 1;
      valuation.byLocation[location].quantity += quantity;
      valuation.byLocation[location].costValue += costValue;
      valuation.byLocation[location].retailValue += retailValue;

      // Low stock items (assuming quantity < 50 is low stock)
      if (quantity < 50) {
        valuation.lowStockItems.push(item);
      }
    });

    valuation.potentialProfit = valuation.totalRetailValue - valuation.totalCostValue;
    setStockValuation(valuation);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'produced': return '🏭';
      case 'purchased': return '🛒';
      case 'packaging': return '📦';
      default: return '📊';
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location.toLowerCase()) {
      case 'main_store': return '🏪';
      case 'warehouse': return '🏭';
      case 'cold_storage': return '❄️';
      default: return '📍';
    }
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
          <span className="text-4xl">💰</span>
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
          <div className="space-y-2">
            <button 
              onClick={fetchStockData}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium mr-3"
            >
              🔄 Retry
            </button>
            <button 
              onClick={() => window.open('/api/test/stock-data', '_blank')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium"
            >
              🔍 Test Database Connection
            </button>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <strong>Troubleshooting:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Check if you're logged in with Admin or Accountant role</li>
              <li>Verify database connection is working</li>
              <li>Ensure inventory and products data exists</li>
              <li>Check browser console for additional error details</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!stockValuation) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No stock data available</h3>
        <p className="text-gray-500">Add some inventory items to see stock valuation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-4xl">💰</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Total Stock Value</h1>
          <p className="text-gray-600">Current inventory valuation as on {new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-blue-600">{formatNumber(stockValuation.totalItems)}</p>
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
                <p className="text-2xl font-bold text-indigo-600">{formatNumber(stockValuation.totalQuantity)}</p>
              </div>
              <div className="text-3xl">⚖️</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cost Value</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stockValuation.totalCostValue)}</p>
              </div>
              <div className="text-3xl">💸</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retail Value</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stockValuation.totalRetailValue)}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Potential Profit Card */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📈</span>
            Potential Profit Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-red-600">Investment (Cost)</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(stockValuation.totalCostValue)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-600">Retail Value</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(stockValuation.totalRetailValue)}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-600">Potential Profit</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(stockValuation.potentialProfit)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stockValuation.totalCostValue > 0 ? 
                  `${((stockValuation.potentialProfit / stockValuation.totalCostValue) * 100).toFixed(1)}% margin`
                  : '0% margin'
                }
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Breakdown by Category */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Stock Value by Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stockValuation.byCategory).map(([category, data]) => (
              <div key={category} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getCategoryIcon(category)}</span>
                  <h3 className="font-semibold text-gray-800 capitalize">{category}</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">{data.items}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{formatNumber(data.quantity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost Value:</span>
                    <span className="font-medium text-red-600">{formatCurrency(data.costValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Retail Value:</span>
                    <span className="font-medium text-green-600">{formatCurrency(data.retailValue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Breakdown by Location */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📍</span>
            Stock Value by Location
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stockValuation.byLocation).map(([location, data]) => (
              <div key={location} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getLocationIcon(location)}</span>
                  <h3 className="font-semibold text-gray-800 capitalize">{location.replace('_', ' ')}</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">{data.items}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{formatNumber(data.quantity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost Value:</span>
                    <span className="font-medium text-red-600">{formatCurrency(data.costValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Retail Value:</span>
                    <span className="font-medium text-green-600">{formatCurrency(data.retailValue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Low Stock Alerts */}
      {stockValuation.lowStockItems.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Low Stock Items ({stockValuation.lowStockItems.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value at Risk
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockValuation.lowStockItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                          <div className="text-sm text-gray-500">{item.product.category} - {item.product.type}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.location?.replace('_', ' ') || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        {formatCurrency(item.quantity * item.costPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default StockValuePage;
