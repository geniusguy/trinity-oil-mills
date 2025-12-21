'use client';

import React, { useState } from 'react';
import { Card, Button, Input, LoadingSpinner } from '@/components/ui';

interface PNLData {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRevenue: number;
    totalCost: number;
    profit: number;
    margin: number;
  };
  salesBreakdown: Array<{
    saleId: string;
    saleDate: string;
    revenue: number;
    cost: number;
    profit: number;
  }>;
}

interface ComparisonData {
  period1: PNLData;
  period2: PNLData;
  comparison: {
    revenueChange: number;
    costChange: number;
    profitChange: number;
    marginChange: number;
  };
}

export default function HistoricalPNLPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [compareWith, setCompareWith] = useState('none');
  const [pnlData, setPnlData] = useState<PNLData | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setLoading(true);
    setError('');
    setPnlData(null);
    setComparisonData(null);

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (compareWith === 'previous_period') {
        params.append('compareWith', 'previous_period');
      }

      const response = await fetch(`/api/reports/historical-pnl?${params}`);
      const data = await response.json();

      if (data.success) {
        if (compareWith === 'previous_period') {
          setComparisonData(data.data);
        } else {
          setPnlData(data.data);
        }
        
        // Handle empty data case
        if (data.data && (data.data.isEmpty || data.message)) {
          setError(data.message || data.data.message || 'No data available for the selected period');
        } else {
          setError(''); // Clear any previous errors
        }
      } else {
        setError(data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating PNL report:', error);
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
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

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-4xl">📈</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historical P&L Report</h1>
            <p className="text-gray-600">Profit & Loss analysis with historical pricing accuracy</p>
          </div>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Report Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compare With
              </label>
              <select
                value={compareWith}
                onChange={(e) => setCompareWith(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="none">No Comparison</option>
                <option value="previous_period">Previous Period</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generateReport}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}
        </div>
      </Card>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner text="Generating historical P&L report..." />
        </div>
      )}

      {/* Single Period Report */}
      {pnlData && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              P&L Report: {formatDate(pnlData.period.startDate)} - {formatDate(pnlData.period.endDate)}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800">Total Revenue</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(pnlData.summary.totalRevenue)}
                </p>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800">Total Cost</h3>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(pnlData.summary.totalCost)}
                </p>
              </div>
              
              <div className={`rounded-lg p-4 ${pnlData.summary.profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <h3 className={`text-sm font-medium ${pnlData.summary.profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  Net Profit
                </h3>
                <p className={`text-2xl font-bold ${pnlData.summary.profit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {formatCurrency(pnlData.summary.profit)}
                </p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-800">Profit Margin</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {pnlData.summary.margin.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Sales Breakdown */}
            {pnlData.salesBreakdown.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Sales Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sale Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pnlData.salesBreakdown.map((sale) => (
                        <tr key={sale.saleId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(sale.saleDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                            {formatCurrency(sale.revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                            {formatCurrency(sale.cost)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                            sale.profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(sale.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Comparison Report */}
      {comparisonData && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Period Comparison</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Period 1 */}
              <div>
                <h3 className="text-lg font-medium mb-3">
                  Previous Period: {formatDate(comparisonData.period1.period.startDate)} - {formatDate(comparisonData.period1.period.endDate)}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-semibold">{formatCurrency(comparisonData.period1.summary.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span className="font-semibold">{formatCurrency(comparisonData.period1.summary.totalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profit:</span>
                    <span className="font-semibold">{formatCurrency(comparisonData.period1.summary.profit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margin:</span>
                    <span className="font-semibold">{comparisonData.period1.summary.margin.toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* Period 2 */}
              <div>
                <h3 className="text-lg font-medium mb-3">
                  Current Period: {formatDate(comparisonData.period2.period.startDate)} - {formatDate(comparisonData.period2.period.endDate)}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-semibold">{formatCurrency(comparisonData.period2.summary.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span className="font-semibold">{formatCurrency(comparisonData.period2.summary.totalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profit:</span>
                    <span className="font-semibold">{formatCurrency(comparisonData.period2.summary.profit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margin:</span>
                    <span className="font-semibold">{comparisonData.period2.summary.margin.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Changes */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-3">Changes</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Revenue Change</span>
                  <p className={`text-lg font-semibold ${getChangeColor(comparisonData.comparison.revenueChange)}`}>
                    {formatCurrency(comparisonData.comparison.revenueChange)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Cost Change</span>
                  <p className={`text-lg font-semibold ${getChangeColor(comparisonData.comparison.costChange)}`}>
                    {formatCurrency(comparisonData.comparison.costChange)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Profit Change</span>
                  <p className={`text-lg font-semibold ${getChangeColor(comparisonData.comparison.profitChange)}`}>
                    {formatCurrency(comparisonData.comparison.profitChange)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Margin Change</span>
                  <p className={`text-lg font-semibold ${getChangeColor(comparisonData.comparison.marginChange)}`}>
                    {formatPercentage(comparisonData.comparison.marginChange)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
