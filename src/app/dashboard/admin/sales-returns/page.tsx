'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type SalesReturnRow = {
  id: string;
  saleId?: string | null;
  saleType: 'canteen' | 'retail';
  canteenName?: string | null;
  productName: string;
  unit: string;
  quantity: number;
  unitPriceExGst: number;
  gstRate: number;
  returnAmountExGst: number;
  returnGstAmount: number;
  otherExpenses?: number;
  returnTotalAmount: number;
  returnNature: 'sales_return' | 'expiry';
  accountingImpact: 'revenue_reversal' | 'expense_writeoff' | 'both';
  reason?: string | null;
  returnDate: string;
};

export default function SalesReturnsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rows, setRows] = useState<SalesReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [form, setForm] = useState({
    saleId: '',
    saleType: 'canteen' as 'canteen' | 'retail',
    canteenName: '',
    productName: '',
    unit: 'bottles',
    quantity: '',
    unitPriceExGst: '',
    gstRate: '5',
    otherExpenses: '',
    returnNature: 'expiry' as 'sales_return' | 'expiry',
    accountingImpact: 'revenue_reversal' as 'revenue_reversal' | 'expense_writeoff' | 'both',
    reason: '',
    returnDate: new Date().toISOString().slice(0, 10),
  });
  const [products, setProducts] = useState<Array<{ id: string; name: string; unit?: string; basePrice?: number; gstRate?: number }>>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'product' | 'qty' | 'total' | 'nature'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const formatDateOnly = (value?: string | null) => {
    if (!value) return '—';
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s.slice(0, 10);
    return d.toISOString().slice(0, 10);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams();
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);
      const res = await fetch(`/api/sales-returns?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setRows([]);
        setError(data.error || 'Failed to load sales returns');
        return;
      }
      setRows(Array.isArray(data.returns) ? data.returns : []);
    } catch {
      setRows([]);
      setError('Network error while loading returns');
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, startDate, endDate]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch('/api/products?isActive=true');
        const data = await res.json();
        const list = Array.isArray(data?.products) ? data.products : [];
        setProducts(
          list.map((p: any) => ({
            id: String(p.id),
            name: String(p.name || ''),
            unit: p.unit ? String(p.unit) : undefined,
            basePrice: Number(p.basePrice || 0),
            gstRate: Number(p.gstRate || 0),
          })),
        );
      } catch {
        setProducts([]);
      }
    };
    loadProducts();
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.exGst += Number(r.returnAmountExGst || 0);
        acc.gst += Number(r.returnGstAmount || 0);
        acc.total += Number(r.returnTotalAmount || 0);
        return acc;
      },
      { exGst: 0, gst: 0, total: 0 },
    );
  }, [rows]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortBy === 'product') {
        return a.productName.localeCompare(b.productName, undefined, { sensitivity: 'base' }) * dir;
      }
      if (sortBy === 'qty') {
        return (Number(a.quantity || 0) - Number(b.quantity || 0)) * dir;
      }
      if (sortBy === 'total') {
        return (Number(a.returnTotalAmount || 0) - Number(b.returnTotalAmount || 0)) * dir;
      }
      if (sortBy === 'nature') {
        return a.returnNature.localeCompare(b.returnNature, undefined, { sensitivity: 'base' }) * dir;
      }
      const at = new Date(a.returnDate).getTime();
      const bt = new Date(b.returnDate).getTime();
      return (at - bt) * dir;
    });
  }, [rows, sortBy, sortDir]);

  const toggleSort = (field: 'date' | 'product' | 'qty' | 'total' | 'nature') => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDir(field === 'product' || field === 'nature' ? 'asc' : 'desc');
  };

  const calc = useMemo(() => {
    const qty = Number(form.quantity || 0);
    const unitPrice = Number(form.unitPriceExGst || 0);
    const rate = Number(form.gstRate || 0);
    const other = Number(form.otherExpenses || 0);
    const ex = Number((qty * unitPrice).toFixed(2));
    const gst = Number(((ex * rate) / 100).toFixed(2));
    const total = Number((ex + gst + other).toFixed(2));
    return { ex, gst, total };
  }, [form.quantity, form.unitPriceExGst, form.gstRate, form.otherExpenses]);

  const sortedProducts = useMemo(() => {
    const rank = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('tom') && (n.includes('castor') || n.includes('castrol'))) return 0;
      return 1;
    };
    return [...products].sort((a, b) => {
      const ra = rank(a.name);
      const rb = rank(b.name);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  }, [products]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.productName.trim()) errs.productName = 'Product is required';
    if (!form.returnDate) errs.returnDate = 'Return date is required';
    if (!Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0) errs.quantity = 'Quantity must be greater than 0';
    if (!Number.isFinite(Number(form.unitPriceExGst)) || Number(form.unitPriceExGst) < 0) errs.unitPriceExGst = 'Unit price must be 0 or greater';
    if (!Number.isFinite(Number(form.gstRate)) || Number(form.gstRate) < 0) errs.gstRate = 'GST % must be 0 or greater';
    if (!Number.isFinite(Number(form.otherExpenses || 0)) || Number(form.otherExpenses || 0) < 0) errs.otherExpenses = 'Other expenses must be 0 or greater';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitReturn = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      if (!validateForm()) {
        setError('Please fix the highlighted form errors');
        return;
      }
      const isEdit = !!editingId;
      const res = await fetch('/api/sales-returns', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingId } : {}),
          saleId: form.saleId || null,
          saleType: form.saleType,
          canteenName: form.canteenName || null,
          productName: form.productName,
          unit: form.unit,
          quantity: Number(form.quantity || 0),
          unitPriceExGst: Number(form.unitPriceExGst || 0),
          gstRate: Number(form.gstRate || 0),
          otherExpenses: Number(form.otherExpenses || 0),
          returnNature: form.returnNature,
          accountingImpact: form.accountingImpact,
          reason: form.reason || null,
          returnDate: form.returnDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (isEdit ? 'Failed to update return entry' : 'Failed to create return entry'));
        return;
      }

      setSuccess(isEdit ? 'Return entry updated' : 'Return entry created. P&L will include this in selected period.');
      setEditingId(null);
      setForm({
        saleId: '',
        saleType: 'canteen',
        canteenName: '',
        productName: '',
        unit: 'bottles',
        quantity: '',
        unitPriceExGst: '',
        gstRate: '5',
        otherExpenses: '',
        returnNature: 'expiry',
        accountingImpact: 'revenue_reversal',
        reason: '',
        returnDate: new Date().toISOString().slice(0, 10),
      });
      await load();
    } catch {
      setError(editingId ? 'Network error while updating return' : 'Network error while creating return');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (r: SalesReturnRow) => {
    setError('');
    setSuccess('');
    setFieldErrors({});
    setEditingId(r.id);
    setForm({
      saleId: r.saleId || '',
      saleType: r.saleType,
      canteenName: r.canteenName || '',
      productName: r.productName || '',
      unit: r.unit || 'bottles',
      quantity: String(r.quantity ?? ''),
      unitPriceExGst: String(r.unitPriceExGst ?? ''),
      gstRate: String(r.gstRate ?? '5'),
      otherExpenses: String(r.otherExpenses ?? ''),
      returnNature: r.returnNature,
      accountingImpact: r.accountingImpact,
      reason: r.reason || '',
      returnDate: r.returnDate || new Date().toISOString().slice(0, 10),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFieldErrors({});
    setForm({
      saleId: '',
      saleType: 'canteen',
      canteenName: '',
      productName: '',
      unit: 'bottles',
      quantity: '',
      unitPriceExGst: '',
      gstRate: '5',
      otherExpenses: '',
      returnNature: 'expiry',
      accountingImpact: 'revenue_reversal',
      reason: '',
      returnDate: new Date().toISOString().slice(0, 10),
    });
  };

  const removeRow = async (id: string) => {
    if (!window.confirm('Delete this return entry?')) return;
    try {
      setError('');
      setSuccess('');
      const res = await fetch(`/api/sales-returns?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete return entry');
        return;
      }
      setSuccess('Return entry deleted');
      await load();
    } catch {
      setError('Network error while deleting return');
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-lg">Loading...</div></div>;
  }

  if (!session || !['admin', 'accountant'].includes(session.user?.role || '')) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-lg">Access Denied</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Sales Returns / Expiry Write-off</h1>
          <p className="text-gray-600 mt-1">Record returned or expired items to adjust P&L correctly.</p>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-md text-sm">{success}</div>}

        <div className="bg-white shadow rounded-lg p-4 mb-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{editingId ? 'Edit Return Entry' : 'Add Return Entry'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <input className="px-3 py-2 border rounded" placeholder="Sale ID (optional)" value={form.saleId} onChange={(e) => setForm({ ...form, saleId: e.target.value })} />
            <select className="px-3 py-2 border rounded" value={form.saleType} onChange={(e) => setForm({ ...form, saleType: e.target.value as 'canteen' | 'retail' })}>
              <option value="canteen">Canteen</option>
              <option value="retail">Retail</option>
            </select>
            <input className="px-3 py-2 border rounded" placeholder="Canteen name (optional)" value={form.canteenName} onChange={(e) => setForm({ ...form, canteenName: e.target.value })} />
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-600">Product Name *</label>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  TOM Castrol/Castor pinned on top
                </span>
              </div>
              <select
                className={`px-3 py-2 border rounded w-full ${fieldErrors.productName ? 'border-red-400' : ''}`}
                value={form.productName}
                onChange={(e) => {
                  const selected = sortedProducts.find((p) => p.name === e.target.value);
                  setForm({
                    ...form,
                    productName: e.target.value,
                    unit: selected?.unit || form.unit,
                    unitPriceExGst: selected?.basePrice != null && selected.basePrice > 0 ? String(selected.basePrice) : form.unitPriceExGst,
                    gstRate: selected?.gstRate != null && selected.gstRate >= 0 ? String(selected.gstRate) : form.gstRate,
                  });
                  setFieldErrors((prev) => ({ ...prev, productName: '' }));
                }}
              >
                <option value="">Select Product *</option>
                {sortedProducts.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              {fieldErrors.productName && <div className="text-xs text-red-600 mt-1">{fieldErrors.productName}</div>}
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 flex flex-col justify-center">
              <div className="text-xs text-green-700 font-medium">Total Amount</div>
              <div className="text-xl font-bold text-green-900">₹{calc.total.toFixed(2)}</div>
              <div className="text-[11px] text-green-700">Ex GST + GST + Other Expenses</div>
            </div>

            <input className="px-3 py-2 border rounded" placeholder="Unit (e.g. bottles)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <div>
              <input className={`px-3 py-2 border rounded w-full ${fieldErrors.quantity ? 'border-red-400' : ''}`} type="number" step="0.01" placeholder="Quantity *" value={form.quantity} onChange={(e) => { setForm({ ...form, quantity: e.target.value }); setFieldErrors((prev) => ({ ...prev, quantity: '' })); }} />
              {fieldErrors.quantity && <div className="text-xs text-red-600 mt-1">{fieldErrors.quantity}</div>}
            </div>
            <div>
              <input className={`px-3 py-2 border rounded w-full ${fieldErrors.unitPriceExGst ? 'border-red-400' : ''}`} type="number" step="0.01" placeholder="Unit Price ex GST *" value={form.unitPriceExGst} onChange={(e) => { setForm({ ...form, unitPriceExGst: e.target.value }); setFieldErrors((prev) => ({ ...prev, unitPriceExGst: '' })); }} />
              {fieldErrors.unitPriceExGst && <div className="text-xs text-red-600 mt-1">{fieldErrors.unitPriceExGst}</div>}
            </div>
            <div>
              <input className={`px-3 py-2 border rounded w-full ${fieldErrors.gstRate ? 'border-red-400' : ''}`} type="number" step="0.01" placeholder="GST % *" value={form.gstRate} onChange={(e) => { setForm({ ...form, gstRate: e.target.value }); setFieldErrors((prev) => ({ ...prev, gstRate: '' })); }} />
              {fieldErrors.gstRate && <div className="text-xs text-red-600 mt-1">{fieldErrors.gstRate}</div>}
            </div>
            <div>
              <input className={`px-3 py-2 border rounded w-full ${fieldErrors.otherExpenses ? 'border-red-400' : ''}`} type="number" step="0.01" placeholder="Other Expenses (Courier)" value={form.otherExpenses} onChange={(e) => { setForm({ ...form, otherExpenses: e.target.value }); setFieldErrors((prev) => ({ ...prev, otherExpenses: '' })); }} />
              {fieldErrors.otherExpenses && <div className="text-xs text-red-600 mt-1">{fieldErrors.otherExpenses}</div>}
            </div>

            <select className="px-3 py-2 border rounded" value={form.returnNature} onChange={(e) => setForm({ ...form, returnNature: e.target.value as 'sales_return' | 'expiry' })}>
              <option value="sales_return">Sales Return</option>
              <option value="expiry">Expiry</option>
            </select>
            <select className="px-3 py-2 border rounded" value={form.accountingImpact} onChange={(e) => setForm({ ...form, accountingImpact: e.target.value as 'revenue_reversal' | 'expense_writeoff' | 'both' })}>
              <option value="revenue_reversal">Revenue reversal</option>
              <option value="expense_writeoff">Expense write-off</option>
              <option value="both">Both</option>
            </select>
            <div>
              <input className={`px-3 py-2 border rounded w-full ${fieldErrors.returnDate ? 'border-red-400' : ''}`} type="date" value={form.returnDate} onChange={(e) => { setForm({ ...form, returnDate: e.target.value }); setFieldErrors((prev) => ({ ...prev, returnDate: '' })); }} />
              {fieldErrors.returnDate && <div className="text-xs text-red-600 mt-1">{fieldErrors.returnDate}</div>}
            </div>
            <input className="px-3 py-2 border rounded md:col-span-3 lg:col-span-2" placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="mt-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
            Calculated: Ex GST <span className="font-semibold">₹{calc.ex.toFixed(2)}</span>, GST <span className="font-semibold">₹{calc.gst.toFixed(2)}</span>, Other Expenses <span className="font-semibold">₹{Number(form.otherExpenses || 0).toFixed(2)}</span>, Total <span className="font-semibold">₹{calc.total.toFixed(2)}</span>
          </div>
          <div className="mt-3">
            <button
              onClick={submitReturn}
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? 'Saving...' : editingId ? 'Update Return Entry' : 'Create Return Entry'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="ml-2 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">From Date</label>
              <input type="date" className="px-3 py-2 border rounded w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">To Date</label>
              <input type="date" className="px-3 py-2 border rounded w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-700">
            Totals: Ex GST <span className="font-semibold">₹{totals.exGst.toFixed(2)}</span>, GST <span className="font-semibold">₹{totals.gst.toFixed(2)}</span>, Total <span className="font-semibold">₹{totals.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <div className="px-3 py-2 border-b bg-gray-50 text-xs text-gray-600">
            Sort: <span className="font-medium">{sortBy}</span> ({sortDir})
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  <button onClick={() => toggleSort('date')} className="hover:text-gray-800">Date {sortBy === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  <button onClick={() => toggleSort('product')} className="hover:text-gray-800">Product {sortBy === 'product' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  <button onClick={() => toggleSort('qty')} className="hover:text-gray-800">Qty {sortBy === 'qty' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ex GST</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Other Exp.</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  <button onClick={() => toggleSort('total')} className="hover:text-gray-800">Total {sortBy === 'total' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  <button onClick={() => toggleSort('nature')} className="hover:text-gray-800">Nature {sortBy === 'nature' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Impact</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-sm text-gray-500">No entries found.</td></tr>
              ) : sortedRows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">{formatDateOnly(r.returnDate)}</td>
                  <td className="px-3 py-2 text-sm">
                    <div className="font-medium text-gray-900">{r.productName}</div>
                    <div className="text-xs text-gray-500">{r.canteenName || r.saleType}</div>
                  </td>
                  <td className="px-3 py-2 text-sm">{r.quantity} {r.unit}</td>
                  <td className="px-3 py-2 text-sm">₹{Number(r.returnAmountExGst || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm">₹{Number(r.returnGstAmount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm">₹{Number(r.otherExpenses || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm font-semibold">₹{Number(r.returnTotalAmount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm">{r.returnNature}</td>
                  <td className="px-3 py-2 text-sm">{r.accountingImpact}</td>
                  <td className="px-3 py-2 text-sm">
                    <button onClick={() => startEdit(r)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                    <button onClick={() => removeRow(r.id)} className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
