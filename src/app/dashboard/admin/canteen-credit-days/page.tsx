'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  formatFinancialYearLabel,
  getFinancialYearStartYear,
} from '@/lib/financialYear';

type Row = {
  saleId: string;
  invoiceNumber?: string;
  canteenName: string;
  invoiceDate: string;
  creditedDate: string | null;
  daysBetween: number | null;
};

type Address = { id: string; canteenName: string };

type SortKey = 'canteen' | 'invoice' | 'invoiceDate' | 'creditedDate' | 'days';

function formatDate(v: string | null | undefined) {
  if (!v) return '—';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}

export default function CanteenCreditDaysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [fyStartYear, setFyStartYear] = useState(() => getFinancialYearStartYear(new Date()));
  const [canteenAddressId, setCanteenAddressId] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<{ fyLabel: string; range: { start: string; end: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlyWithCreditedDate, setOnlyWithCreditedDate] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('invoiceDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fyOptions = useMemo(() => {
    const cur = getFinancialYearStartYear(new Date());
    const list: number[] = [];
    for (let y = cur + 1; y >= cur - 8; y--) list.push(y);
    return list;
  }, []);

  const displayedRows = useMemo(() => {
    if (!onlyWithCreditedDate) return rows;
    return rows.filter((r) => r.creditedDate != null && String(r.creditedDate).trim() !== '');
  }, [rows, onlyWithCreditedDate]);

  const timeOrZero = (d: string | null | undefined) => {
    if (!d) return null;
    const t = new Date(d).getTime();
    return Number.isNaN(t) ? null : t;
  };

  const sortedRows = useMemo(() => {
    const copy = [...displayedRows];
    const dir = sortDir === 'asc' ? 1 : -1;
    const nullsLast = (av: number | null, bv: number | null, cmp: number) => {
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return cmp;
    };
    copy.sort((a, b) => {
      switch (sortBy) {
        case 'canteen':
          return a.canteenName.localeCompare(b.canteenName, undefined, { sensitivity: 'base' }) * dir;
        case 'invoice':
          return (String(a.invoiceNumber || '').localeCompare(String(b.invoiceNumber || ''), undefined, { numeric: true })) * dir;
        case 'invoiceDate': {
          const at = timeOrZero(a.invoiceDate);
          const bt = timeOrZero(b.invoiceDate);
          return nullsLast(at, bt, (at! - bt!) * dir);
        }
        case 'creditedDate': {
          const at = timeOrZero(a.creditedDate);
          const bt = timeOrZero(b.creditedDate);
          return nullsLast(at, bt, (at! - bt!) * dir);
        }
        case 'days': {
          const av = a.daysBetween;
          const bv = b.daysBetween;
          return nullsLast(av, bv, (av! - bv!) * dir);
        }
        default:
          return 0;
      }
    });
    return copy;
  }, [displayedRows, sortBy, sortDir]);

  const stats = useMemo(() => {
    const total = displayedRows.length;
    const withCredit = displayedRows.filter((r) => r.daysBetween != null);
    const pending = total - withCredit.length;
    const daysList = withCredit.map((r) => Number(r.daysBetween)).filter((n) => Number.isFinite(n));
    const sortedDays = [...daysList].sort((x, y) => x - y);
    const maxDays = sortedDays.length ? sortedDays[sortedDays.length - 1] : null;
    const minDays = sortedDays.length ? sortedDays[0] : null;
    const sum = sortedDays.reduce((acc, n) => acc + n, 0);
    const avgDays = sortedDays.length ? sum / sortedDays.length : null;
    let medianDays: number | null = null;
    if (sortedDays.length) {
      const mid = Math.floor(sortedDays.length / 2);
      medianDays =
        sortedDays.length % 2 === 1
          ? sortedDays[mid]
          : (sortedDays[mid - 1] + sortedDays[mid]) / 2;
    }
    const pctCredited = total > 0 ? (100 * withCredit.length) / total : 0;
    let variance: number | null = null;
    if (sortedDays.length > 1 && avgDays != null) {
      variance = sortedDays.reduce((acc, n) => acc + (n - avgDays) * (n - avgDays), 0) / sortedDays.length;
    }
    const stdDev = variance != null && variance >= 0 ? Math.sqrt(variance) : null;

    const byCanteen = new Map<string, number[]>();
    for (const r of withCredit) {
      const name = r.canteenName || '—';
      const d = Number(r.daysBetween);
      if (!Number.isFinite(d)) continue;
      const arr = byCanteen.get(name) || [];
      arr.push(d);
      byCanteen.set(name, arr);
    }
    let slowestCanteen: { name: string; avg: number; count: number } | null = null;
    for (const [name, arr] of byCanteen) {
      if (arr.length < 1) continue;
      const avg = arr.reduce((x, y) => x + y, 0) / arr.length;
      if (!slowestCanteen || avg > slowestCanteen.avg) {
        slowestCanteen = { name, avg, count: arr.length };
      }
    }
    let fastestCanteen: { name: string; avg: number; count: number } | null = null;
    for (const [name, arr] of byCanteen) {
      if (arr.length < 1) continue;
      const avg = arr.reduce((x, y) => x + y, 0) / arr.length;
      if (!fastestCanteen || avg < fastestCanteen.avg) {
        fastestCanteen = { name, avg, count: arr.length };
      }
    }

    return {
      total,
      creditedCount: withCredit.length,
      pendingCount: pending,
      pctCredited,
      maxDays,
      minDays,
      avgDays,
      medianDays,
      stdDev,
      slowestCanteen,
      fastestCanteen,
    };
  }, [displayedRows]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortDir(key === 'canteen' || key === 'invoice' ? 'asc' : 'desc');
  };

  const sortMark = (key: SortKey) => (sortBy === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  const loadAddresses = async () => {
    try {
      const res = await fetch('/api/canteen-addresses');
      const data = await res.json();
      if (!res.ok) return;
      const raw = Array.isArray(data.addresses) ? data.addresses : [];
      setAddresses(
        raw.map((a: { id: string; canteenName?: string }) => ({
          id: String(a.id),
          canteenName: String(a.canteenName || a.id),
        })),
      );
    } catch {
      setAddresses([]);
    }
  };

  const loadRows = async () => {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams();
      qs.set('fyStartYear', String(fyStartYear));
      if (canteenAddressId) qs.set('canteenAddressId', canteenAddressId);
      const res = await fetch(`/api/canteen-credit-days?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setRows([]);
        setMeta(null);
        setError(data.error || 'Failed to load');
        return;
      }
      setMeta({ fyLabel: data.fyLabel, range: data.range });
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setRows([]);
      setMeta(null);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!['admin', 'accountant'].includes(session.user?.role || '')) {
      router.push('/dashboard');
      return;
    }
    loadAddresses();
  }, [session, status, router]);

  useEffect(() => {
    if (status === 'loading' || !session || !['admin', 'accountant'].includes(session.user?.role || '')) return;
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fyStartYear, canteenAddressId, session, status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session || !['admin', 'accountant'].includes(session.user?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Access denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Canteen invoice → credit days</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Invoice date uses the invoice date when set, otherwise the sale date. Days = credited date minus invoice date.
        </p>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">{error}</div>
        )}

        <div className="mt-6 bg-white shadow rounded-lg p-4 border border-gray-100">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Financial year</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[9rem]"
                value={fyStartYear}
                onChange={(e) => setFyStartYear(Number(e.target.value))}
              >
                {fyOptions.map((y) => (
                  <option key={y} value={y}>
                    {formatFinancialYearLabel(y)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[12rem] max-w-md">
              <label className="block text-xs font-medium text-gray-600 mb-1">Canteen</label>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full"
                value={canteenAddressId}
                onChange={(e) => setCanteenAddressId(e.target.value)}
              >
                <option value="">All canteens</option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.canteenName}
                  </option>
                ))}
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none pb-0.5">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={onlyWithCreditedDate}
                onChange={(e) => setOnlyWithCreditedDate(e.target.checked)}
              />
              Only credited
            </label>
            <button
              type="button"
              onClick={() => loadRows()}
              className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Refresh
            </button>
          </div>
          {meta && (
            <p className="mt-3 text-xs text-gray-500">
              Period: {meta.range.start} to {meta.range.end} ({meta.fyLabel})
            </p>
          )}
        </div>

        {!loading && displayedRows.length > 0 && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoices (filtered)</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{stats.total}</div>
              <div className="text-xs text-gray-600 mt-1">
                Credited: {stats.creditedCount} · Pending credit: {stats.pendingCount} ({stats.pctCredited.toFixed(0)}% credited)
              </div>
            </div>
            <div className="bg-white rounded-lg border border-amber-100 bg-amber-50/50 p-4">
              <div className="text-xs font-medium text-amber-800 uppercase tracking-wide">Max days to credit</div>
              <div className="mt-1 text-2xl font-semibold text-amber-950 tabular-nums">
                {stats.maxDays == null ? '—' : stats.maxDays}
              </div>
              <div className="text-xs text-amber-900/80 mt-1">Longest wait (credited only)</div>
            </div>
            <div className="bg-white rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="text-xs font-medium text-emerald-800 uppercase tracking-wide">Min days to credit</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-950 tabular-nums">
                {stats.minDays == null ? '—' : stats.minDays}
              </div>
              <div className="text-xs text-emerald-900/80 mt-1">Shortest wait (credited only)</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Average · Median</div>
              <div className="mt-1 text-xl font-semibold text-gray-900 tabular-nums">
                {stats.avgDays == null ? '—' : stats.avgDays.toFixed(1)}
                <span className="text-gray-400 font-normal mx-1">·</span>
                {stats.medianDays == null ? '—' : Number.isInteger(stats.medianDays) ? stats.medianDays : stats.medianDays.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Days (credited invoices only)</div>
            </div>
            {stats.stdDev != null && (
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Std. deviation</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{stats.stdDev.toFixed(1)}</div>
                <div className="text-xs text-gray-600 mt-1">Spread of credit lag</div>
              </div>
            )}
            {stats.slowestCanteen && stats.slowestCanteen.count >= 1 && (
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 col-span-2 sm:col-span-1 lg:col-span-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Slowest avg (by canteen)</div>
                <div className="mt-1 text-sm font-semibold text-gray-900 truncate" title={stats.slowestCanteen.name}>
                  {stats.slowestCanteen.name}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Avg {stats.slowestCanteen.avg.toFixed(1)} days · {stats.slowestCanteen.count} credited invoice
                  {stats.slowestCanteen.count === 1 ? '' : 's'}
                </div>
              </div>
            )}
            {stats.fastestCanteen &&
              stats.fastestCanteen.count >= 1 &&
              stats.slowestCanteen &&
              stats.fastestCanteen.name !== stats.slowestCanteen.name && (
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 col-span-2 sm:col-span-1 lg:col-span-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fastest avg (by canteen)</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900 truncate" title={stats.fastestCanteen.name}>
                    {stats.fastestCanteen.name}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Avg {stats.fastestCanteen.avg.toFixed(1)} days · {stats.fastestCanteen.count} credited invoice
                    {stats.fastestCanteen.count === 1 ? '' : 's'}
                  </div>
                </div>
              )}
          </div>
        )}

        <div className="mt-6 bg-white shadow rounded-lg overflow-hidden border border-gray-100">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <button
                        type="button"
                        onClick={() => toggleSort('canteen')}
                        className="font-medium text-gray-500 hover:text-gray-800 inline-flex items-center gap-0.5"
                      >
                        Canteen name{sortMark('canteen')}
                      </button>
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <button
                        type="button"
                        onClick={() => toggleSort('invoice')}
                        className="font-medium text-gray-500 hover:text-gray-800 inline-flex items-center gap-0.5"
                      >
                        Invoice number{sortMark('invoice')}
                      </button>
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <button
                        type="button"
                        onClick={() => toggleSort('invoiceDate')}
                        className="font-medium text-gray-500 hover:text-gray-800 inline-flex items-center gap-0.5"
                      >
                        Invoice date{sortMark('invoiceDate')}
                      </button>
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <button
                        type="button"
                        onClick={() => toggleSort('creditedDate')}
                        className="font-medium text-gray-500 hover:text-gray-800 inline-flex items-center gap-0.5"
                      >
                        Credited date{sortMark('creditedDate')}
                      </button>
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <button
                        type="button"
                        onClick={() => toggleSort('days')}
                        className="font-medium text-gray-500 hover:text-gray-800 inline-flex items-center gap-0.5 ml-auto w-full justify-end"
                      >
                        Days{sortMark('days')}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        {rows.length === 0
                          ? `No canteen sales in this period${canteenAddressId ? ' for the selected canteen' : ''}.`
                          : 'No rows match “Only credited”.'}
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((r) => (
                      <tr key={r.saleId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">{r.canteenName}</td>
                        <td className="px-4 py-2 font-mono text-sm text-gray-800 whitespace-nowrap">
                          {r.invoiceNumber || '—'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatDate(r.invoiceDate)}</td>
                        <td className="px-4 py-2 text-sm text-gray-800 whitespace-nowrap">{formatDate(r.creditedDate)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium tabular-nums">
                          {r.daysBetween == null ? '—' : r.daysBetween}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
