"use client";
import React, { useEffect, useState } from 'react';
import { Card, LoadingSpinner } from '@/components/ui';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

interface BookValueData {
  currentBookValue: number;
  totalAssets: number;
  totalLiabilities: number;
  retainedEarnings: number;
  calculationDate: string;
}

const BookValuePage: React.FC = () => {
  const [bookValueData, setBookValueData] = useState<BookValueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookValueData();
  }, []);

  const fetchBookValueData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/book-value');
      const data = await response.json();

      if (data.success) {
        const api = data.data;
        const assetsTotal = Number(api?.assets?.total);
        const assetsCurrent = Number(api?.assets?.current?.totalCurrent ?? 0);
        const assetsFixed = Number(api?.assets?.fixed?.totalFixed ?? 0);
        const safeTotalAssets = Number.isFinite(assetsTotal) ? assetsTotal : (assetsCurrent + assetsFixed);

        const liabilitiesTotal = Number(api?.liabilities?.total);
        const safeTotalLiabilities = Number.isFinite(liabilitiesTotal) ? liabilitiesTotal : Number(api?.liabilities?.current?.totalCurrent ?? 0) + Number(api?.liabilities?.longTerm?.totalLongTerm ?? 0);

        const equityBookValue = Number(api?.equity?.bookValue);
        const safeBookValue = Number.isFinite(equityBookValue) ? equityBookValue : (safeTotalAssets - safeTotalLiabilities);

        const retained = Number(api?.equity?.retainedEarnings);
        const safeRetained = Number.isFinite(retained) ? retained : Number(api?.breakdown?.totalRevenue ?? 0) - Number(api?.breakdown?.totalExpenses ?? 0);

        const mapped: BookValueData = {
          currentBookValue: safeBookValue,
          totalAssets: safeTotalAssets,
          totalLiabilities: safeTotalLiabilities,
          retainedEarnings: safeRetained,
          calculationDate: String(api?.calculationDate ?? new Date().toISOString()),
        };

        setBookValueData(mapped);
      } else {
        setError('Failed to calculate book value');
      }
    } catch (err) {
      console.error('Error fetching book value:', err);
      setError('Failed to calculate book value');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const safe = Number.isFinite(amount) ? amount : 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safe);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Calculating company book value..." />
      </div>
    );
  }

  if (error) {
    const isTableMissing = error.includes("doesn't exist") || error.includes("ER_NO_SUCH_TABLE");
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🏢</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Book Value of Company</h1>
            <p className="text-gray-600">Company net worth calculation</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{isTableMissing ? '🛠️' : '❌'}</span>
            <h3 className="text-lg font-semibold text-red-800">
              {isTableMissing ? 'Database Setup Required' : 'Error Calculating Book Value'}
            </h3>
          </div>
          
          <div className="text-red-700 mb-4">{error}</div>
          
          <div className="space-y-3">
            {isTableMissing ? (
              <div className="space-y-3">
                <p className="text-red-600">
                  The savings_investments table is required for accurate book value calculations.
                </p>
                <div className="flex gap-3">
                  <a
                    href="/dashboard/admin/setup/database"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium inline-flex items-center gap-2"
                  >
                    <span>🛠️</span>
                    Setup Database
                  </a>
                  <button
                    onClick={fetchBookValueData}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
                  >
                    🔄 Retry
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={fetchBookValueData}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
              >
                🔄 Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!bookValueData) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
        <p className="text-gray-500">Unable to calculate book value at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-4xl">🏢</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Book Value of Company</h1>
          <p className="text-gray-600">Company net worth calculation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Book Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(bookValueData.currentBookValue)}
                </p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Assets</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(bookValueData.totalAssets)}
                </p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Liabilities</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(bookValueData.totalLiabilities)}
                </p>
              </div>
              <div className="text-3xl">💳</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retained Earnings</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(bookValueData.retainedEarnings)}
                </p>
              </div>
              <div className="text-3xl">💼</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Financial Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl mb-2">📈</div>
            <h3 className="font-semibold text-green-800">Net Worth</h3>
            <p className="text-2xl font-bold text-green-600 my-2">
              {formatCurrency(bookValueData.currentBookValue)}
            </p>
            <p className="text-sm text-green-700">Total company value</p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl mb-2">💪</div>
            <h3 className="font-semibold text-blue-800">Asset Ratio</h3>
            <p className="text-2xl font-bold text-blue-600 my-2">
              {bookValueData.totalAssets > 0 
                ? ((bookValueData.currentBookValue / bookValueData.totalAssets) * 100).toFixed(1)
                : 0}%
            </p>
            <p className="text-sm text-blue-700">Equity to assets ratio</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-semibold text-purple-800">Financial Health</h3>
            <p className="text-2xl font-bold text-purple-600 my-2">
              {bookValueData.currentBookValue > 0 ? 'Strong' : 'Review'}
            </p>
            <p className="text-sm text-purple-700">Based on book value</p>
          </div>
        </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Calculation Details</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-700">Total Assets</span>
            <span className="font-bold text-blue-600">{formatCurrency(bookValueData.totalAssets)}</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-700">Total Liabilities</span>
            <span className="font-bold text-red-600">{formatCurrency(bookValueData.totalLiabilities)}</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
            <span className="font-bold text-gray-800">Book Value (Assets - Liabilities)</span>
            <span className="font-bold text-green-600">{formatCurrency(bookValueData.currentBookValue)}</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-700">Retained Earnings</span>
            <span className="font-bold text-purple-600">{formatCurrency(bookValueData.retainedEarnings)}</span>
          </div>
        </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Important Notes</h2>
        
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            • <strong>Book Value</strong> represents the company's net worth based on recorded assets and liabilities.
          </p>
          <p>
            • <strong>Assets</strong> include current assets (cash, inventory) and fixed assets (investments, equipment).
          </p>
          <p>
            • <strong>Liabilities</strong> include current liabilities (accounts payable) and long-term liabilities (loans).
          </p>
          <p>
            • <strong>Retained Earnings</strong> represent accumulated profits from business operations.
          </p>
          <p>
            • <strong>Calculation Date:</strong> {new Date(bookValueData.calculationDate).toLocaleDateString('en-IN')}
          </p>
        </div>
        </div>
      </Card>
    </div>
  );
};

export default BookValuePage;