'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
import { FinancialAnalyticsChart } from '@/components/charts';
import {
  getCurrentFinancialYearBounds,
  getCurrentFinancialYearQuarterBounds,
  getPreviousFinancialYearBounds,
} from '@/lib/financialYear';

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
}

export default function CanteenGSTCollectionPage() {
  const [gstData, setGstData] = useState<GSTCollectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [dateRange, setDateRange] = useState(() => {
    const fy = getCurrentFinancialYearBounds();
    return {
      startDate: fy.start.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    };
  });
  const [groupBy, setGroupBy] = useState('day');

  useEffect(() => {
    fetchGSTData();
  }, []);

  const fetchGSTData = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        saleType: 'canteen',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        groupBy: groupBy
      });

      const response = await fetch(`/api/reports/gst-collection?${params}`);
      const data = await response.json();

      if (data.success) {
        setGstData(data.data);
        
        if (data.data.isEmpty) {
          const debugMsg = data.data.debugInfo?.debugMessage || 'No canteen sales data available for the selected period';
          setError(debugMsg);
        }
      } else {
        setError(data.error || 'Failed to fetch GST collection data');
      }
    } catch (error) {
      console.error('Error fetching GST data:', error);
      setError('Failed to fetch GST collection data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPeriod = (period: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'today':
        startDate = endDate = new Date(now);
        break;
      case 'yesterday':
        startDate = endDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'this-week': {
        const t = new Date(now);
        startDate = new Date(t);
        startDate.setDate(t.getDate() - t.getDay());
        endDate = new Date(now);
        break;
      }
      case 'this-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now);
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this-quarter': {
        const q = getCurrentFinancialYearQuarterBounds(now);
        startDate = q.start;
        endDate = new Date(now);
        break;
      }
      case 'this-year': {
        const fy = getCurrentFinancialYearBounds(now);
        startDate = fy.start;
        endDate = new Date(now);
        break;
      }
      case 'last-fy': {
        const prev = getPreviousFinancialYearBounds(now);
        startDate = prev.start;
        endDate = prev.end;
        break;
      }
      default:
        return;
    }

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const exportToCSV = () => {
    if (!gstData) return;

    const csvContent = [
      ['Period', 'Sales Count', 'Subtotal', 'GST Collected', 'Total Amount', 'Avg GST per Sale'],
      ...gstData.gstCollection.map(item => [
        item.formattedPeriod,
        item.totalSales.toString(),
        item.totalSubtotal.toString(),
        item.totalGstCollected.toString(),
        item.totalAmount.toString(),
        item.avgGstPerSale.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canteen-gst-collection-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading canteen GST collection data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🍽️</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Canteen GST Collection</h1>
              <p className="text-gray-600 mt-1">Track GST collection from canteen bulk orders with detailed breakdowns</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={exportToCSV} 
              disabled={!gstData || gstData.isEmpty}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              📥 Export CSV
            </Button>
            <Button onClick={fetchGSTData} className="bg-blue-600 hover:bg-blue-700">
              🔄 Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Report Filters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Quick Period Buttons */}
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Periods</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'yesterday', label: 'Yesterday' },
                  { key: 'this-week', label: 'This Week' },
                  { key: 'this-month', label: 'This Month' },
                  { key: 'last-month', label: 'Last Month' },
                  { key: 'this-quarter', label: 'This FY quarter' },
                  { key: 'this-year', label: 'This FY (Apr–Mar)' },
                  { key: 'last-fy', label: 'Last FY (full)' },
                ].map(period => (
                  <Button
                    key={period.key}
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickPeriod(period.key)}
                    className="text-xs"
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Group By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="day">Daily</option>
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Yearly</option>
              </select>
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button onClick={fetchGSTData} className="w-full bg-blue-600 hover:bg-blue-700">
                📊 Generate Report
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center">
            <span className="text-yellow-600 mr-2">⚠️</span>
            <div className="text-yellow-800">{error}</div>
          </div>
          {gstData?.debugInfo && (
            <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-3 rounded">
              <strong>Debug Info:</strong><br/>
              Total Sales in DB: {gstData.debugInfo.totalSalesInDb}<br/>
              Canteen Sales in DB: {gstData.debugInfo.salesOfTypeInDb}<br/>
              Paid Sales in DB: {gstData.debugInfo.paidSalesInDb}<br/>
              Date Range in DB: {gstData.debugInfo.earliestSale} to {gstData.debugInfo.latestSale}
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {gstData && !gstData.isEmpty && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(gstData.summary.totalGstCollected)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total GST Collected</div>
              <div className="text-xs text-gray-500 mt-1">
                {gstData.summary.gstPercentageOfRevenue.toFixed(1)}% of total revenue
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                {gstData.summary.totalSales.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Orders</div>
              <div className="text-xs text-gray-500 mt-1">
                Bulk canteen orders
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {formatCurrency(gstData.summary.totalRevenue)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Revenue</div>
              <div className="text-xs text-gray-500 mt-1">
                Including GST
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {formatCurrency(gstData.summary.avgGstPerSale)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Avg GST per Order</div>
              <div className="text-xs text-gray-500 mt-1">
                Per bulk order
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Canteen-specific Insights */}
      {gstData && !gstData.isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">💡 Canteen Insights</h4>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• Bulk orders typically have higher GST per transaction</li>
                <li>• Canteen sales often involve larger quantities</li>
                <li>• Regular customers may have negotiated rates</li>
                <li>• Monthly patterns reflect institutional ordering cycles</li>
              </ul>
            </div>
          </Card>

          <Card>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">📊 Performance Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Revenue per Period:</span>
                  <span className="font-semibold text-green-800">
                    {gstData.summary.periodsCount > 0 ? 
                      formatCurrency(gstData.summary.totalRevenue / gstData.summary.periodsCount) : 
                      formatCurrency(0)
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">GST per Period:</span>
                  <span className="font-semibold text-green-800">
                    {gstData.summary.periodsCount > 0 ? 
                      formatCurrency(gstData.summary.totalGstCollected / gstData.summary.periodsCount) : 
                      formatCurrency(0)
                    }
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">🎯 Business Impact</h4>
              <ul className="space-y-1 text-sm text-purple-700">
                <li>• Consistent canteen revenue stream</li>
                <li>• Predictable GST collection patterns</li>
                <li>• Bulk pricing optimization opportunities</li>
                <li>• Long-term customer relationship benefits</li>
              </ul>
            </div>
          </Card>
        </div>
      )}

      {/* Charts */}
      {gstData && !gstData.isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 GST Collection Trend</h3>
              <FinancialAnalyticsChart
                type="revenue-trend"
                data={gstData.gstCollection.slice(0, 10).reverse().map(item => ({
                  period: item.formattedPeriod,
                  revenue: item.totalGstCollected,
                  profit: item.totalAmount - item.totalSubtotal
                }))}
                height={300}
              />
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🥧 GST by Rate</h3>
              <FinancialAnalyticsChart
                type="expense-breakdown"
                data={gstData.gstRateBreakdown.map(item => ({
                  name: `${item.gstRate}% GST`,
                  amount: item.totalGstCollected
                }))}
                height={300}
              />
            </div>
          </Card>
        </div>
      )}

      {/* GST Collection Table */}
      {gstData && !gstData.isEmpty && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Detailed GST Collection</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Period</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Orders Count</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Subtotal</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">GST Collected</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Total Amount</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Avg GST/Order</th>
                  </tr>
                </thead>
                <tbody>
                  {gstData.gstCollection.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{item.formattedPeriod}</td>
                      <td className="py-3 px-4 text-right">{item.totalSales.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.totalSubtotal)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-600">
                        {formatCurrency(item.totalGstCollected)}
                      </td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.totalAmount)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.avgGstPerSale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Product Breakdown */}
      {gstData && !gstData.isEmpty && gstData.productBreakdown.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🛢️ Product-wise GST Collection</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Product</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">GST Rate</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Items Sold</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Quantity</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">GST Collected</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {gstData.productBreakdown.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-gray-500 capitalize">{item.productType}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="secondary">{item.gstRate}%</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">{item.itemsSold.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{item.totalQuantity.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-600">
                        {formatCurrency(item.totalGstCollected)}
                      </td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.totalRevenue)}</td>
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
}
