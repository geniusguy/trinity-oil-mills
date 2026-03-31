'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type SaleRow = {
  id: string;
  saleType: string;
  totalAmount: number;
  totalBottles?: number | null;
  totalTins?: number | null;
  invoiceDate?: string | null;
  createdAt: string;
};

const FY_MONTHS = [
  { fyIndex: 1, label: 'April' },
  { fyIndex: 2, label: 'May' },
  { fyIndex: 3, label: 'June' },
  { fyIndex: 4, label: 'July' },
  { fyIndex: 5, label: 'August' },
  { fyIndex: 6, label: 'September' },
  { fyIndex: 7, label: 'October' },
  { fyIndex: 8, label: 'November' },
  { fyIndex: 9, label: 'December' },
  { fyIndex: 10, label: 'January' },
  { fyIndex: 11, label: 'February' },
  { fyIndex: 12, label: 'March' },
];

function getFyMonthIndex(d: Date): number {
  const m = d.getMonth(); // 0=Jan
  return ((m + 9) % 12) + 1; // Apr=1 ... Mar=12
}

function getFyStartYear(d: Date): number {
  const m = d.getMonth();
  const y = d.getFullYear();
  return m >= 3 ? y : y - 1; // Apr–Dec: same year; Jan–Mar: previous year
}

function saleDate(s: SaleRow): Date {
  const d = new Date((s.invoiceDate || s.createdAt) as string);
  return Number.isNaN(d.getTime()) ? new Date(s.createdAt) : d;
}

export default function CanteenSalesRegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFyStartYear, setSelectedFyStartYear] = useState<number | null>(null);

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
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/sales?category=canteen&limit=5000');
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load canteen sales');
          setSales([]);
          return;
        }
        const list: SaleRow[] = Array.isArray(data.sales) ? data.sales : [];
        setSales(list);

        if (list.length > 0) {
          // Default to current FY based on newest sale
          const latest = saleDate(list[0]);
          setSelectedFyStartYear(getFyStartYear(latest));
        }
      } catch {
        setError('Network error. Please try again.');
        setSales([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  const fyOptions = useMemo(() => {
    const years = new Set<number>();
    sales.forEach((s) => years.add(getFyStartYear(saleDate(s))));
    return Array.from(years).sort((a, b) => b - a);
  }, [sales]);

  const monthlyData = useMemo(() => {
    if (selectedFyStartYear == null) return [];
    const perMonth: { fyIndex: number; label: string; total: number; tins: number }[] = FY_MONTHS.map((m) => ({
      fyIndex: m.fyIndex,
      label: m.label,
      total: 0,
      tins: 0,
    }));

    sales.forEach((s) => {
      if (s.saleType !== 'canteen') return;
      const d = saleDate(s);
      if (getFyStartYear(d) !== selectedFyStartYear) return;
      const idx = getFyMonthIndex(d);
      const slot = perMonth.find((m) => m.fyIndex === idx);
      if (slot) {
        slot.total += Number(s.totalAmount || 0);
        slot.tins += Number(s.totalTins || 0);
      }
    });

    return perMonth;
  }, [sales, selectedFyStartYear]);

  const maxValue = useMemo(
    () => monthlyData.reduce((max, m) => (m.total > max ? m.total : max), 0),
    [monthlyData],
  );

  const totals = useMemo(() => {
    const sums = monthlyData.reduce(
      (acc, m) => {
        acc.totalSales += m.total;
        acc.totalTins += m.tins;
        return acc;
      },
      { totalSales: 0, totalTins: 0 },
    );

    let totalBottles = 0;
    sales.forEach((s) => {
      if (s.saleType !== 'canteen') return;
      const d = saleDate(s);
      if (selectedFyStartYear == null || getFyStartYear(d) !== selectedFyStartYear) return;
      totalBottles += Number(s.totalBottles || 0);
    });

    const totalCaps = totalBottles;
    const totalLabels = totalBottles;
    // Match invoice HTML logic: boxes are based on 200ml bottle count with 40 nos/box.
    const totalBoxes = Math.ceil(totalBottles / 40);

    return {
      totalSales: sums.totalSales,
      totalTins: sums.totalTins,
      totalBottles,
      totalCaps,
      totalLabels,
      totalBoxes,
    };
  }, [monthlyData, sales, selectedFyStartYear]);

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Canteen Sales Register</h1>
            <p className="text-gray-600 mt-1">
              Monthly register (April–March) with visual comparison of canteen sales totals.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
            <select
              value={selectedFyStartYear ?? ''}
              onChange={(e) => setSelectedFyStartYear(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {fyOptions.length === 0 && <option value="">No data</option>}
              {fyOptions.map((y) => (
                <option key={y} value={y}>
                  {y}-{String(y + 1).slice(-2)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="w-1/2 px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Month
                </th>
                <th className="w-1/4 px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  No. of Tins Sold
                </th>
                <th className="w-1/4 px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total Canteen Sales (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m) => (
                <tr key={m.fyIndex} className="border-t border-gray-200">
                  <td className="px-3 py-2 text-sm text-gray-800">{m.label}</td>
                  <td className="px-3 py-2 text-sm text-right font-semibold text-gray-900">
                    {m.tins > 0 ? m.tins.toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-right font-semibold text-gray-900">
                    {m.total > 0 ? `₹${m.total.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Simple vertical bar chart */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">
            Monthly Canteen Sales Comparison ({selectedFyStartYear ?? '—'}-
            {selectedFyStartYear != null ? String(selectedFyStartYear + 1).slice(-2) : '—'})
          </h2>
          <div className="h-56 flex items-end gap-2 border-t border-gray-200 pt-4">
            {monthlyData.map((m) => {
              const ratio = maxValue > 0 ? m.total / maxValue : 0;
              const height = 20 + ratio * 180; // min 20px so even small months show
              return (
                <div key={m.fyIndex} className="flex-1 flex flex-col items-center justify-end">
                  <div
                    className="w-4 sm:w-5 md:w-6 rounded-t bg-red-500"
                    style={{ height }}
                    title={`${m.label}: ₹${m.total.toFixed(2)}`}
                  />
                  <div className="mt-1 text-[10px] text-gray-700 text-center leading-tight">
                    {m.label.slice(0, 3)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4 mt-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Total</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">Total No. of Tins Sold</div>
              <div className="text-lg font-semibold text-gray-900">{totals.totalTins.toFixed(2)}</div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">No. of Boxes used</div>
              <div className="text-lg font-semibold text-gray-900">{totals.totalBoxes}</div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">No. of Bottles used</div>
              <div className="text-lg font-semibold text-gray-900">{totals.totalBottles.toFixed(0)}</div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">No. of caps Used</div>
              <div className="text-lg font-semibold text-gray-900">{totals.totalCaps.toFixed(0)}</div>
            </div>
            <div className="rounded-md border border-gray-200 p-3">
              <div className="text-xs text-gray-500">No. of Lables Used</div>
              <div className="text-lg font-semibold text-gray-900">{totals.totalLabels.toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

