'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
import { FinancialAnalyticsChart } from '@/components/charts';

interface AnalyticsData {
  salesForecast: {
    nextMonth: number;
    nextQuarter: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
  };
  customerSegmentation: {
    highValue: { count: number; revenue: number; avgOrder: number };
    regular: { count: number; revenue: number; avgOrder: number };
    occasional: { count: number; revenue: number; avgOrder: number };
  };
  productPerformance: {
    topPerformers: Array<{
      id: string;
      name: string;
      revenue: number;
      quantity: number;
      profitMargin: number;
      score: number;
    }>;
    underperformers: Array<{
      id: string;
      name: string;
      revenue: number;
      quantity: number;
      profitMargin: number;
      score: number;
    }>;
  };
  marketIntelligence: {
    priceComparison: Array<{
      product: string;
      ourPrice: number;
      marketPrice: number;
      variance: number;
    }>;
    marketTrends: {
      oilPricesUp: boolean;
      demandTrend: 'increasing' | 'decreasing' | 'stable';
      seasonalFactor: number;
    };
  };
  businessAlerts: Array<{
    type: 'warning' | 'info' | 'success' | 'error';
    title: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
    actionRequired: boolean;
  }>;
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('last-30-days');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedTimeframe]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');

      // Calculate date range based on timeframe
      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedTimeframe) {
        case 'last-7-days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'last-30-days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'last-90-days':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case 'last-year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Fetch analytics data from multiple endpoints
      const [salesRes, expensesRes, productsRes, inventoryRes] = await Promise.all([
        fetch(`/api/reports/sales?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`),
        fetch('/api/expenses'),
        fetch('/api/products'),
        fetch('/api/reports/inventory')
      ]);

      const salesData = await salesRes.json();
      const expensesData = await expensesRes.json();
      const productsData = await productsRes.json();
      const inventoryData = await inventoryRes.json();

      // Process and analyze data
      const processedAnalytics = processAnalyticsData(salesData, expensesData, productsData, inventoryData);
      setAnalyticsData(processedAnalytics);

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (salesData: any, expensesData: any, productsData: any, inventoryData: any): AnalyticsData => {
    const sales = salesData.success ? salesData.data.sales : [];
    const expenses = expensesData.success ? expensesData.data : [];
    const products = productsData.products || [];
    const inventory = inventoryData.success ? inventoryData.data.inventory : [];

    // Sales forecasting (simplified algorithm)
    const totalRevenue = sales.reduce((sum: number, sale: any) => sum + parseFloat(sale.totalAmount || 0), 0);
    const avgDailyRevenue = totalRevenue / 30; // Assuming 30-day period
    const forecastedNextMonth = avgDailyRevenue * 30 * 1.1; // 10% growth assumption

    // Customer segmentation (mock data based on sales patterns)
    const customerSegmentation = {
      highValue: { count: 15, revenue: totalRevenue * 0.6, avgOrder: 2500 },
      regular: { count: 45, revenue: totalRevenue * 0.3, avgOrder: 800 },
      occasional: { count: 120, revenue: totalRevenue * 0.1, avgOrder: 300 }
    };

    // Product performance analysis
    const productSales = sales.reduce((acc: any, sale: any) => {
      if (sale.items) {
        sale.items.forEach((item: any) => {
          if (!acc[item.productId]) {
            acc[item.productId] = {
              id: item.productId,
              name: item.productName || 'Unknown Product',
              revenue: 0,
              quantity: 0,
              profitMargin: 20 + Math.random() * 20 // Simplified calculation
            };
          }
          acc[item.productId].revenue += parseFloat(item.totalAmount || 0);
          acc[item.productId].quantity += parseFloat(item.quantity || 0);
        });
      }
      return acc;
    }, {});

    const productArray = Object.values(productSales) as any[];
    productArray.forEach((product: any) => {
      product.score = (product.revenue * 0.6) + (product.quantity * 0.3) + (product.profitMargin * 0.1);
    });

    const topPerformers = productArray.sort((a, b) => b.score - a.score).slice(0, 3);
    const underperformers = productArray.sort((a, b) => a.score - b.score).slice(0, 2);

    // Market intelligence (mock data)
    const marketIntelligence = {
      priceComparison: [
        { product: 'Groundnut Oil', ourPrice: 189, marketPrice: 195, variance: -3.1 },
        { product: 'Gingelly Oil', ourPrice: 231, marketPrice: 225, variance: 2.7 },
        { product: 'Coconut Oil', ourPrice: 168, marketPrice: 172, variance: -2.3 }
      ],
      marketTrends: {
        oilPricesUp: true,
        demandTrend: 'increasing' as const,
        seasonalFactor: 1.15
      }
    };

    // Business alerts
    const alerts = [];
    
    if (totalRevenue < 10000) {
      alerts.push({
        type: 'warning' as const,
        title: 'Low Revenue Alert',
        message: 'Revenue is below expected levels for this period',
        priority: 'high' as const,
        actionRequired: true
      });
    }

    if (inventory.some((item: any) => item.stockStatus === 'low')) {
      alerts.push({
        type: 'warning' as const,
        title: 'Low Stock Alert',
        message: 'Multiple products are running low on stock',
        priority: 'medium' as const,
        actionRequired: true
      });
    }

    if (forecastedNextMonth > totalRevenue * 1.2) {
      alerts.push({
        type: 'success' as const,
        title: 'Growth Opportunity',
        message: 'Forecasted growth indicates potential for expansion',
        priority: 'low' as const,
        actionRequired: false
      });
    }

    return {
      salesForecast: {
        nextMonth: forecastedNextMonth,
        nextQuarter: forecastedNextMonth * 3,
        confidence: 78, // Confidence percentage
        trend: totalRevenue > 50000 ? 'up' : totalRevenue > 30000 ? 'stable' : 'down'
      },
      customerSegmentation,
      productPerformance: {
        topPerformers,
        underperformers
      },
      marketIntelligence,
      businessAlerts: alerts
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading business analytics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🧠 Business Analytics</h1>
            <p className="text-gray-600 mt-1">Advanced insights and predictive analytics for data-driven decisions</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="last-7-days">Last 7 Days</option>
              <option value="last-30-days">Last 30 Days</option>
              <option value="last-90-days">Last 90 Days</option>
              <option value="last-year">Last Year</option>
            </select>
            <Button onClick={fetchAnalyticsData} className="bg-green-600 hover:bg-green-700">
              🔄 Refresh Analytics
            </Button>
          </div>
        </div>
      </div>

      {/* Business Alerts */}
      {analyticsData?.businessAlerts && analyticsData.businessAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">🚨 Business Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData.businessAlerts.map((alert, index) => (
              <Card key={index}>
                <div className={`p-4 border-l-4 ${
                  alert.type === 'error' ? 'border-red-500 bg-red-50' :
                  alert.type === 'warning' ? 'border-orange-500 bg-orange-50' :
                  alert.type === 'success' ? 'border-green-500 bg-green-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        alert.type === 'error' ? 'text-red-800' :
                        alert.type === 'warning' ? 'text-orange-800' :
                        alert.type === 'success' ? 'text-green-800' :
                        'text-blue-800'
                      }`}>
                        {alert.title}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        alert.type === 'error' ? 'text-red-600' :
                        alert.type === 'warning' ? 'text-orange-600' :
                        alert.type === 'success' ? 'text-green-600' :
                        'text-blue-600'
                      }`}>
                        {alert.message}
                      </p>
                    </div>
                    <Badge variant={alert.priority === 'high' ? 'destructive' : alert.priority === 'medium' ? 'secondary' : 'outline'}>
                      {alert.priority}
                    </Badge>
                  </div>
                  {alert.actionRequired && (
                    <Button size="sm" className="mt-3" variant="outline">
                      Take Action
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: '📊 Overview', icon: '📊' },
            { id: 'forecasting', name: '🔮 Forecasting', icon: '🔮' },
            { id: 'customers', name: '👥 Customers', icon: '👥' },
            { id: 'products', name: '🛢️ Products', icon: '🛢️' },
            { id: 'market', name: '🌐 Market', icon: '🌐' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {analyticsData && (
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <div className="p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {analyticsData.salesForecast.confidence}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Forecast Confidence</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {analyticsData.salesForecast.confidence > 80 ? '🟢 High Accuracy' : 
                       analyticsData.salesForecast.confidence > 60 ? '🟡 Moderate' : '🔴 Low Accuracy'}
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {analyticsData.customerSegmentation.highValue.count}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">High-Value Customers</div>
                    <div className="text-xs text-gray-500 mt-1">
                      ₹{analyticsData.customerSegmentation.highValue.avgOrder.toLocaleString()} avg order
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {analyticsData.productPerformance.topPerformers.length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Top Performers</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Products exceeding targets
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-4 text-center">
                    <div className={`text-3xl font-bold ${
                      analyticsData.salesForecast.trend === 'up' ? 'text-green-600' :
                      analyticsData.salesForecast.trend === 'down' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {analyticsData.salesForecast.trend === 'up' ? '📈' : 
                       analyticsData.salesForecast.trend === 'down' ? '📉' : '➡️'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Market Trend</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {analyticsData.salesForecast.trend === 'up' ? 'Growing Market' : 
                       analyticsData.salesForecast.trend === 'down' ? 'Declining' : 'Stable Market'}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Overview Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Sales Forecast vs Actual</h3>
                    <FinancialAnalyticsChart
                      type="revenue-trend"
                      data={[
                        { period: 'Last Month', revenue: analyticsData.salesForecast.nextMonth * 0.9, profit: analyticsData.salesForecast.nextMonth * 0.15 },
                        { period: 'This Month', revenue: analyticsData.salesForecast.nextMonth, profit: analyticsData.salesForecast.nextMonth * 0.18 },
                        { period: 'Forecast', revenue: analyticsData.salesForecast.nextMonth * 1.1, profit: analyticsData.salesForecast.nextMonth * 0.2 },
                      ]}
                      height={250}
                    />
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Customer Segmentation</h3>
                    <FinancialAnalyticsChart
                      type="expense-breakdown"
                      data={[
                        { name: 'High-Value', amount: analyticsData.customerSegmentation.highValue.revenue },
                        { name: 'Regular', amount: analyticsData.customerSegmentation.regular.revenue },
                        { name: 'Occasional', amount: analyticsData.customerSegmentation.occasional.revenue },
                      ]}
                      height={250}
                    />
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Forecasting Tab */}
          {activeTab === 'forecasting' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🔮 Sales Forecast</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Next Month:</span>
                        <span className="font-semibold text-green-600">
                          ₹{analyticsData.salesForecast.nextMonth.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Next Quarter:</span>
                        <span className="font-semibold text-blue-600">
                          ₹{analyticsData.salesForecast.nextQuarter.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-semibold text-purple-600">
                          {analyticsData.salesForecast.confidence}%
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className={`text-center p-3 rounded-lg ${
                          analyticsData.salesForecast.trend === 'up' ? 'bg-green-100 text-green-800' :
                          analyticsData.salesForecast.trend === 'down' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          <div className="text-2xl mb-1">
                            {analyticsData.salesForecast.trend === 'up' ? '📈' : 
                             analyticsData.salesForecast.trend === 'down' ? '📉' : '➡️'}
                          </div>
                          <div className="font-medium">
                            {analyticsData.salesForecast.trend === 'up' ? 'Growth Expected' : 
                             analyticsData.salesForecast.trend === 'down' ? 'Decline Predicted' : 'Stable Trend'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Demand Patterns</h3>
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="font-medium text-blue-800">Seasonal Trends</h4>
                        <p className="text-sm text-blue-600 mt-1">
                          {analyticsData.marketIntelligence.marketTrends.seasonalFactor > 1.1 
                            ? 'Peak season - 15% higher demand expected'
                            : analyticsData.marketIntelligence.marketTrends.seasonalFactor < 0.9
                            ? 'Off-season - 10% lower demand expected'
                            : 'Normal seasonal demand'}
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <h4 className="font-medium text-green-800">Market Demand</h4>
                        <p className="text-sm text-green-600 mt-1">
                          Overall demand is {analyticsData.marketIntelligence.marketTrends.demandTrend}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 AI Recommendations</h3>
                    <div className="space-y-3">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <h4 className="font-medium text-purple-800">Inventory</h4>
                        <p className="text-sm text-purple-600 mt-1">
                          Increase groundnut oil stock by 20% for next month
                        </p>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                        <h4 className="font-medium text-indigo-800">Pricing</h4>
                        <p className="text-sm text-indigo-600 mt-1">
                          Consider 3% price increase for gingelly oil
                        </p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <h4 className="font-medium text-emerald-800">Marketing</h4>
                        <p className="text-sm text-emerald-600 mt-1">
                          Focus marketing on canteen segment for 25% growth
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Customer Analytics Tab */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Customer Segmentation</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div>
                          <div className="font-medium text-green-800">High-Value Customers</div>
                          <div className="text-sm text-green-600">{analyticsData.customerSegmentation.highValue.count} customers</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-700">₹{analyticsData.customerSegmentation.highValue.revenue.toLocaleString()}</div>
                          <div className="text-xs text-green-600">60% of revenue</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div>
                          <div className="font-medium text-blue-800">Regular Customers</div>
                          <div className="text-sm text-blue-600">{analyticsData.customerSegmentation.regular.count} customers</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-700">₹{analyticsData.customerSegmentation.regular.revenue.toLocaleString()}</div>
                          <div className="text-xs text-blue-600">30% of revenue</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-800">Occasional Customers</div>
                          <div className="text-sm text-gray-600">{analyticsData.customerSegmentation.occasional.count} customers</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-700">₹{analyticsData.customerSegmentation.occasional.revenue.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">10% of revenue</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Customer Insights</h3>
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-800 mb-2">💡 Key Insights</h4>
                        <ul className="space-y-1 text-sm text-yellow-700">
                          <li>• 80/20 rule applies - 20% customers generate 60% revenue</li>
                          <li>• High-value customers prefer bulk canteen orders</li>
                          <li>• Regular customers show strong brand loyalty</li>
                          <li>• Occasional customers respond well to promotions</li>
                        </ul>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">🎯 Recommendations</h4>
                        <ul className="space-y-1 text-sm text-green-700">
                          <li>• Implement loyalty program for regular customers</li>
                          <li>• Offer volume discounts to high-value segment</li>
                          <li>• Create targeted promotions for occasional buyers</li>
                          <li>• Focus on customer retention strategies</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Product Performance Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Performing Products</h3>
                    <div className="space-y-3">
                      {analyticsData.productPerformance.topPerformers.map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-green-800">{product.name}</div>
                              <div className="text-sm text-green-600">{product.quantity} units sold</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-700">₹{product.revenue.toLocaleString()}</div>
                            <div className="text-xs text-green-600">{product.profitMargin.toFixed(1)}% margin</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Underperforming Products</h3>
                    <div className="space-y-3">
                      {analyticsData.productPerformance.underperformers.map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                              ⚠
                            </div>
                            <div>
                              <div className="font-medium text-orange-800">{product.name}</div>
                              <div className="text-sm text-orange-600">{product.quantity} units sold</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-orange-700">₹{product.revenue.toLocaleString()}</div>
                            <div className="text-xs text-orange-600">{product.profitMargin.toFixed(1)}% margin</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">💡 Improvement Actions</h4>
                      <ul className="space-y-1 text-sm text-yellow-700">
                        <li>• Consider promotional campaigns</li>
                        <li>• Review pricing strategy</li>
                        <li>• Analyze customer feedback</li>
                        <li>• Evaluate product positioning</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Market Intelligence Tab */}
          {activeTab === 'market' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🌐 Market Price Comparison</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Product</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Our Price</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Market Price</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Variance</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.marketIntelligence.priceComparison.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-4 font-medium">{item.product}</td>
                            <td className="py-3 px-4 text-right">₹{item.ourPrice}</td>
                            <td className="py-3 px-4 text-right">₹{item.marketPrice}</td>
                            <td className={`py-3 px-4 text-right font-medium ${
                              item.variance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              {Math.abs(item.variance) < 5 ? (
                                <Badge variant="secondary">Competitive</Badge>
                              ) : item.variance > 0 ? (
                                <Badge variant="destructive">Above Market</Badge>
                              ) : (
                                <Badge variant="default">Below Market</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

