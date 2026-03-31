'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, Input, Select, LoadingSpinner } from '@/components/ui';

type CreditedRow = {
  id: string;
  invoiceNumber: string;
  invoiceDate?: string | null;
  createdAt?: string | null;
  totalAmount: number;
  creditedDate?: string | null;
  canteenName?: string | null;
  paymentStatus?: string | null;
};

function toYmdLocal(dateLike?: string | null): string | null {
  if (!dateLike) return null;
  const str = String(dateLike).trim();
  if (!str) return null;

  // If already YYYY-MM-DD, keep it.
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const dt = new Date(str);
  if (Number.isNaN(dt.getTime())) return null;

  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatYmdToEnGB(ymd?: string | null): string {
  const v = toYmdLocal(ymd);
  if (!v) return '—';
  const dt = new Date(`${v}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-GB');
}

function ymdToTime(ymd?: string | null): number | null {
  const v = toYmdLocal(ymd);
  if (!v) return null;
  const dt = new Date(`${v}T00:00:00`);
  const t = dt.getTime();
  if (Number.isNaN(t)) return null;
  return t;
}

export default function CreditedToAccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [allRows, setAllRows] = useState<CreditedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [filters, setFilters] = useState({
    searchInvoice: '',
    invoiceDateFrom: '',
    invoiceDateTo: '',
    creditedDateFrom: '',
    creditedDateTo: '',
  });

  const [sortBy, setSortBy] = useState<'invoiceNumber' | 'invoiceDate' | 'creditedDate' | 'amount'>('invoiceDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: 'invoiceNumber' | 'invoiceDate' | 'creditedDate' | 'amount') => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDir(field === 'invoiceNumber' ? 'asc' : 'desc');
  };

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }
    if (!['admin', 'accountant'].includes(session.user?.role || '')) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session || status === 'loading') return;

    const fetchRows = async () => {
      try {
        setLoading(true);
        setError('');

        // We fetch canteen sales and then filter to paymentStatus='paid' client-side.
        // (Keeps this change localized without needing a new API endpoint.)
        const res = await fetch('/api/sales?category=canteen&limit=1000');
        const j = await res.json();
        if (!res.ok) {
          setError(j?.error || 'Failed to fetch credited sales');
          setAllRows([]);
          return;
        }

        const list = Array.isArray(j.sales) ? (j.sales as CreditedRow[]) : [];
        setAllRows(list);
      } catch (e) {
        setError('Network error. Please try again.');
        setAllRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, [session, status]);

  const computed = useMemo(() => {
    const search = filters.searchInvoice.trim().toLowerCase();
    const invoiceFromT = ymdToTime(filters.invoiceDateFrom);
    const invoiceToT = ymdToTime(filters.invoiceDateTo);
    const creditedFromT = ymdToTime(filters.creditedDateFrom);
    const creditedToT = ymdToTime(filters.creditedDateTo);

    const filtered = allRows
      .filter((r) => {
        if (!search) return true;
        return (r.invoiceNumber || '').toLowerCase().includes(search);
      })
      .filter((r) => {
        const invoiceCandidate = r.invoiceDate || r.createdAt || null;
        const invT = ymdToTime(invoiceCandidate);
        if (invoiceFromT != null && invT == null) return false;
        if (invoiceToT != null && invT == null) return false;
        if (invoiceFromT != null && invT != null && invT < invoiceFromT) return false;
        if (invoiceToT != null && invT != null && invT > invoiceToT + 24 * 60 * 60 * 1000 - 1) return false;
        return true;
      })
      .filter((r) => {
        const credT = ymdToTime(r.creditedDate || null);
        if (creditedFromT != null && credT == null) return false;
        if (creditedToT != null && credT == null) return false;
        if (creditedFromT != null && credT != null && credT < creditedFromT) return false;
        if (creditedToT != null && credT != null && credT > creditedToT + 24 * 60 * 60 * 1000 - 1) return false;
        return true;
      });

    const totalCreditedAmount = filtered.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0);

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      if (sortBy === 'invoiceNumber') {
        const av = String(a.invoiceNumber || '').toLowerCase();
        const bv = String(b.invoiceNumber || '').toLowerCase();
        return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' }) * dir;
      }

      if (sortBy === 'amount') {
        return (Number(a.totalAmount || 0) - Number(b.totalAmount || 0)) * dir;
      }

      const aT =
        sortBy === 'invoiceDate'
          ? ymdToTime(a.invoiceDate || a.createdAt || null)
          : ymdToTime(a.creditedDate || null);
      const bT =
        sortBy === 'invoiceDate'
          ? ymdToTime(b.invoiceDate || b.createdAt || null)
          : ymdToTime(b.creditedDate || null);

      // Nulls last
      if (aT == null && bT == null) return 0;
      if (aT == null) return 1;
      if (bT == null) return -1;
      return (aT - bT) * dir;
    });

    return { filtered: sorted, totalCreditedAmount };
  }, [allRows, filters, sortBy, sortDir]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner text="Loading credited sales..." />
      </div>
    );
  }

  if (!session || !['admin', 'accountant'].includes(session.user?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Credited to Account</h1>
          <p className="mt-2 text-gray-600">Payments credited to the account (Invoice date, amount, credited date)</p>
        </div>

        <Card>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                label="Invoice search"
                placeholder="Search by invoice number"
                value={filters.searchInvoice}
                onChange={(e) => setFilters({ ...filters, searchInvoice: e.target.value })}
              />

              <Input
                label="Invoice date from"
                type="date"
                value={filters.invoiceDateFrom}
                onChange={(e) => setFilters({ ...filters, invoiceDateFrom: e.target.value })}
              />

              <Input
                label="Invoice date to"
                type="date"
                value={filters.invoiceDateTo}
                onChange={(e) => setFilters({ ...filters, invoiceDateTo: e.target.value })}
              />

              <Input
                label="Credited date from"
                type="date"
                value={filters.creditedDateFrom}
                onChange={(e) => setFilters({ ...filters, creditedDateFrom: e.target.value })}
              />

              <Input
                label="Credited date to"
                type="date"
                value={filters.creditedDateTo}
                onChange={(e) => setFilters({ ...filters, creditedDateTo: e.target.value })}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 lg:items-center">
              <div className="w-full sm:w-56">
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                  <option value="invoiceNumber">Sort by Invoice number</option>
                  <option value="invoiceDate">Sort by Invoice date</option>
                  <option value="creditedDate">Sort by Credited date</option>
                  <option value="amount">Sort by Credited amount</option>
                </Select>
              </div>

              <div className="w-full sm:w-40">
                <Select value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-600">
              Total credited amount (filtered):{' '}
              <span className="font-semibold text-gray-900">₹{computed.totalCreditedAmount.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-500">
              Rows: <span className="font-medium text-gray-800">{computed.filtered.length}</span>
              <span className="mx-2">|</span>
              Total canteen invoices fetched: <span className="font-medium text-gray-800">{allRows.length}</span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <button type="button" onClick={() => toggleSort('invoiceNumber')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Invoice Number {sortBy === 'invoiceNumber' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <button type="button" onClick={() => toggleSort('invoiceDate')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Invoice Date {sortBy === 'invoiceDate' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <button type="button" onClick={() => toggleSort('amount')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Credited Amount {sortBy === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    <button type="button" onClick={() => toggleSort('creditedDate')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Credited Date {sortBy === 'creditedDate' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {computed.filtered.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={4}>
                      No credited records match your filters.
                    </td>
                  </tr>
                ) : (
                  computed.filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {r.invoiceNumber || '—'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatYmdToEnGB(r.invoiceDate || r.createdAt)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        ₹{Number(r.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatYmdToEnGB(r.creditedDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

