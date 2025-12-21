'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { RevenueChart, ProductSalesChart, SalesDistributionChart } from '@/components/charts';

interface ReportData {
  sales: any[];
  inventory: any[];
  financial: any;
}

const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData>({
    sales: [],
    inventory: [],
    financial: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [salesRes, inventoryRes, financialRes] = await Promise.all([
        fetch(`/api/reports/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
        fetch('/api/reports/inventory'),
        fetch(`/api/reports/financial?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
      ]);

      const salesData = await salesRes.json();
      const inventoryData = await inventoryRes.json();
      const financialData = await financialRes.json();

      setReportData({
        sales: salesData.success ? salesData.data.sales : [],
        inventory: inventoryData.success ? inventoryData.data.inventory : [],
        financial: financialData.success ? financialData.data : {}
      });

    } catch (err) {
      setError('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type: string) => {
    try {
      const response = await fetch(`/api/reports/${type}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&format=pdf`);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${type}-report.pdf`;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading reports..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <Button onClick={fetchReportData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
            <p className="text-2xl font-bold text-blue-600">{(reportData.sales || []).length}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <p className="text-2xl font-bold text-green-600">
              ₹{(reportData.sales || []).reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0).toLocaleString()}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Low Stock Items</h3>
            <p className="text-2xl font-bold text-red-600">{(reportData.inventory || []).length}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-500">Export Options</h3>
              <div className="flex gap-1 mt-2">
                <Button size="sm" onClick={() => exportReport('sales')}>Sales PDF</Button>
                <Button size="sm" onClick={() => exportReport('financial')}>Financial PDF</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Revenue Trend</h2>
            <RevenueChart data={reportData.sales} />
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Product Sales</h2>
            <ProductSalesChart data={reportData.sales} />
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Sales Distribution</h2>
          <SalesDistributionChart data={reportData.sales} />
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;



