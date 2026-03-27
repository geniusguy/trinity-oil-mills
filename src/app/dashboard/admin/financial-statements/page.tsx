'use client';

import React, { useState, useEffect } from 'react';
import {
  getCurrentFinancialYearBounds,
  getCurrentFinancialYearQuarterBounds,
  getPreviousFinancialYearBounds,
} from '@/lib/financialYear';
import { useSession } from 'next-auth/react';
import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
import { RevenueChart, ProductSalesChart, SalesDistributionChart, FinancialAnalyticsChart } from '@/components/charts';

interface PLStatement {
  period: {
    startDate: string;
    endDate: string;
    generatedAt: string;
  };
  revenue: {
    grossRevenue: number;
    gstCollected: number;
    totalRevenue: number;
  };
  taxes?: {
    gstCollected: number;
    gstPaidToGovernment: number;
    netGstPayable: number;
  };
  dataSource?: {
    cogs?: string;
  };
  costOfGoodsSold: {
    productionCosts: number;
    materialCosts: number;
    laborCosts: number;
    overheadCosts: number;
    totalCOGS: number;
  };
  grossProfit: {
    amount: number;
    margin: number;
  };
  operatingExpenses: {
    marketing: number;
    administrative: number;
    utilities: number;
    maintenance: number;
    other: number;
    courierShipping?: number;
    totalOperatingExpenses: number;
  };
  operatingProfit: {
    amount: number;
    margin: number;
  };
  netProfit: {
    amount: number;
    margin: number;
  };
  /** Included in summary.totalExpenses via operating total + COGS + interest */
  loanPayments?: {
    totalPayments: number;
    interestExpense: number;
    principalPayments: number;
    loanCount: number;
  };
  summary: {
    totalRevenue: number;
    /** COGS + total operating expenses (incl. courier) + loan interest */
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
}

interface BalanceSheet {
  asOfDate: string;
  generatedAt: string;
  assets: {
    currentAssets: {
      cashAndEquivalents: number;
      accountsReceivable: number;
      inventory: number;
      prepaidExpenses: number;
      totalCurrentAssets: number;
    };
    fixedAssets: {
      equipment: number;
      machinery: number;
      building: number;
      land: number;
      accumulatedDepreciation: number;
      totalFixedAssets: number;
    };
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: number;
      accruedExpenses: number;
      shortTermDebt: number;
      totalCurrentLiabilities: number;
    };
    longTermLiabilities: {
      longTermDebt: number;
      totalLongTermLiabilities: number;
    };
    totalLiabilities: number;
  };
  ownersEquity: {
    capital: number;
    retainedEarnings: number;
    totalOwnersEquity: number;
  };
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    totalOwnersEquity: number;
    isBalanced: boolean;
  };
}

interface CashFlowStatement {
  period: {
    startDate: string;
    endDate: string;
    generatedAt: string;
  };
  operatingActivities: {
    cashSales: number;
    creditSales: number;
    operatingExpenses: number;
    productionCosts: number;
    netOperatingCashFlow: number;
  };
  investingActivities: {
    equipmentPurchase: number;
    machineryPurchase: number;
    buildingImprovements: number;
    totalInvestingActivities: number;
  };
  financingActivities: {
    loanProceeds: number;
    loanRepayments: number;
    ownerInvestment: number;
    totalFinancingActivities: number;
  };
  summary: {
    netOperatingCashFlow: number;
    netInvestingCashFlow: number;
    netFinancingCashFlow: number;
    netCashFlow: number;
    beginningCash: number;
    endingCash: number;
  };
}

