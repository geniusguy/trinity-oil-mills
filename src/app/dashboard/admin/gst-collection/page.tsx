'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
import { FinancialAnalyticsChart } from '@/components/charts';

interface GSTCollectionData {
  saleType: string;
  period: {
    startDate: string;
    endDate: string;
    groupBy: string;
  };
  summary: {
    totalGstCollected: number;
    totalSales: number;
    totalRevenue: number;
    avgGstPerSale: number;
    gstPercentageOfRevenue: number;
    periodsCount: number;
  };
  gstCollection: Array<{
    period: string;
    formattedPeriod: string;
    totalSales: number;
    totalSubtotal: number;
    totalGstCollected: number;
    totalAmount: number;
    avgGstPerSale: number;
    periodStart: string;
    periodEnd: string;
  }>;
  productBreakdown: Array<{
    productName: string;
    productType: string;
    gstRate: number;
    itemsSold: number;
    totalQuantity: number;
    totalGstCollected: number;
    totalRevenue: number;
  }>;
  gstRateBreakdown: Array<{
    gstRate: number;
    salesCount: number;
    itemsCount: number;
    totalQuantity: number;
    totalGstCollected: number;
    totalRevenue: number;
  }>;
  isEmpty: boolean;
  debugInfo?: {
    hasAnyData: boolean;
    debugMessage: string;
    totalSalesInDb: number;
    salesOfTypeInDb: number;
    paidSalesInDb: number;
    salesInPeriod: number;
  };
}

