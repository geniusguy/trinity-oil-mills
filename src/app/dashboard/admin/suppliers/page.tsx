'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface SupplierRow {
  id: string;
  name: string;
  supplierType: string | null;
  contactNumber: string | null;
  email: string | null;
  thisMonthPaid: number;
  remainingAmountToPay: number;
}

export default function SuppliersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    supplierType: '',
    contactNumber: '',
    email: '',
  });

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

  const loadSuppliers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/suppliers?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load suppliers');
        return;
      }
      setRows((data.suppliers || []).map((r: any) => ({
        ...r,
        thisMonthPaid: Number(r.thisMonthPaid) || 0,
        remainingAmountToPay: Number(r.remainingAmountToPay) || 0,
      })));
    } catch {
      setError('Network error loading suppliers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (['admin', 'accountant', 'retail_staff'].includes(session?.user?.role || '')) {
      loadSuppliers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.role]);

  const resetForm = () => {
    setForm({ name: '', supplierType: '', contactNumber: '', email: '' });
    setEditId(null);
  };

  const totalMonthPaid = useMemo(() => rows.reduce((a, b) => a + (b.thisMonthPaid || 0), 0), [rows]);
  const totalRemaining = useMemo(() => rows.reduce((a, b) => a + (b.remainingAmountToPay || 0), 0), [rows]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

  const saveSupplier = async () => {
    const name = form.name.trim();
    if (!name) {
      setError('Supplier name is required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name,
        supplierType: form.supplierType.trim() || null,
        contactNumber: form.contactNumber.trim() || null,
        email: form.email.trim() || null,
      };
      const res = await fetch(editId ? `/api/suppliers/${editId}` : '/api/suppliers', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save supplier.');
        return;
      }
      setSuccess(editId ? 'Supplier updated.' : 'Supplier added.');
      resetForm();
      await loadSuppliers();
    } catch {
      setError('Network error saving supplier.');
    } finally {
      setSaving(false);
    }
  };

  const removeSupplier = async (row: SupplierRow) => {
    if (!window.confirm(`Delete supplier "${row.name}"?`)) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/suppliers/${row.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete supplier.');
        return;
      }
      setSuccess('Supplier deleted.');
      await loadSuppliers();
    } catch {
      setError('Network error deleting supplier.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Supplier Master</h1>
        <p className="text-sm text-gray-600 mt-1">
          Add supplier details once, then use them in Purchases. Name is mandatory.
        </p>
        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{editId ? 'Edit Supplier' : 'Add Supplier'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            className="px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="px-3 py-2 border border-gray-300 rounded-md"
            placeholder="What is he supplier (type)"
            value={form.supplierType}
            onChange={(e) => setForm((f) => ({ ...f, supplierType: e.target.value }))}
          />
          <input
            className="px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Contact number"
            value={form.contactNumber}
            onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
          />
          <input
            className="px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={saveSupplier}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'Saving...' : editId ? 'Update Supplier' : 'Add Supplier'}
          </button>
          {editId && (
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-end gap-3 md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Suppliers</h2>
            <p className="text-xs text-gray-500 mt-1">This month paid and remaining to pay are auto-calculated.</p>
          </div>
          <div className="flex gap-2">
            <input
              className="px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Search supplier..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button onClick={loadSuppliers} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              Search
            </button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-gray-100 bg-gray-50">
          <div className="rounded-md border border-gray-200 p-3 bg-white">
            <div className="text-xs text-gray-500">This Month Paid (all suppliers)</div>
            <div className="text-lg font-semibold text-gray-900">{formatCurrency(totalMonthPaid)}</div>
          </div>
          <div className="rounded-md border border-gray-200 p-3 bg-white">
            <div className="text-xs text-gray-500">Remaining Amount To Pay (all suppliers)</div>
            <div className="text-lg font-semibold text-gray-900">{formatCurrency(totalRemaining)}</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Supplier Type</th>
                <th className="px-4 py-3 text-left">Contact Number</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-right">This Month Amount</th>
                <th className="px-4 py-3 text-right">Remaining Amount To Pay</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading suppliers...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3">{r.supplierType || '—'}</td>
                    <td className="px-4 py-3">{r.contactNumber || '—'}</td>
                    <td className="px-4 py-3">{r.email || '—'}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(r.thisMonthPaid)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(r.remainingAmountToPay)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          className="text-indigo-600 hover:text-indigo-800"
                          onClick={() => {
                            setEditId(r.id);
                            setForm({
                              name: r.name || '',
                              supplierType: r.supplierType || '',
                              contactNumber: r.contactNumber || '',
                              email: r.email || '',
                            });
                          }}
                        >
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-800" onClick={() => removeSupplier(r)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
