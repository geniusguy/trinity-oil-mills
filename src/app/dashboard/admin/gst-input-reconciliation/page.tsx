'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Button, LoadingSpinner } from '@/components/ui';
import { getCurrentFinancialYearBounds } from '@/lib/financialYear';

interface GSTBreakdown {
  rawMaterialGst: number;
  stockPurchaseDerivedGst: number;
  courierGst: number;
  gstPaidInput: number;
}

interface ProductDerivedRow {
  productId: string;
  productName: string;
  gstRate: number;
  gstIncluded: boolean;
  entries: number;
  amountConsidered: number;
  derivedGst: number;
}

export default function GSTInputReconciliationPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [taxes, setTaxes] = useState<GSTBreakdown | null>(null);
  const [productRows, setProductRows] = useState<ProductDerivedRow[]>([]);
  const [fyFilter, setFyFilter] = useState<string>(() => String(getCurrentFinancialYearBounds().start.getFullYear()));
  const [dateRange, setDateRange] = useState(() => {
    const fy = getCurrentFinancialYearBounds();
    return {
      startDate: fy.start.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    };
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const res = await fetch(`/api/reports/gst-input-reconciliation?${params.toString()}`);
      const json = await res.json();
      if (!json?.success || !json?.data?.totals) {
        throw new Error(json?.error || 'Failed to load GST input breakdown');
      }
      setTaxes(json.data.totals as GSTBreakdown);
      setProductRows(Array.isArray(json.data.stockPurchaseProductBreakdown) ? json.data.stockPurchaseProductBreakdown : []);
    } catch (e) {
      setTaxes(null);
      setProductRows([]);
      setError('Failed to load GST input reconciliation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const raw = taxes?.rawMaterialGst ?? 0;
  const stock = taxes?.stockPurchaseDerivedGst ?? 0;
  const courier = taxes?.courierGst ?? 0;
  const totalInput = taxes?.gstPaidInput ?? 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GST Input Reconciliation</h1>
            <p className="text-gray-600 mt-1">
              Verify input GST split and formula used in P&amp;L
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/admin/financial-statements" className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              Open Financial Statements
            </Link>
            <Button onClick={fetchData} className="bg-green-600 hover:bg-green-700">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm text-gray-700">FY</label>
            <select
              value={fyFilter}
              onChange={(e) => {
                const v = e.target.value;
                setFyFilter(v);
                if (v === 'all') {
                  setDateRange({
                    startDate: '2000-04-01',
                    endDate: new Date().toISOString().split('T')[0],
                  });
                } else if (/^\d{4}$/.test(v)) {
                  const y = Number(v);
                  setDateRange({
                    startDate: `${y}-04-01`,
                    endDate: `${y + 1}-03-31`,
                  });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {Array.from({ length: 8 }).map((_, i) => {
                const y = new Date().getFullYear() - i;
                return (
                  <option key={y} value={String(y)}>
                    {y}-{String(y + 1).slice(-2)}
                  </option>
                );
              })}
              <option value="all">All FY</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchData} className="w-full bg-blue-600 hover:bg-blue-700">
              Generate
            </Button>
          </div>
        </div>
      </Card>

      {loading && (
        <div className="py-16">
          <LoadingSpinner text="Loading GST reconciliation..." />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">{error}</div>
      )}

      {!loading && taxes && (
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Input GST Formula</h3>
            <div className="text-sm text-gray-700">
              GST Paid (Input) = Raw Material Purchases GST + Stock Purchases (derived) + Courier GST
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Component</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-left py-2">Cross-check page</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2">Raw Material Purchases GST</td>
                    <td className="py-2 text-right">{formatCurrency(raw)}</td>
                    <td className="py-2">
                      <Link href="/dashboard/admin/purchases" className="text-blue-700 hover:underline">Purchases</Link>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2">Stock Purchases (derived GST)</td>
                    <td className="py-2 text-right">{formatCurrency(stock)}</td>
                    <td className="py-2">
                      <Link href="/dashboard/admin/purchases" className="text-blue-700 hover:underline">Purchases</Link>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2">Courier GST</td>
                    <td className="py-2 text-right">{formatCurrency(courier)}</td>
                    <td className="py-2">
                      <Link href="/dashboard/admin/courier-expenses" className="text-blue-700 hover:underline">Courier Expenses</Link>
                    </td>
                  </tr>
                  <tr className="border-t border-gray-300 font-semibold">
                    <td className="py-2">GST Paid (Input)</td>
                    <td className="py-2 text-right">{formatCurrency(totalInput)}</td>
                    <td className="py-2">P&amp;L / GST Position</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {!loading && taxes && (
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Product-wise Derived GST from Stock Purchases</h3>
            <p className="text-xs text-gray-600">
              This is the detailed split behind "Input from Stock Purchases (derived)".
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Product</th>
                    <th className="text-right py-2">Entries</th>
                    <th className="text-right py-2">Amount Considered</th>
                    <th className="text-right py-2">GST Rate</th>
                    <th className="text-right py-2">Derived GST</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-gray-500">
                        No product-level derived GST rows for selected period.
                      </td>
                    </tr>
                  )}
                  {productRows.map((row) => (
                    <tr key={`${row.productId}-${row.productName}`} className="border-b border-gray-100">
                      <td className="py-2">
                        <div className="font-medium text-gray-900">{row.productName}</div>
                        <div className="text-xs text-gray-500">{row.productId}</div>
                      </td>
                      <td className="py-2 text-right">{row.entries}</td>
                      <td className="py-2 text-right">{formatCurrency(row.amountConsidered)}</td>
                      <td className="py-2 text-right">{row.gstRate.toFixed(2)}%</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(row.derivedGst)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-300 font-semibold">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right">{productRows.reduce((sum, r) => sum + r.entries, 0)}</td>
                    <td className="py-2 text-right">{formatCurrency(productRows.reduce((sum, r) => sum + r.amountConsidered, 0))}</td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">{formatCurrency(stock)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

