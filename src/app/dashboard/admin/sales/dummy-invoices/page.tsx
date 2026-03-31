'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type Reservation = {
  id: string;
  invoiceNumber: string;
  saleType: string;
  fyLabel?: string | null;
  status: string;
  reason?: string | null;
  linkedSaleId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function DummyInvoicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInvoice, setEditInvoice] = useState('');
  const [editReason, setEditReason] = useState('');

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

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      const res = await fetch(`/api/invoice-reservations?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load reservations');
        setRows([]);
        return;
      }
      setRows(Array.isArray(data.reservations) ? data.reservations : []);
    } catch {
      setError('Network error. Please try again.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, statusFilter]);

  const startEdit = (r: Reservation) => {
    setEditingId(r.id);
    setEditInvoice(r.invoiceNumber || '');
    setEditReason(r.reason || '');
    setError('');
    setSuccess('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      setError('');
      setSuccess('');
      const res = await fetch('/api/invoice-reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          invoiceNumber: editInvoice.trim(),
          reason: editReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update reservation');
        return;
      }
      setSuccess('Reservation updated');
      setEditingId(null);
      load();
    } catch {
      setError('Network error. Please try again.');
    }
  };

  const doAction = async (id: string, saleType: string, action: 'cancel' | 'delete') => {
    try {
      setError('');
      setSuccess('');
      const res = await fetch(
        `/api/invoice-reservations?id=${encodeURIComponent(id)}&saleType=${encodeURIComponent(saleType)}&action=${action}`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to ${action} reservation`);
        return;
      }
      setSuccess(action === 'cancel' ? 'Reservation cancelled' : 'Reservation deleted');
      load();
    } catch {
      setError('Network error. Please try again.');
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reserved Dummy Invoices</h1>
            <p className="text-gray-600 mt-1">View, edit, cancel, or delete reserved invoice placeholders</p>
          </div>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-md text-sm">{success}</div>}

        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All</option>
            <option value="reserved">Reserved</option>
            <option value="used">Used</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FY</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">No reservations found.</td>
                </tr>
              ) : rows.map((r) => {
                const isEditing = editingId === r.id;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <input
                          value={editInvoice}
                          onChange={(e) => setEditInvoice(e.target.value)}
                          className="px-2 py-1 border rounded w-52"
                        />
                      ) : (
                        <span className="font-medium text-indigo-700">{r.invoiceNumber}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{r.saleType}</td>
                    <td className="px-4 py-3 text-sm">{r.fyLabel || '—'}</td>
                    <td className="px-4 py-3 text-sm">{r.status}</td>
                    <td className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <input
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          className="px-2 py-1 border rounded w-64"
                        />
                      ) : (
                        <span>{r.reason || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-3">
                        {r.status === 'reserved' && !isEditing && (
                          <>
                            <button className="text-blue-600 hover:text-blue-900" onClick={() => startEdit(r)}>Edit</button>
                            <button className="text-amber-700 hover:text-amber-900" onClick={() => doAction(r.id, r.saleType, 'cancel')}>Cancel</button>
                            <button className="text-red-600 hover:text-red-900" onClick={() => doAction(r.id, r.saleType, 'delete')}>Delete</button>
                          </>
                        )}
                        {isEditing && (
                          <>
                            <button className="text-green-700 hover:text-green-900" onClick={saveEdit}>Save</button>
                            <button className="text-gray-700 hover:text-gray-900" onClick={() => setEditingId(null)}>Close</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