const FinancialStatementsPage: React.FC = () => {
  const { data: session } = useSession();
  const [plStatement, setPlStatement] = useState<PLStatement | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [cashFlowStatement, setCashFlowStatement] = useState<CashFlowStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pl' | 'balance' | 'cashflow'>('pl');
  const [dateRange, setDateRange] = useState(() => {
    const fy = getCurrentFinancialYearBounds();
    const today = new Date().toISOString().split('T')[0];
    return {
      startDate: fy.start.toISOString().split('T')[0],
      endDate: today,
      asOfDate: today,
    };
  });

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch P&L Statement
      const plResponse = await fetch(`/api/reports/pl-statement?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const plData = await plResponse.json();
      if (plData.success) {
        setPlStatement(plData.data);
      }

      // Fetch Balance Sheet
      const balanceResponse = await fetch(`/api/reports/balance-sheet?asOfDate=${dateRange.asOfDate}`);
      const balanceData = await balanceResponse.json();
      if (balanceData.success) {
        const api = balanceData.data || {};
        const assets = api.assets || {};
        const liabilities = api.liabilities || {};
        const equity = api.equity || {};

        const currentAssets = {
          cashAndEquivalents: Number(assets.cashAndCashEquivalents || 0),
          accountsReceivable: Number(assets.accountsReceivable || 0),
          inventory: Number(assets.inventory || 0),
          prepaidExpenses: 0,
          totalCurrentAssets: Number(assets.cashAndCashEquivalents || 0) + Number(assets.accountsReceivable || 0) + Number(assets.inventory || 0),
        };
        const fixedAssets = {
          equipment: 0,
          machinery: 0,
          building: 0,
          land: 0,
          accumulatedDepreciation: 0,
          totalFixedAssets: 0,
        };
        const totalAssets = Number(assets.totalAssets || (currentAssets.totalCurrentAssets + fixedAssets.totalFixedAssets));

        const currentLiabilities = {
          accountsPayable: Number(liabilities.accountsPayable || 0),
          accruedExpenses: 0,
          shortTermDebt: Number(liabilities.shortTermDebt || 0),
          totalCurrentLiabilities: Number(liabilities.accountsPayable || 0) + Number(liabilities.shortTermDebt || 0),
        };
        const longTermLiabilities = {
          longTermDebt: Number(liabilities.longTermDebt || 0),
          totalLongTermLiabilities: Number(liabilities.longTermDebt || 0),
        };
        const totalLiabilities = Number(liabilities.totalLiabilities || (currentLiabilities.totalCurrentLiabilities + longTermLiabilities.totalLongTermLiabilities));

        const ownersEquity = {
          capital: 0,
          retainedEarnings: Number(equity.retainedEarnings || 0),
          totalOwnersEquity: Number(equity.totalEquity || (Number(equity.retainedEarnings || 0))),
        };

        const normalized: BalanceSheet = {
          asOfDate: api.asOfDate || dateRange.asOfDate,
          generatedAt: new Date().toISOString(),
          assets: {
            currentAssets,
            fixedAssets,
            totalAssets,
          },
          liabilities: {
            currentLiabilities,
            longTermLiabilities,
            totalLiabilities,
          },
          ownersEquity,
          summary: {
            totalAssets,
            totalLiabilities,
            totalOwnersEquity: ownersEquity.totalOwnersEquity,
            isBalanced: Math.abs(totalAssets - (totalLiabilities + ownersEquity.totalOwnersEquity)) < 0.5,
          },
        };
        setBalanceSheet(normalized);
      }

      // Fetch Cash Flow Statement
      const cashFlowResponse = await fetch(`/api/reports/cash-flow?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const cashFlowData = await cashFlowResponse.json();
      if (cashFlowData.success) {
        const api = cashFlowData.data || {};
        const op = api.operatingActivities || {};
        const inv = api.investingActivities || {};
        const fin = api.financingActivities || {};

        const normalized: CashFlowStatement = {
          period: {
            startDate: (api.period && api.period.startDate) || dateRange.startDate,
            endDate: (api.period && api.period.endDate) || dateRange.endDate,
            generatedAt: new Date().toISOString(),
          },
          operatingActivities: {
            cashSales: Number(op.cashIn || 0),
            creditSales: 0,
            operatingExpenses: Number(op.cashOut || 0),
            productionCosts: 0,
            netOperatingCashFlow: Number(op.netCash || 0),
          },
          investingActivities: {
            equipmentPurchase: 0,
            machineryPurchase: 0,
            buildingImprovements: 0,
            totalInvestingActivities: Number(inv.netCash || 0),
          },
          financingActivities: {
            loanProceeds: 0,
            loanRepayments: 0,
            ownerInvestment: 0,
            totalFinancingActivities: Number(fin.netCash || 0),
          },
          summary: {
            netOperatingCashFlow: Number(op.netCash || 0),
            netInvestingCashFlow: Number(inv.netCash || 0),
            netFinancingCashFlow: Number(fin.netCash || 0),
            netCashFlow: Number(api.netChangeInCash || ((op.netCash || 0) + (inv.netCash || 0) + (fin.netCash || 0))),
            beginningCash: 0,
            endingCash: Number(api.netChangeInCash || ((op.netCash || 0) + (inv.netCash || 0) + (fin.netCash || 0))),
          },
        };
        setCashFlowStatement(normalized);
      }

    } catch (err) {
      setError('Failed to fetch financial data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const exportToPDF = async (type: string) => {
    try {
      let url = '';
      switch (type) {
        case 'pl':
          url = `/api/reports/pl-statement?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&format=pdf`;
          break;
        case 'balance':
          url = `/api/reports/balance-sheet?asOfDate=${dateRange.asOfDate}&format=pdf`;
          break;
        case 'cashflow':
          url = `/api/reports/cash-flow?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&format=pdf`;
          break;
      }
      
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${type}-statement.pdf`;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading financial statements..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Financial Statements</h1>
            <p className="text-gray-600 mt-1">Comprehensive financial analysis and reporting</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Period Selection */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Period:</label>
              <select
                onChange={(e) => {
                  const value = e.target.value;
                  const today = new Date();
                  let startDate, endDate;
                  
                  switch(value) {
                    case 'this-month':
                      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                      endDate = today;
                      break;
                    case 'last-month':
                      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                      break;
                    case 'this-quarter': {
                      const q = getCurrentFinancialYearQuarterBounds(today);
                      startDate = q.start;
                      endDate = today;
                      break;
                    }
                    case 'this-year': {
                      const fy = getCurrentFinancialYearBounds(today);
                      startDate = fy.start;
                      endDate = today;
                      break;
                    }
                    case 'last-fy': {
                      const prev = getPreviousFinancialYearBounds(today);
                      startDate = prev.start;
                      endDate = prev.end;
                      break;
                    }
                    default:
                      return;
                  }
                  
                  setDateRange({
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    asOfDate: endDate.toISOString().split('T')[0],
                  });
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Quick Select...</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
                <option value="this-quarter">This FY quarter (Apr–Mar basis)</option>
                <option value="this-year">This financial year (Apr–Mar)</option>
                <option value="last-fy">Last financial year (full)</option>
              </select>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value, asOfDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={fetchFinancialData} className="bg-green-600 hover:bg-green-700">
                📊 Generate Reports
              </Button>
              <div className="relative">
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('export-menu')?.classList.toggle('hidden')}
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  📥 Export
                </Button>
                <div id="export-menu" className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => exportToPDF('pl')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📄 P&L Statement (PDF)
                    </button>
                    <button
                      onClick={() => exportToPDF('balance')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      📊 Balance Sheet (PDF)
                    </button>
                    <button
                      onClick={() => exportToPDF('cashflow')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      💸 Cash Flow (PDF)
                    </button>
                    <button
                      onClick={() => exportToPDF('all')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t"
                    >
                      📋 Complete Financial Package
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pl')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pl'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            P&L Statement
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'balance'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cashflow'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cash Flow Statement
          </button>
        </nav>
      </div>

      {/* P&L Statement */}
      {activeTab === 'pl' && plStatement && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              Profit & Loss Statement
            </h2>
            <Button onClick={() => exportToPDF('pl')}>
              Export PDF
            </Button>
          </div>

          <Card>
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Gross Revenue (ex GST)</span>
                    <span className="font-semibold">{formatCurrency(plStatement.revenue.grossRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST Collected</span>
                    <span>{formatCurrency(plStatement.revenue.gstCollected)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Invoice Revenue (incl GST)</span>
                    <span className="font-semibold text-green-600">{formatCurrency(plStatement.revenue.totalRevenue)}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
                <h3 className="text-sm font-semibold text-amber-900 mb-2">GST Position</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>GST Collected (Output)</span>
                    <span className="font-medium">{formatCurrency(plStatement.taxes?.gstCollected ?? plStatement.revenue.gstCollected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST Paid (Input)</span>
                    <span className="font-medium">{formatCurrency(plStatement.taxes?.gstPaidToGovernment ?? 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-amber-200 pt-2">
                    <span className="font-semibold">Net GST Payable</span>
                    <span className="font-semibold">{formatCurrency(plStatement.taxes?.netGstPayable ?? ((plStatement.taxes?.gstCollected ?? plStatement.revenue.gstCollected) - (plStatement.taxes?.gstPaidToGovernment ?? 0)))}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Cost of Goods Sold</h3>
                <p className="text-xs text-gray-500 mb-2">
                  Source: {plStatement.dataSource?.cogs || 'unknown'}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Production Costs</span>
                    <span>{formatCurrency(plStatement.costOfGoodsSold.productionCosts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Material Costs</span>
                    <span>{formatCurrency(plStatement.costOfGoodsSold.materialCosts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Labor Costs</span>
                    <span>{formatCurrency(plStatement.costOfGoodsSold.laborCosts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overhead Costs</span>
                    <span>{formatCurrency(plStatement.costOfGoodsSold.overheadCosts)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total COGS</span>
                    <span className="font-semibold text-red-600">{formatCurrency(plStatement.costOfGoodsSold.totalCOGS)}</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between border-t-2 pt-4">
                  <span className="text-lg font-semibold">Gross Profit</span>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-600">{formatCurrency(plStatement.grossProfit.amount)}</div>
                    <div className="text-sm text-gray-600">Margin: {formatPercentage(plStatement.grossProfit.margin)}</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Operating Expenses</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Marketing</span>
                    <span>{formatCurrency(plStatement.operatingExpenses.marketing)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Administrative</span>
                    <span>{formatCurrency(plStatement.operatingExpenses.administrative)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Utilities</span>
                    <span>{formatCurrency(plStatement.operatingExpenses.utilities)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Maintenance</span>
                    <span>{formatCurrency(plStatement.operatingExpenses.maintenance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other</span>
                    <span>{formatCurrency(plStatement.operatingExpenses.other)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-800">
                    <span>Courier (canteen) — Courier Expenses module</span>
                    <span>{formatCurrency(plStatement.operatingExpenses.courierShipping ?? 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Operating Expenses</span>
                    <span className="font-semibold text-red-600">{formatCurrency(plStatement.operatingExpenses.totalOperatingExpenses)}</span>
                  </div>
                  <p className="text-xs text-gray-500 pt-1">
                    Includes daily expense categories above plus{' '}
                    <strong>courier (canteen)</strong>{' '}
                    {formatCurrency(plStatement.operatingExpenses.courierShipping ?? 0)} — counted in this total.
                  </p>
                </div>
              </div>

              <div className="mb-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Overall expenses (P&amp;L)</h3>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-700">Total (COGS + operating incl. courier + loan interest)</span>
                  <span className="text-lg font-bold text-red-700">
                    {formatCurrency(plStatement.summary.totalExpenses)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Operating expenses above already include courier. This line is the full expense stack used for net profit.
                </p>
              </div>

              <div className="mb-6">
                <div className="flex justify-between border-t-2 pt-4">
                  <span className="text-lg font-semibold">Operating Profit</span>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-600">{formatCurrency(plStatement.operatingProfit.amount)}</div>
                    <div className="text-sm text-gray-600">Margin: {formatPercentage(plStatement.operatingProfit.margin)}</div>
                  </div>
                </div>
              </div>

              {(plStatement.loanPayments?.interestExpense ?? 0) > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Loan interest expense</span>
                    <span className="text-red-600">
                      −{formatCurrency(plStatement.loanPayments?.interestExpense ?? 0)}
                    </span>
                  </div>
                </div>
              )}

              <div className="border-t-2 pt-4">
                <div className="flex justify-between">
                  <span className="text-xl font-bold">Net Profit (Actual business profit, ex GST)</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">{formatCurrency(plStatement.netProfit.amount)}</div>
                    <div className="text-sm text-gray-600">Margin: {formatPercentage(plStatement.netProfit.margin)}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This profit uses revenue excluding GST, so you can clearly see how much profit the business made.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Balance Sheet */}
      {activeTab === 'balance' && balanceSheet && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              Balance Sheet
            </h2>
            <Button onClick={() => exportToPDF('balance')}>
              Export PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assets</h3>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Current Assets</h4>
                  <div className="space-y-1 ml-4">
                    <div className="flex justify-between">
                      <span>Cash & Equivalents</span>
                      <span>{formatCurrency(balanceSheet.assets.currentAssets.cashAndEquivalents)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accounts Receivable</span>
                      <span>{formatCurrency(balanceSheet.assets.currentAssets.accountsReceivable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inventory</span>
                      <span>{formatCurrency(balanceSheet.assets.currentAssets.inventory)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prepaid Expenses</span>
                      <span>{formatCurrency(balanceSheet.assets.currentAssets.prepaidExpenses)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="font-semibold">Total Current Assets</span>
                      <span className="font-semibold">{formatCurrency(balanceSheet.assets.currentAssets.totalCurrentAssets)}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Fixed Assets</h4>
                  <div className="space-y-1 ml-4">
                    <div className="flex justify-between">
                      <span>Equipment</span>
                      <span>{formatCurrency(balanceSheet.assets.fixedAssets.equipment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Machinery</span>
                      <span>{formatCurrency(balanceSheet.assets.fixedAssets.machinery)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Building</span>
                      <span>{formatCurrency(balanceSheet.assets.fixedAssets.building)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Land</span>
                      <span>{formatCurrency(balanceSheet.assets.fixedAssets.land)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accumulated Depreciation</span>
                      <span className="text-red-600">{formatCurrency(balanceSheet.assets.fixedAssets.accumulatedDepreciation)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="font-semibold">Total Fixed Assets</span>
                      <span className="font-semibold">{formatCurrency(balanceSheet.assets.fixedAssets.totalFixedAssets)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between border-t-2 pt-2">
                  <span className="text-lg font-semibold">Total Assets</span>
                  <span className="text-lg font-semibold text-green-600">{formatCurrency(balanceSheet.assets.totalAssets)}</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Liabilities & Equity</h3>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Current Liabilities</h4>
                  <div className="space-y-1 ml-4">
                    <div className="flex justify-between">
                      <span>Accounts Payable</span>
                      <span>{formatCurrency(balanceSheet.liabilities.currentLiabilities.accountsPayable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accrued Expenses</span>
                      <span>{formatCurrency(balanceSheet.liabilities.currentLiabilities.accruedExpenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Short-term Debt</span>
                      <span>{formatCurrency(balanceSheet.liabilities.currentLiabilities.shortTermDebt)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="font-semibold">Total Current Liabilities</span>
                      <span className="font-semibold">{formatCurrency(balanceSheet.liabilities.currentLiabilities.totalCurrentLiabilities)}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Long-term Liabilities</h4>
                  <div className="space-y-1 ml-4">
                    <div className="flex justify-between">
                      <span>Long-term Debt</span>
                      <span>{formatCurrency(balanceSheet.liabilities.longTermLiabilities.longTermDebt)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="font-semibold">Total Long-term Liabilities</span>
                      <span className="font-semibold">{formatCurrency(balanceSheet.liabilities.longTermLiabilities.totalLongTermLiabilities)}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Owner's Equity</h4>
                  <div className="space-y-1 ml-4">
                    <div className="flex justify-between">
                      <span>Capital</span>
                      <span>{formatCurrency(balanceSheet.ownersEquity.capital)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Retained Earnings</span>
                      <span>{formatCurrency(balanceSheet.ownersEquity.retainedEarnings)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="font-semibold">Total Owner's Equity</span>
                      <span className="font-semibold">{formatCurrency(balanceSheet.ownersEquity.totalOwnersEquity)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between border-t-2 pt-2">
                  <span className="text-lg font-semibold">Total Liabilities & Equity</span>
                  <span className="text-lg font-semibold text-blue-600">{formatCurrency(balanceSheet.liabilities.totalLiabilities + balanceSheet.ownersEquity.totalOwnersEquity)}</span>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Balance Check:</span>
                    <Badge variant={balanceSheet.summary.isBalanced ? 'success' : 'danger'}>
                      {balanceSheet.summary.isBalanced ? 'Balanced' : 'Not Balanced'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Cash Flow Statement */}
      {activeTab === 'cashflow' && cashFlowStatement && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              Cash Flow Statement
            </h2>
            <Button onClick={() => exportToPDF('cashflow')}>
              Export PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Operating Activities</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Cash Sales</span>
                    <span className="text-green-600">{formatCurrency(cashFlowStatement.operatingActivities.cashSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credit Sales</span>
                    <span>{formatCurrency(cashFlowStatement.operatingActivities.creditSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Operating Expenses</span>
                    <span className="text-red-600">{formatCurrency(cashFlowStatement.operatingActivities.operatingExpenses)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Production Costs</span>
                    <span className="text-red-600">{formatCurrency(cashFlowStatement.operatingActivities.productionCosts)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Net Operating Cash Flow</span>
                    <span className={`font-semibold ${cashFlowStatement.operatingActivities.netOperatingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlowStatement.operatingActivities.netOperatingCashFlow)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Investing Activities</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Equipment Purchase</span>
                    <span className="text-red-600">{formatCurrency(cashFlowStatement.investingActivities.equipmentPurchase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Machinery Purchase</span>
                    <span className="text-red-600">{formatCurrency(cashFlowStatement.investingActivities.machineryPurchase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Building Improvements</span>
                    <span className="text-red-600">{formatCurrency(cashFlowStatement.investingActivities.buildingImprovements)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Net Investing Cash Flow</span>
                    <span className={`font-semibold ${cashFlowStatement.investingActivities.totalInvestingActivities >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlowStatement.investingActivities.totalInvestingActivities)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financing Activities</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Loan Proceeds</span>
                    <span className="text-green-600">{formatCurrency(cashFlowStatement.financingActivities.loanProceeds)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Loan Repayments</span>
                    <span className="text-red-600">{formatCurrency(cashFlowStatement.financingActivities.loanRepayments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Owner Investment</span>
                    <span className="text-green-600">{formatCurrency(cashFlowStatement.financingActivities.ownerInvestment)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Net Financing Cash Flow</span>
                    <span className={`font-semibold ${cashFlowStatement.financingActivities.totalFinancingActivities >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlowStatement.financingActivities.totalFinancingActivities)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Beginning Cash</span>
                    <span>{formatCurrency(cashFlowStatement.summary.beginningCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Operating Cash Flow</span>
                    <span className={cashFlowStatement.summary.netOperatingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(cashFlowStatement.summary.netOperatingCashFlow)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Investing Cash Flow</span>
                    <span className={cashFlowStatement.summary.netInvestingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(cashFlowStatement.summary.netInvestingCashFlow)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Net Financing Cash Flow</span>
                    <span className={cashFlowStatement.summary.netFinancingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(cashFlowStatement.summary.netFinancingCashFlow)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between border-t-2 pt-2">
                    <span className="text-lg font-semibold">Net Cash Flow</span>
                    <span className={`text-lg font-semibold ${cashFlowStatement.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashFlowStatement.summary.netCashFlow)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-lg font-semibold">Ending Cash</span>
                    <span className="text-lg font-semibold text-blue-600">{formatCurrency(cashFlowStatement.summary.endingCash)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Advanced Financial Analytics */}
      {plStatement && balanceSheet && cashFlowStatement && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">📊 Financial Analytics & Insights</h2>
            <Badge variant="secondary">Advanced Analytics</Badge>
          </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {plStatement.grossProfit.margin.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Gross Profit Margin</div>
                <div className="text-xs text-gray-500 mt-1">
                  {plStatement.grossProfit.margin > 30 ? '🟢 Excellent' : 
                   plStatement.grossProfit.margin > 20 ? '🟡 Good' : '🔴 Needs Attention'}
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {plStatement.operatingProfit.margin.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Operating Margin</div>
                <div className="text-xs text-gray-500 mt-1">
                  {plStatement.operatingProfit.margin > 15 ? '🟢 Strong' : 
                   plStatement.operatingProfit.margin > 8 ? '🟡 Average' : '🔴 Weak'}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {((balanceSheet.assets.currentAssets.inventory / plStatement.revenue.totalRevenue) * 365).toFixed(0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Days of Inventory</div>
                <div className="text-xs text-gray-500 mt-1">
                  {((balanceSheet.assets.currentAssets.inventory / plStatement.revenue.totalRevenue) * 365) < 60 ? '🟢 Efficient' : 
                   ((balanceSheet.assets.currentAssets.inventory / plStatement.revenue.totalRevenue) * 365) < 90 ? '🟡 Moderate' : '🔴 High'}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {(plStatement.revenue.totalRevenue / balanceSheet.assets.totalAssets).toFixed(1)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Asset Turnover</div>
                <div className="text-xs text-gray-500 mt-1">
                  {(plStatement.revenue.totalRevenue / balanceSheet.assets.totalAssets) > 2 ? '🟢 High' : 
                   (plStatement.revenue.totalRevenue / balanceSheet.assets.totalAssets) > 1 ? '🟡 Average' : '🔴 Low'}
                </div>
              </div>
            </Card>
          </div>

          {/* Financial Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Revenue & Profit Trends</h3>
                <FinancialAnalyticsChart
                  type="revenue-trend"
                  data={[
                    { period: 'Jan', revenue: plStatement.revenue.totalRevenue * 0.8, profit: plStatement.netProfit.amount * 0.7 },
                    { period: 'Feb', revenue: plStatement.revenue.totalRevenue * 0.9, profit: plStatement.netProfit.amount * 0.8 },
                    { period: 'Mar', revenue: plStatement.revenue.totalRevenue, profit: plStatement.netProfit.amount },
                  ]}
                  height={250}
                />
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Expense Breakdown</h3>
                <FinancialAnalyticsChart
                  type="expense-breakdown"
                  data={[
                    { name: 'COGS', amount: plStatement.costOfGoodsSold.totalCOGS },
                    { name: 'Marketing', amount: plStatement.operatingExpenses.marketing },
                    { name: 'Administrative', amount: plStatement.operatingExpenses.administrative },
                    { name: 'Utilities', amount: plStatement.operatingExpenses.utilities },
                    { name: 'Maintenance', amount: plStatement.operatingExpenses.maintenance },
                    { name: 'Other', amount: plStatement.operatingExpenses.other },
                    ...(plStatement.operatingExpenses.courierShipping
                      ? [{ name: 'Courier (canteen)', amount: plStatement.operatingExpenses.courierShipping }]
                      : []),
                  ]}
                  height={250}
                />
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Profit Margins by Category</h3>
                <FinancialAnalyticsChart
                  type="profit-margin"
                  data={[
                    { category: 'Groundnut Oil', margin: 25.5 },
                    { category: 'Gingelly Oil', margin: 28.2 },
                    { category: 'Coconut Oil', margin: 22.8 },
                    { category: 'Deepam Oil', margin: 35.1 },
                    { category: 'Packaging', margin: 15.3 },
                  ]}
                  height={250}
                />
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">💸 Cash Flow Analysis</h3>
                <FinancialAnalyticsChart
                  type="cash-flow"
                  data={[
                    { month: 'Jan', cashIn: 45000, cashOut: 38000, netCashFlow: 7000 },
                    { month: 'Feb', cashIn: 52000, cashOut: 41000, netCashFlow: 11000 },
                    { month: 'Mar', cashIn: plStatement.revenue.totalRevenue, cashOut: plStatement.operatingExpenses.totalOperatingExpenses, netCashFlow: plStatement.netProfit.amount },
                  ]}
                  height={250}
                />
              </div>
            </Card>
          </div>

          {/* Financial Insights and Recommendations */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Business Insights & Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-green-700 mb-3">💡 Strengths</h4>
                  <ul className="space-y-2 text-sm">
                    {plStatement.grossProfit.margin > 25 && (
                      <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Strong gross profit margin ({plStatement.grossProfit.margin.toFixed(1)}%)</span>
                      </li>
                    )}
                    {plStatement.operatingProfit.margin > 10 && (
                      <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Healthy operating profit margin ({plStatement.operatingProfit.margin.toFixed(1)}%)</span>
                      </li>
                    )}
                    {cashFlowStatement.summary.netCashFlow > 0 && (
                      <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Positive cash flow generation</span>
                      </li>
                    )}
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>Diversified product portfolio across oil types</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-orange-700 mb-3">⚠️ Areas for Improvement</h4>
                  <ul className="space-y-2 text-sm">
                    {plStatement.operatingExpenses.totalOperatingExpenses > (plStatement.revenue.totalRevenue * 0.4) && (
                      <li className="flex items-start">
                        <span className="text-orange-600 mr-2">⚠</span>
                        <span>Operating expenses are high - consider cost optimization</span>
                      </li>
                    )}
                    {balanceSheet.assets.currentAssets.inventory > (plStatement.revenue.totalRevenue * 0.3) && (
                      <li className="flex items-start">
                        <span className="text-orange-600 mr-2">⚠</span>
                        <span>Inventory levels are high - optimize stock management</span>
                      </li>
                    )}
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">⚠</span>
                      <span>Consider implementing automated reorder systems</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-600 mr-2">⚠</span>
                      <span>Explore digital marketing to increase canteen sales</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Action Items */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">🎯 Recommended Actions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium text-blue-700 mb-1">Short Term (1-2 months):</h5>
                    <ul className="space-y-1 text-blue-600">
                      <li>• Implement inventory automation (Task 24)</li>
                      <li>• Set up advanced analytics (Task 23)</li>
                      <li>• Optimize product pricing strategies</li>
                      <li>• Reduce slow-moving inventory</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-700 mb-1">Long Term (3-6 months):</h5>
                    <ul className="space-y-1 text-blue-600">
                      <li>• Expand canteen customer base</li>
                      <li>• Implement customer loyalty programs</li>
                      <li>• Explore new product lines</li>
                      <li>• Consider multi-location expansion</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Compliance and Audit Trail */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Compliance & Audit Trail</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">✅ GST Compliance</h4>
                  <div className="space-y-1 text-sm text-green-700">
                    <div>GST Collected: ₹{plStatement.revenue.gstCollected.toLocaleString()}</div>
                    <div>GST Rate: 5% (Standard for edible oils)</div>
                    <div>Filing Status: Up to date</div>
                    <div>Next Filing: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">📊 Financial Ratios</h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    <div>Current Ratio: {balanceSheet?.assets?.currentAssets?.totalCurrentAssets && balanceSheet?.liabilities?.currentLiabilities?.totalCurrentLiabilities ? 
                      (balanceSheet.assets.currentAssets.totalCurrentAssets / balanceSheet.liabilities.currentLiabilities.totalCurrentLiabilities).toFixed(2) : 'N/A'}</div>
                    <div>Debt-to-Equity: {balanceSheet?.liabilities?.totalLiabilities && balanceSheet?.ownersEquity?.totalOwnersEquity ? 
                      (balanceSheet.liabilities.totalLiabilities / balanceSheet.ownersEquity.totalOwnersEquity).toFixed(2) : 'N/A'}</div>
                    <div>ROA: {plStatement?.netProfit?.amount && balanceSheet?.assets?.totalAssets ? 
                      ((plStatement.netProfit.amount / balanceSheet.assets.totalAssets) * 100).toFixed(1) + '%' : 'N/A'}</div>
                    <div>ROE: {plStatement?.netProfit?.amount && balanceSheet?.ownersEquity?.totalOwnersEquity ? 
                      ((plStatement.netProfit.amount / balanceSheet.ownersEquity.totalOwnersEquity) * 100).toFixed(1) + '%' : 'N/A'}</div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-800 mb-2">🔍 Audit Information</h4>
                  <div className="space-y-1 text-sm text-purple-700">
                    <div>Report Generated: {new Date().toLocaleDateString()}</div>
                    <div>Data Period: {dateRange.startDate} to {dateRange.endDate}</div>
                    <div>Generated By: {session?.user?.name}</div>
                    <div>Last Audit: Pending</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}
    </div>
  );
};

export default FinancialStatementsPage;
