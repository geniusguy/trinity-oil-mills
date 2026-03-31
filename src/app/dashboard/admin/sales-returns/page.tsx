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
    returnNature: 'expiry' as 'sales_return' | 'expiry',
    accountingImpact: 'revenue_reversal' as 'revenue_reversal' | 'expense_writeoff' | 'both',
    reason: '',
    returnDate: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);

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

  const submitReturn = async () => {
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const res = await fetch('/api/sales-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: form.saleId || null,
          saleType: form.saleType,
          canteenName: form.canteenName || null,
          productName: form.productName,
          unit: form.unit,
          quantity: Number(form.quantity || 0),
          unitPriceExGst: Number(form.unitPriceExGst || 0),
          gstRate: Number(form.gstRate || 0),
          returnNature: form.returnNature,
          accountingImpact: form.accountingImpact,
          reason: form.reason || null,
          returnDate: form.returnDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create return entry');
        return;
      }

      setSuccess('Return entry created. P&L will include this in selected period.');
      setForm((prev) => ({
        ...prev,
        productName: '',
        quantity: '',
        unitPriceExGst: '',
        reason: '',
      }));
      await load();
    } catch {
      setError('Network error while creating return');
    } finally {
      setSubmitting(false);
    }
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
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Add Return Entry</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <input className="px-3 py-2 border rounded" placeholder="Sale ID (optional)" value={form.saleId} onChange={(e) => setForm({ ...form, saleId: e.target.value })} />
            <select className="px-3 py-2 border rounded" value={form.saleType} onChange={(e) => setForm({ ...form, saleType: e.target.value as 'canteen' | 'retail' })}>
              <option value="canteen">Canteen</option>
              <option value="retail">Retail</option>
            </select>
            <input className="px-3 py-2 border rounded" placeholder="Canteen name (optional)" value={form.canteenName} onChange={(e) => setForm({ ...form, canteenName: e.target.value })} />
            <input className="px-3 py-2 border rounded" placeholder="Product name *" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />

            <input className="px-3 py-2 border rounded" placeholder="Unit (e.g. bottles)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <input className="px-3 py-2 border rounded" type="number" step="0.01" placeholder="Quantity *" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <input className="px-3 py-2 border rounded" type="number" step="0.01" placeholder="Unit Price ex GST *" value={form.unitPriceExGst} onChange={(e) => setForm({ ...form, unitPriceExGst: e.target.value })} />
            <input className="px-3 py-2 border rounded" type="number" step="0.01" placeholder="GST % *" value={form.gstRate} onChange={(e) => setForm({ ...form, gstRate: e.target.value })} />

            <select className="px-3 py-2 border rounded" value={form.returnNature} onChange={(e) => setForm({ ...form, returnNature: e.target.value as 'sales_return' | 'expiry' })}>
              <option value="sales_return">Sales Return</option>
              <option value="expiry">Expiry</option>
            </select>
            <select className="px-3 py-2 border rounded" value={form.accountingImpact} onChange={(e) => setForm({ ...form, accountingImpact: e.target.value as 'revenue_reversal' | 'expense_writeoff' | 'both' })}>
              <option value="revenue_reversal">Revenue reversal</option>
              <option value="expense_writeoff">Expense write-off</option>
              <option value="both">Both</option>
            </select>
            <input className="px-3 py-2 border rounded" type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
            <input className="px-3 py-2 border rounded md:col-span-3 lg:col-span-2" placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="mt-3">
            <button
              onClick={submitReturn}
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Create Return Entry'}
            </button>
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ex GST</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nature</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Impact</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-sm text-gray-500">No entries found.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">{r.returnDate}</td>
                  <td className="px-3 py-2 text-sm">
                    <div className="font-medium text-gray-900">{r.productName}</div>
                    <div className="text-xs text-gray-500">{r.canteenName || r.saleType}</div>
                  </td>
                  <td className="px-3 py-2 text-sm">{r.quantity} {r.unit}</td>
                  <td className="px-3 py-2 text-sm">₹{Number(r.returnAmountExGst || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm">₹{Number(r.returnGstAmount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm font-semibold">₹{Number(r.returnTotalAmount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-sm">{r.returnNature}</td>
                  <td className="px-3 py-2 text-sm">{r.accountingImpact}</td>
                  <td className="px-3 py-2 text-sm">
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