export default function CombinedGSTCollectionPage() {
  const [retailGstData, setRetailGstData] = useState<GSTCollectionData | null>(null);
  const [canteenGstData, setCanteenGstData] = useState<GSTCollectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'retail' | 'canteen' | 'combined'>('combined');
  
  // Form state
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState('day');

  useEffect(() => {
    fetchGSTData();
  }, []);

  const fetchGSTData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch both retail and canteen data
      const retailParams = new URLSearchParams({
        saleType: 'retail',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        groupBy: groupBy
      });

      const canteenParams = new URLSearchParams({
        saleType: 'canteen',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        groupBy: groupBy
      });

      const [retailResponse, canteenResponse] = await Promise.all([
        fetch(`/api/reports/gst-collection?${retailParams}`),
        fetch(`/api/reports/gst-collection?${canteenParams}`)
      ]);

      const retailData = await retailResponse.json();
      const canteenData = await canteenResponse.json();

      if (retailData.success) {
        setRetailGstData(retailData.data);
      } else {
        console.error('Retail GST Error:', retailData.error);
      }

      if (canteenData.success) {
        setCanteenGstData(canteenData.data);
      } else {
        console.error('Canteen GST Error:', canteenData.error);
      }

      // Set error if both are empty
      if (retailData.data?.isEmpty && canteenData.data?.isEmpty) {
        setError('No GST data available for the selected period');
      }

    } catch (error) {
      console.error('Error fetching GST data:', error);
      setError('Failed to fetch GST collection data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    fetchGSTData();
  };

  // Calculate combined summary
  const combinedSummary = {
    totalGstCollected: (retailGstData?.summary.totalGstCollected || 0) + (canteenGstData?.summary.totalGstCollected || 0),
    totalSales: (retailGstData?.summary.totalSales || 0) + (canteenGstData?.summary.totalSales || 0),
    totalRevenue: (retailGstData?.summary.totalRevenue || 0) + (canteenGstData?.summary.totalRevenue || 0),
    retailGst: retailGstData?.summary.totalGstCollected || 0,
    canteenGst: canteenGstData?.summary.totalGstCollected || 0,
    retailSales: retailGstData?.summary.totalSales || 0,
    canteenSales: canteenGstData?.summary.totalSales || 0
  };

  // Combine GST collection data for charts
  const combinedGstCollection = [
    ...(retailGstData?.gstCollection.map(item => ({ ...item, type: 'retail' })) || []),
    ...(canteenGstData?.gstCollection.map(item => ({ ...item, type: 'canteen' })) || [])
  ].sort((a, b) => b.period.localeCompare(a.period));

  // Combine product breakdowns
  const combinedProductBreakdown = [
    ...(retailGstData?.productBreakdown.map(item => ({ ...item, saleType: 'retail' })) || []),
    ...(canteenGstData?.productBreakdown.map(item => ({ ...item, saleType: 'canteen' })) || [])
  ].sort((a, b) => b.totalGstCollected - a.totalGstCollected);

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading GST data...</span>
        </div>
      );
    }

    if (activeTab === 'combined') {
      return (
        <div className="space-y-6">
          {/* Combined Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total GST Collected</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{combinedSummary.totalGstCollected.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3-3-3h1m1 0V4.5a.5.5 0 00-1 0v7a.5.5 0 001 0z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-blue-600">{combinedSummary.totalSales}</p>
                  <p className="text-xs text-gray-500">
                    Retail: {combinedSummary.retailSales} | Canteen: {combinedSummary.canteenSales}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Retail GST</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ₹{combinedSummary.retailGst.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Canteen GST</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₹{combinedSummary.canteenGst.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </Card>
          </div>

          {/* Combined Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">GST Collection Trends - Combined</h3>
              {combinedGstCollection.length > 0 ? (
                <FinancialAnalyticsChart
                  data={combinedGstCollection.map(item => ({
                    period: item.formattedPeriod,
                    retail: item.type === 'retail' ? item.totalGstCollected : 0,
                    canteen: item.type === 'canteen' ? item.totalGstCollected : 0,
                    total: item.totalGstCollected
                  }))}
                  title="GST Collection by Period"
                  type="line"
                />
              ) : (
                <div className="text-center text-gray-500 py-8">No data available for chart</div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sales Distribution</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Retail Sales</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${combinedSummary.totalSales > 0 ? (combinedSummary.retailSales / combinedSummary.totalSales) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold">{combinedSummary.retailSales}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Canteen Sales</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-orange-600 h-2 rounded-full" 
                        style={{ width: `${combinedSummary.totalSales > 0 ? (combinedSummary.canteenSales / combinedSummary.totalSales) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold">{combinedSummary.canteenSales}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Combined Product Breakdown */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Product-wise GST Breakdown (Combined)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Sold</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST Collected</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {combinedProductBreakdown.map((product, index) => (
                    <tr key={`${product.productName}-${product.saleType}-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Badge variant={product.saleType === 'retail' ? 'purple' : 'orange'}>
                          {product.saleType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.gstRate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.itemsSold}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ₹{product.totalGstCollected.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{product.totalRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      );
    }

    // Individual tab content (retail or canteen)
    const currentData = activeTab === 'retail' ? retailGstData : canteenGstData;
    
    if (!currentData || currentData.isEmpty) {
      return (
        <div className="text-center py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <svg className="h-12 w-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">No Data Available</h3>
            <p className="text-yellow-700 mb-4">
              {currentData?.debugInfo?.debugMessage || `No ${activeTab} GST data available for the selected period`}
            </p>
            {currentData?.debugInfo && (
              <div className="text-sm text-yellow-600 bg-yellow-100 rounded p-3">
                <p><strong>Database Info:</strong></p>
                <p>Total Sales in DB: {currentData.debugInfo.totalSalesInDb}</p>
                <p>{activeTab} Sales in DB: {currentData.debugInfo.salesOfTypeInDb}</p>
                <p>Paid Sales in DB: {currentData.debugInfo.paidSalesInDb}</p>
                <p>Sales in Selected Period: {currentData.debugInfo.salesInPeriod}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Individual Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">GST Collected</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{currentData.summary.totalGstCollected.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3-3-3h1m1 0V4.5a.5.5 0 00-1 0v7a.5.5 0 001 0z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-blue-600">{currentData.summary.totalSales}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₹{currentData.summary.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg GST/Sale</p>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{currentData.summary.avgGstPerSale.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Individual Product Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Product-wise GST Breakdown - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Sold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST Collected</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentData.productBreakdown.map((product, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.gstRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.itemsSold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ₹{product.totalGstCollected.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{product.totalRevenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">GST Collection Reports</h1>
        <p className="text-gray-600">
          Comprehensive GST collection analysis for retail and canteen sales
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('combined')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'combined'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Combined View
            </button>
            <button
              onClick={() => setActiveTab('retail')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'retail'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Retail Only
            </button>
            <button
              onClick={() => setActiveTab('canteen')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'canteen'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Canteen Only
            </button>
          </nav>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
