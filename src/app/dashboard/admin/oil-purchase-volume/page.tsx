'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface VolumeYearRow {
  year: number;
  fyLabel?: string;
  totalLiters: number;
  totalTins: number | null;
}

interface VolumeMonthRow {
  year: number;
  month: number;
  monthLabel: string;
  totalLiters: number;
  totalTins: number | null;
}

interface VolumeOilRow {
  key: string;
  productName: string;
  totalLiters: number;
  totalTins: number | null;
}

type SessionRole = { role?: string };

export default function OilPurchaseVolumePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [oilFilter, setOilFilter] = useState<string>('');
  const [volumeSummary, setVolumeSummary] = useState<{
    oilKey: string | null;
    totalLiters: number;
    totalTins: number | null;
    tinCapacityMl: number;
    byOil: VolumeOilRow[];
    years: VolumeYearRow[];
    months: VolumeMonthRow[];
    skippedRows: number;
  } | null>(null);
  const [volumeLoading, setVolumeLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    const role = (session.user as SessionRole)?.role || '';
    if (!['admin', 'retail_staff', 'accountant'].includes(role)) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const fetchVolumeSummary = useCallback(async () => {
    try {
      setVolumeLoading(true);
      const params = new URLSearchParams();
      if (oilFilter.trim()) params.set('oilKey', oilFilter.trim());
      const q = params.toString();
      const res = await fetch(`/api/stock-purchases/volume-summary${q ? `?${q}` : ''}`);
      const data = await res.json();
      if (res.ok) {
        setVolumeSummary({
          oilKey: data.oilKey ?? null,
          totalLiters: data.totalLiters ?? 0,
          totalTins: data.totalTins ?? null,
          tinCapacityMl: data.tinCapacityMl ?? 15200,
          byOil: data.byOil ?? [],
          years: data.years ?? [],
          months: data.months ?? [],
          skippedRows: data.skippedRows ?? 0,
        });
      } else {
        setVolumeSummary(null);
      }
    } catch {
      setVolumeSummary(null);
    } finally {
      setVolumeLoading(false);
    }
  }, [oilFilter]);

  useEffect(() => {
    const role = (session?.user as SessionRole)?.role || '';
    if (['admin', 'retail_staff', 'accountant'].includes(role)) {
      fetchVolumeSummary();
    }
  }, [session?.user, fetchVolumeSummary]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Access Denied</div>
      </div>
    );
  }
  const userRole = (session.user as SessionRole)?.role || '';
  if (!['admin', 'retail_staff', 'accountant'].includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Access Denied</div>
      </div>
    );
  }

  const filterLabel =
    oilFilter && volumeSummary?.byOil?.length
      ? volumeSummary.byOil.find((o) => o.key === oilFilter)?.productName ?? 'Selected oil'
      : 'All oils';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Oil purchased (liters &amp; tins)</h1>
            <p className="mt-2 text-gray-600">
              Totals from recorded stock purchases — filter by oil, view by product, year, and month.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/purchases"
              className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Add Stock / Purchases
            </Link>
            <Link
              href="/dashboard/admin/inventory"
              className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Stock Levels
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto text-center bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg mb-4 overflow-hidden border border-gray-200">
          <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 max-w-md">
              <label htmlFor="oil-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by oil
              </label>
              <select
                id="oil-filter"
                value={oilFilter}
                onChange={(e) => setOilFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                disabled={volumeLoading}
              >
                <option value="">All oils</option>
                {(volumeSummary?.byOil ?? []).map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.productName}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Summary and year/month tables follow this filter. &quot;By oil / product&quot; always lists every oil.
              </p>
            </div>
            {oilFilter && (
              <button
                type="button"
                onClick={() => setOilFilter('')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Summary</h2>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">{filterLabel}</span>
                {' — '}
                Oils only (no packaging / raw material). Liters = quantity × pack size. Tins = whole tins at{' '}
                {volumeSummary?.tinCapacityMl ?? 15_200} ml (PET: &quot;—&quot;).
              </p>
            </div>
            {!volumeLoading && volumeSummary != null && (
              <div className="text-right space-y-1">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Total liters</span>
                  <div className="text-xl font-semibold text-gray-900">
                    {volumeSummary.totalLiters.toLocaleString('en-IN', { maximumFractionDigits: 2 })} L
                  </div>
                </div>
                {volumeSummary.totalTins != null && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total tins</span>
                    <div className="text-xl font-semibold text-gray-900">
                      {volumeSummary.totalTins.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-6">
            {volumeLoading ? (
              <p className="text-sm text-gray-500">Loading volume summary…</p>
            ) : volumeSummary == null ? (
              <p className="text-sm text-gray-500">Could not load volume summary.</p>
            ) : (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">By oil / product (all)</h3>
                  <div className="border border-gray-200 rounded-md overflow-hidden max-h-80 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-700">Oil / product</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-700">Liters</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                            No. of tins
                            <span className="block text-[10px] font-normal text-gray-500 normal-case">
                              ({volumeSummary.tinCapacityMl.toLocaleString('en-IN')} ml)
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {volumeSummary.byOil.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                              No data
                            </td>
                          </tr>
                        ) : (
                          volumeSummary.byOil.map((o) => (
                            <tr key={o.key} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900">
                                {o.key === oilFilter ? (
                                  <span className="font-semibold text-indigo-800">{o.productName}</span>
                                ) : (
                                  o.productName
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-900">
                                {o.totalLiters.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-900">
                                {o.totalTins == null ? '—' : o.totalTins.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Financial year–wise (Apr–Mar, L &amp; tins)</h3>
                    <div className="border border-gray-200 rounded-md overflow-hidden max-h-72 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-700">FY</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-700">Liters</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                              Tins
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {volumeSummary.years.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                                No data
                              </td>
                            </tr>
                          ) : (
                            volumeSummary.years.map((y) => (
                              <tr key={y.year} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">{y.fyLabel ?? y.year}</td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900">
                                  {y.totalLiters.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900">
                                  {y.totalTins == null ? '—' : y.totalTins.toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Month-wise (L &amp; tins)</h3>
                    <div className="border border-gray-200 rounded-md overflow-hidden max-h-72 overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-700">Month</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-700">Liters</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                              Tins
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {volumeSummary.months.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                                No data
                              </td>
                            </tr>
                          ) : (
                            volumeSummary.months.map((m) => (
                              <tr
                                key={`${m.year}-${m.month}`}
                                className="border-t border-gray-100 hover:bg-gray-50"
                              >
                                <td className="px-3 py-2 text-gray-900">{m.monthLabel}</td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900">
                                  {m.totalLiters.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900">
                                  {m.totalTins == null ? '—' : m.totalTins.toLocaleString('en-IN')}
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
            )}
            {!volumeLoading && volumeSummary != null && volumeSummary.skippedRows > 0 && (
              <p className="mt-4 text-xs text-amber-700">
                Note: {volumeSummary.skippedRows} purchase line(s) could not be converted to liters (missing date or pack
                size in name/unit).
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
