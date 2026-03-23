'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentFinancialYearBounds,
  getCurrentFinancialYearQuarterBounds,
  getFinancialYearStartYear,
  getPreviousFinancialYearBounds,
  formatFinancialYearLabel,
} from '@/lib/financialYear';

type CourierRow = {
  id: string;
  courierDate: string;
  quantity: number;
  cost: number;
  canteenAddressId: string | null;
  destinationNote: string;
  notes: string;
  paymentMethod: string;
  referenceNo: string;
  canteenName: string | null;
  canteenCity: string | null;
  canteenAddressLine: string | null;
};

type CanteenOpt = { id: string; canteenName: string; city?: string; address: string };

type ByCanteen = {
  canteenAddressId: string | null;
  canteenName: string;
  totalCost: number;
  totalQuantity: number;
  entryCount: number;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash' },
  { id: 'bank_transfer', name: 'Bank transfer' },
  { id: 'upi', name: 'UPI' },
  { id: 'card', name: 'Card' },
];

const SORT_OPTIONS = [
  { id: 'courier_date', label: 'Courier date' },
  { id: 'cost', label: 'Cost' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'canteen', label: 'Canteen name' },
] as const;

export default function CourierExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const allowed = ['admin', 'accountant'];

  const [rows, setRows] = useState<CourierRow[]>([]);
  const [summary, setSummary] = useState({ totalCost: 0, totalQuantity: 0, count: 0 });
  const [byCanteen, setByCanteen] = useState<ByCanteen[]>([]);
  const [canteens, setCanteens] = useState<CanteenOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [periodPreset, setPeriodPreset] = useState<
    'this_month' | 'fy_quarter' | 'fy_year' | 'fy_prev' | 'custom'
  >('fy_year');
  const [startDate, setStartDate] = useState(() => {
    const { start } = getCurrentFinancialYearBounds(new Date());
    return toYmd(start);
  });
  const [endDate, setEndDate] = useState(() => {
    const { end } = getCurrentFinancialYearBounds(new Date());
    return toYmd(end);
  });
  const [filterCanteenId, setFilterCanteenId] = useState('');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['id']>('courier_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    courierDate: toYmd(new Date()),
    quantity: '1',
    cost: '',
    canteenAddressId: '',
    destinationNote: '',
    notes: '',
    paymentMethod: 'cash',
    referenceNo: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!allowed.includes(session.user?.role || '')) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const applyPreset = useCallback((preset: typeof periodPreset) => {
    const now = new Date();
    if (preset === 'this_month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toYmd(s));
      setEndDate(toYmd(e));
      return;
    }
    if (preset === 'fy_quarter') {
      const { start, end } = getCurrentFinancialYearQuarterBounds(now);
      setStartDate(toYmd(start));
      setEndDate(toYmd(end));
      return;
    }
    if (preset === 'fy_year') {
      const { start, end } = getCurrentFinancialYearBounds(now);
      setStartDate(toYmd(start));
      setEndDate(toYmd(end));
      return;
    }
    if (preset === 'fy_prev') {
      const { start, end } = getPreviousFinancialYearBounds(now);
      setStartDate(toYmd(start));
      setEndDate(toYmd(end));
      return;
    }
  }, []);

  useEffect(() => {
    if (periodPreset !== 'custom') {
      applyPreset(periodPreset);
    }
  }, [periodPreset, applyPreset]);

  const fetchCanteens = async () => {
    try {
      const res = await fetch('/api/canteen-addresses');
      const j = await res.json();
      const list = (j.addresses || j.data || []) as CanteenOpt[];
      setCanteens(Array.isArray(list) ? list : []);
    } catch {
      setCanteens([]);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams();
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);
      if (filterCanteenId) qs.set('canteenAddressId', filterCanteenId);
      qs.set('sortBy', sortBy);
      qs.set('sortDir', sortDir);

      const res = await fetch(`/api/courier-expenses?${qs.toString()}`, { credentials: 'include' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to load');
      setRows(j.data || []);
      setSummary(j.summary || { totalCost: 0, totalQuantity: 0, count: 0 });
      setByCanteen(j.byCanteen || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setError(msg);
      if (msg.includes('Unauthorized') || msg.includes('401')) {
        setError('Unauthorized. Admin or Accountant only.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && allowed.includes(session.user.role || '')) {
      fetchCanteens();
    }
  }, [session]);

  useEffect(() => {
    if (!session?.user || !allowed.includes(session.user.role || '')) return;
    if (!startDate || !endDate) return;
    void fetchData();
  }, [session, startDate, endDate, filterCanteenId, sortBy, sortDir]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      courierDate: toYmd(new Date()),
      quantity: '1',
      cost: '',
      canteenAddressId: '',
      destinationNote: '',
      notes: '',
      paymentMethod: 'cash',
      referenceNo: '',
    });
    setShowForm(false);
  };

  const startEdit = (r: CourierRow) => {
    setEditingId(r.id);
    setForm({
      courierDate: r.courierDate,
      quantity: String(r.quantity),
      cost: String(r.cost),
      canteenAddressId: r.canteenAddressId || '',
      destinationNote: r.destinationNote || '',
      notes: r.notes || '',
      paymentMethod: r.paymentMethod || 'cash',
      referenceNo: r.referenceNo || '',
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        courierDate: form.courierDate,
        quantity: form.quantity,
        cost: form.cost,
        canteenAddressId: form.canteenAddressId || null,
        destinationNote: form.destinationNote,
        notes: form.notes,
        paymentMethod: form.paymentMethod,
        referenceNo: form.referenceNo,
      };
      const url = editingId ? `/api/courier-expenses/${editingId}` : '/api/courier-expenses';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Save failed');
      resetForm();
      fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this courier expense entry?')) return;
    try {
      const res = await fetch(`/api/courier-expenses/${id}`, { method: 'DELETE', credentials: 'include' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Delete failed');
      fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const fyLabelNow = useMemo(() => formatFinancialYearLabel(getFinancialYearStartYear(new Date())), []);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  if (!session || !allowed.includes(session.user?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Courier expenses</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Record courier / shipment costs by date, quantity, amount, and canteen (or free-text destination).
              Totals respect filters below (month, FY quarter, FY year, or custom range).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              + New entry
            </button>
            <Link
              href="/dashboard/admin/expenses"
              className="px-4 py-2 bg-white border border-slate-300 text-slate-800 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Daily expenses
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-medium">
              Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
            {error.includes('Failed') || error.includes('table') ? (
              <p className="mt-2 text-xs">
                If the table is missing, run <strong>Database Setup</strong> (admin) or execute{' '}
                <code className="bg-red-100 px-1 rounded">scripts/sql/migrate_courier_expenses.sql</code>
              </p>
            ) : null}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Period & filters</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['this_month', 'This month'],
                ['fy_quarter', 'This FY quarter (Apr–Mar)'],
                ['fy_year', `This FY (${fyLabelNow})`],
                ['fy_prev', 'Last FY (full)'],
                ['custom', 'Custom range'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriodPreset(id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  periodPreset === id
                    ? 'bg-indigo-100 text-indigo-900 ring-2 ring-indigo-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={startDate}
                onChange={(e) => {
                  setPeriodPreset('custom');
                  setStartDate(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={endDate}
                onChange={(e) => {
                  setPeriodPreset('custom');
                  setEndDate(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Canteen</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={filterCanteenId}
                onChange={(e) => setFilterCanteenId(e.target.value)}
              >
                <option value="">All canteens</option>
                {canteens.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.canteenName}
                    {c.city ? ` — ${c.city}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sort by</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Direction</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                >
                  <option value="desc">Newest / high → low</option>
                  <option value="asc">Oldest / low → high</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Total cost (filtered)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              ₹{summary.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Total quantity</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalQuantity.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Entries</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.count}</p>
          </div>
        </div>

        {/* By canteen */}
        {byCanteen.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-800">Totals by canteen (same filters)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-100">
                    <th className="px-4 py-2">Canteen / destination</th>
                    <th className="px-4 py-2 text-right">Entries</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {[...byCanteen]
                    .sort((a, b) => b.totalCost - a.totalCost)
                    .map((b, i) => (
                      <tr key={`${b.canteenAddressId ?? 'null'}-${i}`} className="border-b border-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-800">{b.canteenName}</td>
                        <td className="px-4 py-2 text-right">{b.entryCount}</td>
                        <td className="px-4 py-2 text-right">{b.totalQuantity.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right">
                          ₹{b.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{editingId ? 'Edit entry' : 'New courier expense'}</h2>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Courier date *</label>
                <input
                  type="date"
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={form.courierDate}
                  onChange={(e) => setForm((f) => ({ ...f, courierDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="e.g. parcels, kg, cartons"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost (₹) *</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={form.cost}
                  onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={form.paymentMethod}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                >
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Canteen (optional if you fill destination below)</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={form.canteenAddressId}
                  onChange={(e) => setForm((f) => ({ ...f, canteenAddressId: e.target.value }))}
                >
                  <option value="">— Select canteen —</option>
                  {canteens.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.canteenName} — {c.city || c.address?.slice(0, 40)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Destination / address note</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="Required if no canteen selected"
                  value={form.destinationNote}
                  onChange={(e) => setForm((f) => ({ ...f, destinationNote: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">AWB / reference</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={form.referenceNo}
                  onChange={(e) => setForm((f) => ({ ...f, referenceNo: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">
                  {editingId ? 'Save changes' : 'Create'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">All entries</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Canteen / destination</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Cost</th>
                  <th className="px-3 py-3">Ref</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const dest =
                    r.canteenName ||
                    (r.destinationNote ? r.destinationNote : '—');
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="px-3 py-3 whitespace-nowrap">{r.courierDate}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900">{dest}</div>
                        {r.canteenName && r.canteenCity && (
                          <div className="text-xs text-slate-500">{r.canteenCity}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">{r.quantity.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-3 text-right font-medium">
                        ₹{r.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600 max-w-[120px] truncate" title={r.referenceNo}>
                        {r.referenceNo || '—'}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-2"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(r.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <div className="px-4 py-12 text-center text-slate-500 text-sm">No entries in this period. Click &quot;New entry&quot;.</div>
          )}
        </div>
      </div>
    </div>
  );
}
