'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getFinancialYearLabelForDate,
  isDateInFinancialYear,
  parseFinancialYearLabelToStartYear,
} from '@/lib/financialYear';

type SaleRow = {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  invoiceDate?: string | null;
  createdAt: string;
  canteenAddressId?: string | null;
  canteenName?: string | null;
};

type SummaryRow = {
  canteenName: string;
  invoiceCount: number;
  totalValue: number;
};

function getSaleDate(sale: SaleRow): Date {
  const raw = sale.invoiceDate || sale.createdAt;
  const dt = new Date(raw as string);
  return Number.isNaN(dt.getTime()) ? new Date(sale.createdAt) : dt;
}

export default function CanteenWiseSalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [fyFilter, setFyFilter] = useState(() => getFinancialYearLabelForDate(new Date()));
  const [canteenFilter, setCanteenFilter] = useState('');

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }
    if (!['admin', 'accountant', 'retail_staff'].includes(session.user?.role || '')) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session || !['admin', 'accountant', 'retail_staff'].includes(session.user?.role || '')) return;

    const fetchSales = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/sales?category=canteen&limit=1000');
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load canteen sales');
          setSales([]);
          return;
        }
        setSales(Array.isArray(data.sales) ? data.sales : []);
      } catch {
        setError('Network error. Please try again.');
        setSales([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [session]);

  const availableFinancialYears = useMemo(() => {
    const years = new Set<string>();
    sales.forEach((sale) => years.add(getFinancialYearLabelForDate(getSaleDate(sale))));
    const arr = Array.from(years).sort((a, b) => {
      const ay = parseFinancialYearLabelToStartYear(a) ?? 0;
      const by = parseFinancialYearLabelToStartYear(b) ?? 0;
      return by - ay;
    });
    const currentFy = getFinancialYearLabelForDate(new Date());
    if (!arr.includes(currentFy)) arr.unshift(currentFy);
    return arr;
  }, [sales]);

  const availableCanteens = useMemo(() => {
    const names = new Set<string>();
    sales.forEach((sale) => names.add((sale.canteenName || 'Unknown').trim() || 'Unknown'));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [sales]);

  const summaryRows = useMemo(() => {
    const filtered = sales.filter((sale) => {
      const d = getSaleDate(sale);
      const fyStart = parseFinancialYearLabelToStartYear(fyFilter);
      if (fyStart !== null && !isDateInFinancialYear(d, fyStart)) return false;
      const name = (sale.canteenName || 'Unknown').trim() || 'Unknown';
      if (canteenFilter && name !== canteenFilter) return false;
      return true;
    });

    const byCanteen = new Map<string, SummaryRow>();
    filtered.forEach((sale) => {
      const name = (sale.canteenName || 'Unknown').trim() || 'Unknown';
      const row = byCanteen.get(name) || { canteenName: name, invoiceCount: 0, totalValue: 0 };
      row.invoiceCount += 1;
      row.totalValue += Number(sale.totalAmount || 0);
      byCanteen.set(name, row);
    });

    return Array.from(byCanteen.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [sales, fyFilter, canteenFilter]);

  const totals = useMemo(() => {
    return summaryRows.reduce(
      (acc, row) => {
        acc.invoiceCount += row.invoiceCount;
        acc.totalValue += row.totalValue;
        return acc;
      },
      { invoiceCount: 0, totalValue: 0 },
    );
  }, [summaryRows]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !['admin', 'accountant', 'retail_staff'].includes(session.user?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Canteen-wise Sales</h1>
            <p className="mt-2 text-gray-600">Canteen name, invoice count, and total value</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/admin/sales/canteen"
              className="px-4 py-2 text-sm font-medium bg-gray-700 text-white rounded-md hover:bg-gray-800"
            >
              Canteen Sales
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Financial year (Apr-Mar)</label>
              <select
                value={fyFilter}
                onChange={(e) => setFyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {availableFinancialYears.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canteen</label>
              <select
                value={canteenFilter}
                onChange={(e) => setCanteenFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Canteens</option>
                {availableCanteens.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-lg font-medium text-gray-900">Canteen-wise Sales Table ({summaryRows.length})</h2>
            <div className="text-sm text-gray-600">
              Total value:{' '}
              <span className="font-semibold text-gray-900">₹{totals.totalValue.toFixed(2)}</span>
              {' • '}
              Invoices: <span className="font-semibold text-gray-900">{totals.invoiceCount}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Canteen Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No. of invoices sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                      No records found for selected filters.
                    </td>
                  </tr>
                ) : (
                  summaryRows.map((row) => (
                    <tr key={row.canteenName} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.canteenName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.invoiceCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ₹{row.totalValue.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

