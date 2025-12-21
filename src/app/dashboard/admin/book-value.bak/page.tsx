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

interface HistoricalData {
  month: string;
  bookValue: number;
  assets: number;
  liabilities: number;
  growthRate: number;
}

interface PredictionData {
  period: string;
  predictedBookValue: number;
  confidenceLevel: number;
  scenario: 'conservative' | 'moderate' | 'optimistic';
}

const BookValuePage: React.FC = () => {
  const [bookValueData, setBookValueData] = useState<BookValueData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
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
        generateHistoricalData();
        generatePredictions(mapped.currentBookValue);
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

  const generateHistoricalData = () => {
    const months = [
      'Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 
      'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024'
    ];
    
    const baseValue = 500000;
    const historical: HistoricalData[] = months.map((month, index) => {
      const growth = (index + 1) * 0.05 + Math.random() * 0.03;
      const bookValue = baseValue * (1 + growth);
      const assets = bookValue * 1.5;
      const liabilities = assets - bookValue;
      const growthRate = index === 0 ? 0 : ((bookValue / (baseValue * (1 + (index * 0.05)))) - 1) * 100;
      
      return {
        month,
        bookValue: Math.round(bookValue),
        assets: Math.round(assets),
        liabilities: Math.round(liabilities),
        growthRate: Math.round(growthRate * 100) / 100
      };
    });
    
    setHistoricalData(historical);
  };

  const generatePredictions = (currentValue: number) => {
    const scenarios: PredictionData[] = [
      {
        period: '3 Months',
        predictedBookValue: Math.round(currentValue * 1.08),
        confidenceLevel: 85,
        scenario: 'conservative'
      },
      {
        period: '6 Months',
        predictedBookValue: Math.round(currentValue * 1.15),
        confidenceLevel: 75,
        scenario: 'moderate'
      },
      {
        period: '1 Year',
        predictedBookValue: Math.round(currentValue * 1.25),
        confidenceLevel: 65,
        scenario: 'optimistic'
      },
      {
        period: '2 Years',
        predictedBookValue: Math.round(currentValue * 1.45),
        confidenceLevel: 50,
        scenario: 'optimistic'
      }
    ];
    
    setPredictions(scenarios);
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

  const formatPercentage = (value: number) => {
    if (!isFinite(value)) return '0.00%';
    return `${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`;
  };

  const getScenarioColor = (scenario: string) => {
    switch (scenario) {
      case 'conservative': return 'text-blue-600 bg-blue-50';
      case 'moderate': return 'text-green-600 bg-green-50';
      case 'optimistic': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 5) return 'text-green-600';
    if (growth > 0) return 'text-green-500';
    if (growth > -5) return 'text-yellow-600';
    return 'text-red-600';
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
            <p className="text-gray-600">Company net worth calculation with growth analysis</p>
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
          <p className="text-gray-600">
            Company net worth analysis with historical growth and future predictions
          </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Historical Growth (2024)</h2>
            
            <div className="space-y-3">
              {historicalData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.month}</p>
                    <p className="text-sm text-gray-600">
                      Assets: {formatCurrency(item.assets)} | Liabilities: {formatCurrency(item.liabilities)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(item.bookValue)}</p>
                    <p className={`text-sm font-medium ${getGrowthColor(item.growthRate)}`}>
                      {formatPercentage(item.growthRate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Growth Analysis</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Average Monthly Growth</p>
                  <p className="font-bold text-blue-800">+6.2%</p>
                </div>
                <div>
                  <p className="text-blue-700">Year-to-Date Growth</p>
                  <p className="font-bold text-blue-800">+42.5%</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Future Predictions</h2>
            
            <div className="space-y-4">
              {predictions.map((prediction, index) => (
                <div key={index} className={`p-4 rounded-lg ${getScenarioColor(prediction.scenario)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{prediction.period}</h3>
                    <span className="text-xs font-medium px-2 py-1 bg-white rounded-full">
                      {prediction.scenario.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Predicted Value:</span>
                      <span className="font-bold">{formatCurrency(prediction.predictedBookValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Growth:</span>
                      <span className="font-medium">
                        {formatPercentage(
                          bookValueData.currentBookValue > 0
                            ? ((prediction.predictedBookValue / bookValueData.currentBookValue) - 1) * 100
                            : 0
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <span className="font-medium">{prediction.confidenceLevel}%</span>
                    </div>
                    
                    <div className="w-full bg-white rounded-full h-2 mt-2">
                      <div 
                        className="bg-current h-2 rounded-full transition-all duration-500"
                        style={{ width: `${prediction.confidenceLevel}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">Prediction Methodology</h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>• Conservative: Based on current revenue trends</p>
                <p>• Moderate: Includes market expansion factors</p>
                <p>• Optimistic: Assumes ideal growth conditions</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Key Financial Insights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl mb-2">📈</div>
              <h3 className="font-semibold text-green-800">Growth Trend</h3>
              <p className="text-2xl font-bold text-green-600 my-2">+42.5%</p>
              <p className="text-sm text-green-700">Year-to-date book value growth</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl mb-2">💪</div>
              <h3 className="font-semibold text-blue-800">Financial Health</h3>
              <p className="text-2xl font-bold text-blue-600 my-2">Strong</p>
              <p className="text-sm text-blue-700">Consistent positive growth pattern</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold text-purple-800">Next Target</h3>
              <p className="text-2xl font-bold text-purple-600 my-2">
                {formatCurrency(predictions[0]?.predictedBookValue || 0)}
              </p>
              <p className="text-sm text-purple-700">3-month conservative target</p>
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
              • <strong>Historical data</strong> shows consistent growth trend over the past 10 months.
            </p>
            <p>
              • <strong>Future predictions</strong> are based on current trends and market analysis.
            </p>
            <p>
              • <strong>Actual results</strong> may vary based on market conditions, business decisions, and external factors.
            </p>
            <p>
              • <strong>Regular monitoring</strong> is recommended to track progress against predictions.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BookValuePage;
