'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, LoadingSpinner } from '@/components/ui';

interface Product {
  id: string;
  name: string;
  basePrice: string;
  retailPrice: string;
  gstRate: string;
  category: string;
}

interface PriceHistory {
  id: string;
  basePrice: string;
  retailPrice: string;
  gstRate: string;
  effectiveDate: string;
  endDate?: string;
  isActive: boolean;
  createdBy: string;
  notes?: string;
}

interface PriceAnalytics {
  totalProducts: number;
  productsWithHistory: number;
  recentUpdates: number;
  averageMargin: number;
  topMarginProducts: Array<{
    id: string;
    name: string;
    margin: number;
  }>;
}

export default function PriceManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [analytics, setAnalytics] = useState<PriceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'bulk' | 'analytics'>('single');
  const [error, setError] = useState<string | null>(null);
  const [bulkForm, setBulkForm] = useState({
    percentageIncrease: '',
    fixedAmountIncrease: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    category: '',
    selectedProducts: [] as string[]
  });
  
  const [updateForm, setUpdateForm] = useState({
    basePrice: '',
    retailPrice: '',
    gstRate: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchPriceHistory(selectedProduct);
    }
  }, [selectedProduct]);

  const fetchProducts = async () => {
    try {
      setError(null);
      const response = await fetch('/api/products');
      const data = await response.json();
      console.log('Products API response:', data);
      
      if (data.products) {
        setProducts(data.products);
      } else if (data.success && data.data) {
        setProducts(data.data);
      } else {
        console.error('Unexpected products API response format:', data);
        setError('Failed to load products. Please check the console for details.');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/price-history/analytics');
      const data = await response.json();
      console.log('Analytics API response:', data);
      
      if (data.success) {
        setAnalytics(data.data);
      } else {
        console.error('Analytics API error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchPriceHistory = async (productId: string) => {
    try {
      const response = await fetch(`/api/price-history/products?productId=${productId}`);
      const data = await response.json();
      console.log('Price history API response:', data);
      
      if (data.success) {
        setPriceHistory(data.data || []);
        
        // Populate form with current prices
        const currentPrice = data.data?.find((p: PriceHistory) => p.isActive);
        if (currentPrice) {
          setUpdateForm(prev => ({
            ...prev,
            basePrice: currentPrice.basePrice,
            retailPrice: currentPrice.retailPrice,
            gstRate: currentPrice.gstRate
          }));
        }
      } else {
        console.error('Price history API error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/price-history/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedProduct,
          ...updateForm
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowUpdateForm(false);
        await fetchPriceHistory(selectedProduct);
        await fetchProducts(); // Refresh product list with new prices
        
        setUpdateForm({
          basePrice: '',
          retailPrice: '',
          gstRate: '',
          effectiveDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
      } else {
        alert('Error updating price: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Error updating price');
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const calculateMargin = (basePrice: string, retailPrice: string) => {
    const base = parseFloat(basePrice);
    const retail = parseFloat(retailPrice);
    return retail > 0 ? ((retail - base) / retail * 100) : 0;
  };

  const calculateMarginAmount = (basePrice: string, retailPrice: string) => {
    const base = parseFloat(basePrice);
    const retail = parseFloat(retailPrice);
    return retail - base;
  };

  const initializePriceHistory = async () => {
    try {
      const response = await fetch('/api/price-history/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success) {
        alert('Price history initialized successfully!');
        await fetchProducts();
        await fetchAnalytics();
      } else {
        alert('Error initializing price history: ' + data.error);
      }
    } catch (error) {
      console.error('Error initializing price history:', error);
      alert('Error initializing price history');
    }
  };

  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.percentageIncrease && !bulkForm.fixedAmountIncrease) {
      alert('Please enter either percentage increase or fixed amount increase');
      return;
    }

    try {
      setUpdating(true);
      
      // Get products to update (all products or selected category)
      const productsToUpdate = bulkForm.category 
        ? products.filter(p => p.category === bulkForm.category)
        : products;

      if (productsToUpdate.length === 0) {
        alert('No products found for the selected category');
        return;
      }

      // Prepare updates
      const updates = productsToUpdate.map(product => {
        const currentBasePrice = parseFloat(product.basePrice.toString());
        const currentRetailPrice = parseFloat(product.retailPrice.toString());
        
        let newBasePrice = currentBasePrice;
        let newRetailPrice = currentRetailPrice;

        if (bulkForm.percentageIncrease) {
          const percentage = parseFloat(bulkForm.percentageIncrease) / 100;
          newBasePrice = currentBasePrice * (1 + percentage);
          newRetailPrice = currentRetailPrice * (1 + percentage);
        } else if (bulkForm.fixedAmountIncrease) {
          const fixedAmount = parseFloat(bulkForm.fixedAmountIncrease);
          newBasePrice = currentBasePrice + fixedAmount;
          newRetailPrice = currentRetailPrice + fixedAmount;
        }

        return {
          productId: product.id,
          basePrice: newBasePrice.toFixed(2),
          retailPrice: newRetailPrice.toFixed(2),
          gstRate: product.gstRate.toString()
        };
      });

      const response = await fetch('/api/price-history/products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates,
          effectiveDate: bulkForm.effectiveDate,
          notes: `Bulk update: ${bulkForm.percentageIncrease ? bulkForm.percentageIncrease + '%' : '₹' + bulkForm.fixedAmountIncrease} increase`
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Bulk update successful! Updated ${updates.length} products.`);
        setBulkForm({
          percentageIncrease: '',
          fixedAmountIncrease: '',
          effectiveDate: new Date().toISOString().split('T')[0],
          category: '',
          selectedProducts: []
        });
        await fetchProducts();
        await fetchAnalytics();
      } else {
        alert('Bulk update failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error in bulk update:', error);
      alert('Error in bulk update');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading price management..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-4xl">💰</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Price Management</h1>
            <p className="text-gray-600">Manage product pricing with historical tracking</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'single' ? 'default' : 'outline'}
            onClick={() => setViewMode('single')}
            size="sm"
          >
            Single Product
          </Button>
          <Button
            variant={viewMode === 'bulk' ? 'default' : 'outline'}
            onClick={() => setViewMode('bulk')}
            size="sm"
          >
            Bulk Update
          </Button>
          <Button
            variant={viewMode === 'analytics' ? 'default' : 'outline'}
            onClick={() => setViewMode('analytics')}
            size="sm"
          >
            Analytics
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error Loading Data</h3>
              <p className="text-red-700">{error}</p>
              <div className="mt-3 flex gap-2">
                <Button onClick={fetchProducts} size="sm" variant="outline">
                  Retry
                </Button>
                <Button onClick={initializePriceHistory} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Initialize Price History
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics View */}
      {viewMode === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Simple Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <div className="p-4 text-center">
                <div className="text-2xl mb-2">📦</div>
                <p className="text-sm text-blue-600">Total Products</p>
                <p className="text-2xl font-bold text-blue-900">{analytics.totalProducts}</p>
              </div>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <div className="p-4 text-center">
                <div className="text-2xl mb-2">📊</div>
                <p className="text-sm text-green-600">With Price History</p>
                <p className="text-2xl font-bold text-green-900">{analytics.productsWithHistory}</p>
              </div>
            </Card>
            
            <Card className="bg-purple-50 border-purple-200">
              <div className="p-4 text-center">
                <div className="text-2xl mb-2">📈</div>
                <p className="text-sm text-purple-600">Recent Updates</p>
                <p className="text-2xl font-bold text-purple-900">{analytics.recentUpdates}</p>
              </div>
            </Card>
            
            <Card className="bg-orange-50 border-orange-200">
              <div className="p-4 text-center">
                <div className="text-2xl mb-2">💰</div>
                <p className="text-sm text-orange-600">Average Margin</p>
                <p className="text-2xl font-bold text-orange-900">{analytics.averageMargin.toFixed(1)}%</p>
              </div>
            </Card>
          </div>

          {/* Product Price History - Main Focus */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Product Price History</h2>
                <span className="text-sm text-gray-500">Each product's price changes</span>
              </div>
              
              {products.length > 0 ? (
                <div className="space-y-6">
                  {products.map((product) => {
                    // Find price history for this product
                    const productPriceHistory = priceHistory.filter(p => p.productId === product.id);
                    const currentPrice = productPriceHistory.find(p => p.isActive);
                    const previousPrice = productPriceHistory
                      .filter(p => !p.isActive)
                      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0];
                    
                    const priceIncrease = currentPrice && previousPrice ? 
                      ((parseFloat(currentPrice.retailPrice) - parseFloat(previousPrice.retailPrice)) / parseFloat(previousPrice.retailPrice)) * 100 : 0;
                    
                    const priceIncreaseAmount = currentPrice && previousPrice ? 
                      parseFloat(currentPrice.retailPrice) - parseFloat(previousPrice.retailPrice) : 0;

                    return (
                      <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                            <p className="text-sm text-gray-500">ID: {product.id} | Type: {product.type} | Unit: {product.unit}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              ₹{currentPrice ? parseFloat(currentPrice.retailPrice).toFixed(2) : parseFloat(product.retailPrice).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">Current Price</p>
                          </div>
                        </div>

                        {productPriceHistory.length > 0 ? (
                          <div className="space-y-3">
                            {/* Price Change Summary */}
                            {priceIncrease !== 0 && (
                              <div className={`p-3 rounded-lg ${priceIncrease > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className={`font-medium ${priceIncrease > 0 ? 'text-green-800' : 'text-red-800'}`}>
                                      {priceIncrease > 0 ? 'Price Increased' : 'Price Decreased'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {previousPrice && `From ₹${parseFloat(previousPrice.retailPrice).toFixed(2)} to ₹${parseFloat(currentPrice?.retailPrice || '0').toFixed(2)}`}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-lg font-bold ${priceIncrease > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {priceIncrease > 0 ? '+' : ''}{priceIncrease.toFixed(1)}%
                                    </p>
                                    <p className={`text-sm ${priceIncrease > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {priceIncreaseAmount > 0 ? '+' : ''}₹{priceIncreaseAmount.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Price History Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 px-3 font-medium text-gray-700">Date</th>
                                    <th className="text-right py-2 px-3 font-medium text-gray-700">Base Price</th>
                                    <th className="text-right py-2 px-3 font-medium text-gray-700">Retail Price</th>
                                    <th className="text-right py-2 px-3 font-medium text-gray-700">GST Rate</th>
                                    <th className="text-center py-2 px-3 font-medium text-gray-700">Status</th>
                                    <th className="text-left py-2 px-3 font-medium text-gray-700">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {productPriceHistory
                                    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())
                                    .map((price, index) => (
                                    <tr key={price.id} className="border-b border-gray-100">
                                      <td className="py-2 px-3 text-gray-900">
                                        {new Date(price.effectiveDate).toLocaleDateString()}
                                      </td>
                                      <td className="py-2 px-3 text-right text-gray-700">
                                        ₹{parseFloat(price.basePrice).toFixed(2)}
                                      </td>
                                      <td className="py-2 px-3 text-right text-gray-700">
                                        ₹{parseFloat(price.retailPrice).toFixed(2)}
                                      </td>
                                      <td className="py-2 px-3 text-right text-gray-700">
                                        {parseFloat(price.gstRate).toFixed(1)}%
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          price.isActive 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {price.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-gray-600 text-sm">
                                        {price.notes || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <p>No price history available for this product</p>
                            <p className="text-sm">Current price: ₹{parseFloat(product.retailPrice).toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No products found</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Single Product View */}
      {viewMode === 'single' && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Select Product</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select a product...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.retailPrice)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedProduct && (
                <div className="flex items-end">
                  <Button
                    onClick={() => setShowUpdateForm(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Update Price
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Bulk Update View */}
      {viewMode === 'bulk' && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Bulk Price Update</h2>
            <form onSubmit={handleBulkUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Percentage Increase (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={bulkForm.percentageIncrease}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, percentageIncrease: e.target.value, fixedAmountIncrease: '' }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fixed Amount Increase (₹)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="10.00"
                    value={bulkForm.fixedAmountIncrease}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, fixedAmountIncrease: e.target.value, percentageIncrease: '' }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Effective Date
                  </label>
                  <Input
                    type="date"
                    value={bulkForm.effectiveDate}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    className="w-full"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Filter (Optional)
                </label>
                <select
                  value={bulkForm.category}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Products</option>
                  <option value="produced">Produced</option>
                  <option value="purchased">Purchased</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Apply Bulk Update'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setBulkForm({
                    percentageIncrease: '',
                    fixedAmountIncrease: '',
                    effectiveDate: new Date().toISOString().split('T')[0],
                    category: '',
                    selectedProducts: []
                  })}
                >
                  Reset Form
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Update Price Form */}
      {showUpdateForm && viewMode === 'single' && (
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Update Product Price</h2>
              <Button
                variant="outline"
                onClick={() => setShowUpdateForm(false)}
              >
                Cancel
              </Button>
            </div>

            <form onSubmit={handleUpdatePrice} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price (₹) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={updateForm.basePrice}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, basePrice: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retail Price (₹) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={updateForm.retailPrice}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, retailPrice: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Rate (%) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={updateForm.gstRate}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, gstRate: e.target.value }))}
                    placeholder="5.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Date *
                  </label>
                  <Input
                    type="date"
                    value={updateForm.effectiveDate}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <Input
                    value={updateForm.notes}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Reason for price change..."
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={updating}>
                  {updating ? 'Updating...' : 'Update Price'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowUpdateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Price History */}
      {selectedProduct && priceHistory.length > 0 && viewMode === 'single' && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Price History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Effective Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Retail Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GST Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {priceHistory.map((history) => (
                    <tr key={history.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(history.effectiveDate)}
                        {history.endDate && (
                          <div className="text-xs text-gray-500">
                            Until: {formatDate(history.endDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(history.basePrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                        {formatCurrency(history.retailPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {history.gstRate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {calculateMargin(history.basePrice, history.retailPrice).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(calculateMarginAmount(history.basePrice, history.retailPrice).toString())}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          history.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {history.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {history.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {selectedProduct && priceHistory.length === 0 && viewMode === 'single' && (
        <Card>
          <div className="p-6 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Price History</h3>
            <p className="text-gray-500 mb-6">No price history found for this product.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowUpdateForm(true)} className="bg-blue-600 hover:bg-blue-700">
                Add First Price Entry
              </Button>
              <Button onClick={initializePriceHistory} variant="outline">
                Initialize All Price History
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
