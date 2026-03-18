'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type SuppliedRow = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  invoiceDate: string | null;
  canteenId: string | null;
  canteenName: string;
  poNumber: string | null;
  poDate: string | null;
  noOfBottles: number;
  liters: number;
  billAmount: number;
  keptOnDisplay: boolean;
  sgst: number;
  cgst: number;
  totalGst: number;
  noOfTins: number;
  mailSentHO: boolean;
  mailSentHoDate?: string | null;
  courierWeightOrRs: string | null;
};

function normalizeDateInput(d?: string | null) {
  if (!d) return '';
  const str = String(d).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const dt = new Date(str);
  if (Number.isNaN(dt.getTime())) return '';
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fmtDateGB(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d as any);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB');
}

function toNum(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function parsePoSequence(po?: string | null) {
  if (!po) return 0;
  const m = String(po).match(/PO-(\d+)/i);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}

function parseCourierSortable(v?: string | null) {
  if (!v) return 0;
  const s = String(v).trim().toLowerCase();
  // "₹123.45" or "rs 123" -> amount
  const amountMatch = s.match(/(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (amountMatch) return Number(amountMatch[1]) || 0;
  // "12kg" -> 12, "1.5 kg" -> 1.5
  const kgMatch = s.match(/([0-9]+(?:\.[0-9]+)?)\s*kg/);
  if (kgMatch) return Number(kgMatch[1]) || 0;
  // fallback: first number
  const numMatch = s.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (numMatch) return Number(numMatch[1]) || 0;
  return 0;
}

export default function SuppliedDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rows, setRows] = useState<SuppliedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    canteen: '',
    displayed: '', // '', 'yes', 'no'
    dateFrom: '',
    dateTo: '',
  });

  const [sortBy, setSortBy] = useState<keyof SuppliedRow>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!['admin', 'accountant', 'retail_staff'].includes(session.user?.role || '')) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const qs = new URLSearchParams();
      if (filters.dateFrom) qs.set('startDate', filters.dateFrom);
      if (filters.dateTo) qs.set('endDate', filters.dateTo);
      const res = await fetch(`/api/reports/supplied-details?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch');
      const data = Array.isArray(json?.data) ? json.data : [];
      setRows(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const canteenOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const r of rows) {
      if (r.canteenId) unique.set(r.canteenId, r.canteenName);
    }
    return Array.from(unique.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.canteen && r.canteenId !== filters.canteen) return false;
      if (filters.displayed === 'yes' && !r.keptOnDisplay) return false;
      if (filters.displayed === 'no' && r.keptOnDisplay) return false;
      if (q) {
        const hay = [r.invoiceNumber, r.canteenName, r.poNumber || ''].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filters]);

  const sorted = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av: any = (a as any)[sortBy];
      const bv: any = (b as any)[sortBy];
      if (['noOfBottles', 'liters', 'billAmount', 'sgst', 'cgst', 'totalGst', 'noOfTins'].includes(String(sortBy))) {
        return (toNum(av) - toNum(bv)) * dir;
      }
      if (sortBy === 'keptOnDisplay' || sortBy === 'mailSentHO') {
        return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir;
      }
      if (sortBy === 'mailSentHoDate') {
        return (new Date(String(av || 0)).getTime() - new Date(String(bv || 0)).getTime()) * dir;
      }
      if (sortBy === 'poNumber') {
        return (parsePoSequence(a.poNumber) - parsePoSequence(b.poNumber)) * dir;
      }
      if (sortBy === 'poDate') {
        return (new Date(String(a.poDate || 0)).getTime() - new Date(String(b.poDate || 0)).getTime()) * dir;
      }
      if (sortBy === 'courierWeightOrRs') {
        return (parseCourierSortable(a.courierWeightOrRs) - parseCourierSortable(b.courierWeightOrRs)) * dir;
      }
      if (sortBy === 'createdAt') {
        return (new Date(String(av)).getTime() - new Date(String(bv)).getTime()) * dir;
      }
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
    return copy;
  }, [filtered, sortBy, sortOrder]);

  const handleSort = (key: keyof SuppliedRow) => {
    if (sortBy === key) setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplied Details</h1>
          <p className="text-sm text-gray-500">Canteen orders supply summary</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium">
          Refresh
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Invoice / Canteen / PO"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Canteen</label>
            <select
              value={filters.canteen}
              onChange={(e) => setFilters({ ...filters, canteen: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All</option>
              {canteenOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Displayed on</label>
            <select
              value={filters.displayed}
              onChange={(e) => setFilters({ ...filters, displayed: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: normalizeDateInput(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: normalizeDateInput(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Rows ({sorted.length})</h2>
          {isLoading && <span className="text-sm text-gray-500">Loading…</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('invoiceNumber')}>Invoice No.</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('createdAt')}>Invoice Date</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('canteenName')}>Canteen Name</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('poNumber')}>PO &amp; Date</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('noOfBottles')}>No Of Bottles</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('liters')}>Lts</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('billAmount')}>Bill Amount</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('keptOnDisplay')}>Displayed on</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('sgst')}>SGST</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('cgst')}>CGST</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('totalGst')}>Total GST</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('noOfTins')}>No of Tins</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('mailSentHoDate')}>Mail sent HO (Date)</th>
                <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort('courierWeightOrRs')}>Courier weig/rs</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {sorted.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-medium text-indigo-700">{r.invoiceNumber}</td>
                  <td className="px-3 py-3">{fmtDateGB(r.invoiceDate || r.createdAt)}</td>
                  <td className="px-3 py-3">{r.canteenName}</td>
                  <td className="px-3 py-3 text-xs text-gray-700">
                    <div className="space-y-1">
                      <div><span className="font-semibold">PO:</span> {r.poNumber || '—'}</div>
                      <div><span className="font-semibold">PO Date:</span> {r.poDate ? fmtDateGB(r.poDate) : '—'}</div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{toNum(r.noOfBottles).toFixed(0)}</td>
                  <td className="px-3 py-3">{toNum(r.liters).toFixed(2)}</td>
                  <td className="px-3 py-3">₹{toNum(r.billAmount).toFixed(2)}</td>
                  <td className="px-3 py-3">{r.keptOnDisplay ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-3">₹{toNum(r.sgst).toFixed(0)}</td>
                  <td className="px-3 py-3">₹{toNum(r.cgst).toFixed(0)}</td>
                  <td className="px-3 py-3">₹{toNum(r.totalGst).toFixed(0)}</td>
                  <td className="px-3 py-3">{toNum(r.noOfTins).toFixed(2)}</td>
                  <td className="px-3 py-3">{r.mailSentHoDate ? fmtDateGB(r.mailSentHoDate) : '—'}</td>
                  <td className="px-3 py-3">{r.courierWeightOrRs || '—'}</td>
                </tr>
              ))}
              {!isLoading && sorted.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={14}>
                    No results
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

