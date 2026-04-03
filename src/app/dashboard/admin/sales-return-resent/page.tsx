'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Product = { id: string; name: string; unit?: string };

type ResentRow = {
  id: string;
  saleType: 'canteen' | 'retail';
  canteenName?: string | null;
  productId: string;
  productName: string;
  unit: string;
  returnedQuantity: number;
  returnDate: string;
  resentQuantity: number;
  resentDate: string;
  reason?: string | null;
  createdAt?: string;
};

export default function SalesReturnResentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [rows, setRows] = useState<ResentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    saleType: 'canteen' as 'canteen' | 'retail',
    canteenName: '',
    productId: '',
    productName: '',
    unit: 'bottles',
    returnedQuantity: '',
    returnDate: new Date().toISOString().slice(0, 10),
    resentQuantity: '',
    resentDate: new Date().toISOString().slice(0, 10),
    reason: '',
  });

  const productOptions = useMemo(() => {
    if (form.productId && !products.some((p) => p.id === form.productId)) {
      return [{ id: form.productId, name: form.productName || form.productId, unit: form.unit }, ...products];
    }
    return products;
  }, [products, form.productId, form.productName, form.unit]);

  const canAccess = useMemo(() => {
    const role = (session as any)?.user?.role || '';
    return ['admin', 'accountant'].includes(role);
  }, [session]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!canAccess) router.push('/dashboard');
  }, [session, status, canAccess, router]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await fetch('/api/products?isActive=true');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load products');
        const list = Array.isArray(data?.products) ? data.products : [];
        setProducts(
          list.map((p: any) => ({
            id: String(p.id),
            name: String(p.name || ''),
            unit: p.unit ? String(p.unit) : undefined,
          })),
        );
      } catch (e) {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  const formatDateOnly = (value?: string | null) => {
    if (!value) return '—';
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s.slice(0, 10);
    return d.toISOString().slice(0, 10);
  };

  const fetchRows = async () => {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams();
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);
      if (search.trim()) qs.set('search', search.trim());

      const res = await fetch(`/api/sales-return-resent?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setRows([]);
        setError(data?.error || 'Failed to load resent records');
        return;
      }
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch {
      setRows([]);
      setError('Network error loading records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, search]);

  const totals = useMemo(() => {
    const totalReturned = rows.reduce((acc, r) => acc + Number(r.returnedQuantity || 0), 0);
    const totalResent = rows.reduce((acc, r) => acc + Number(r.resentQuantity || 0), 0);
    return { totalReturned, totalResent };
  }, [rows]);

  const resetForm = () => {
    setEditingId(null);
    setForm((f) => ({
      ...f,
      saleType: 'canteen',
      canteenName: '',
      productId: '',
      productName: '',
      unit: 'bottles',
      returnedQuantity: '',
      resentQuantity: '',
      reason: '',
      returnDate: new Date().toISOString().slice(0, 10),
      resentDate: new Date().toISOString().slice(0, 10),
    }));
  };

  const startEdit = (r: ResentRow) => {
    setError('');
    setSuccess('');
    setEditingId(r.id);
    setForm({
      saleType: r.saleType,
      canteenName: r.canteenName || '',
      productId: r.productId,
      productName: r.productName,
      unit: r.unit || 'bottles',
      returnedQuantity: String(r.returnedQuantity ?? ''),
      returnDate: formatDateOnly(r.returnDate),
      resentQuantity: String(r.resentQuantity ?? ''),
      resentDate: formatDateOnly(r.resentDate),
      reason: r.reason || '',
    });
  };

  const submit = async () => {
    try {
      setError('');
      setSuccess('');

      const returnedQuantity = Number(form.returnedQuantity);
      const resentQuantity = Number(form.resentQuantity);

      if (!form.productId || !form.productName) {
        setError('Select a product');
        return;
      }
      if (!form.returnDate) {
        setError('Return date is required');
        return;
      }
      if (!form.resentDate) {
        setError('Resent date is required');
        return;
      }
      if (!Number.isFinite(returnedQuantity) || returnedQuantity < 0) {
        setError('Returned quantity must be >= 0');
        return;
      }
      if (!Number.isFinite(resentQuantity) || resentQuantity <= 0) {
        setError('Resent quantity must be > 0');
        return;
      }

      const payload = {
        ...(editingId ? { id: editingId } : {}),
        saleType: form.saleType,
        canteenName: form.canteenName || null,
        productId: form.productId,
        productName: form.productName,
        unit: form.unit,
        returnedQuantity,
        returnDate: form.returnDate,
        resentQuantity,
        resentDate: form.resentDate,
        reason: form.reason || null,
      };

      const res = await fetch('/api/sales-return-resent', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || (editingId ? 'Failed to update record' : 'Failed to create resent record'));
        return;
      }

      setSuccess(
        editingId
          ? 'Record updated. Inventory adjusted (old resent qty restored, new resent qty deducted).'
          : 'Resent record created. Inventory reduced for resent quantity.',
      );
      resetForm();

      await fetchRows();
    } catch {
      setError('Network error while saving record');
    }
  };

  const removeRow = async (id: string) => {
    if (!window.confirm('Delete this resent record? Stock will be increased by the resent quantity that was deducted.')) return;
    try {
      setError('');
      setSuccess('');
      const res = await fetch(`/api/sales-return-resent?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to delete record');
        return;
      }
      setSuccess('Record deleted. Stock restored for resent quantity.');
      if (editingId === id) resetForm();
      await fetchRows();
    } catch {
      setError('Network error while deleting');
    }
  };

  if (status === 'loading' || loadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Resent Fresh Bottles (Expired Returns)</h1>
            <p className="text-gray-600 mt-1">Record returned items disposed + replacement sent. Stock reduces for resent quantity.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/sales-returns"
              className="w-full sm:w-auto text-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Sales Returns
            </Link>
          </div>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">{success}</div>}

        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {editingId ? 'Edit Resent Record' : 'Add Resent Record'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              className="px-3 py-2 border rounded"
              value={form.saleType}
              onChange={(e) => setForm((f) => ({ ...f, saleType: e.target.value as 'canteen' | 'retail' }))}
            >
              <option value="canteen">Canteen</option>
              <option value="retail">Retail</option>
            </select>

            <input
              className="px-3 py-2 border rounded"
              placeholder="Canteen name (optional)"
              value={form.canteenName}
              onChange={(e) => setForm((f) => ({ ...f, canteenName: e.target.value }))}
            />

            <div className="md:col-span-2 lg:col-span-2">
              <select
                className="px-3 py-2 border rounded w-full"
                value={form.productId}
                onChange={(e) => {
                  const selected = productOptions.find((p) => p.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    productId: e.target.value,
                    productName: selected?.name || '',
                    unit: selected?.unit || f.unit,
                  }));
                }}
              >
                <option value="">Select Product</option>
                {productOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <input
                type="number"
                step="0.01"
                className="px-3 py-2 border rounded w-full"
                placeholder={`Returned qty (unit: ${form.unit})`}
                value={form.returnedQuantity}
                onChange={(e) => setForm((f) => ({ ...f, returnedQuantity: e.target.value }))}
              />
            </div>

            <div>
              <input
                type="date"
                className="px-3 py-2 border rounded w-full"
                value={form.returnDate}
                onChange={(e) => setForm((f) => ({ ...f, returnDate: e.target.value }))}
              />
            </div>

            <div>
              <input
                type="number"
                step="0.01"
                className="px-3 py-2 border rounded w-full"
                placeholder={`Resent qty (unit: ${form.unit}) *`}
                value={form.resentQuantity}
                onChange={(e) => setForm((f) => ({ ...f, resentQuantity: e.target.value }))}
              />
            </div>

            <div>
              <input
                type="date"
                className="px-3 py-2 border rounded w-full"
                value={form.resentDate}
                onChange={(e) => setForm((f) => ({ ...f, resentDate: e.target.value }))}
              />
            </div>

            <input
              className="px-3 py-2 border rounded md:col-span-2 lg:col-span-4"
              placeholder="Reason / note (optional)"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-700">
              Totals (current filter): Returned <span className="font-semibold">{totals.totalReturned.toFixed(2)}</span>, Resent{' '}
              <span className="font-semibold">{totals.totalResent.toFixed(2)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={submit}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {editingId ? 'Update Record + Adjust Stock' : 'Create Record + Deduct Stock'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap gap-3 w-full">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-gray-600 mb-1">From Date</label>
                <input type="date" className="px-3 py-2 border rounded w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-gray-600 mb-1">To Date</label>
                <input type="date" className="px-3 py-2 border rounded w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs text-gray-600 mb-1">Search</label>
                <input
                  type="text"
                  className="px-3 py-2 border rounded w-full"
                  placeholder="Product or reason"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Returned Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Resent Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Resent Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sale Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{r.productName}</div>
                        <div className="text-xs text-gray-500">{r.unit}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{formatDateOnly(r.returnDate)}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {Number(r.returnedQuantity || 0).toFixed(2)} {r.unit}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{formatDateOnly(r.resentDate)}</td>
                      <td className="px-3 py-2 text-gray-700 font-semibold">
                        {Number(r.resentQuantity || 0).toFixed(2)} {r.unit}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{r.saleType}{r.canteenName ? ` · ${r.canteenName}` : ''}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[14rem] truncate" title={r.reason || ''}>
                        {r.reason || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium text-xs mr-3"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          className="text-red-600 hover:text-red-900 font-medium text-xs"
                        >
                          Delete
                        </button>
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

